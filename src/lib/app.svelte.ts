import { COUNTRIES, type Country } from '../data/countries';
import * as store from './db';
import { dayKey, streaks } from './dates';
import { applyFilter, K_START, nextK, pickRound, recordGuess } from './select';
import { playCorrect, playWrong } from './sound';
import { buildExport, exportFileName, parseImport, type ImportedPlayer } from './transfer';
import {
  DEFAULT_FILTER,
  OPTION_COUNT,
  type CountryFilter,
  type Difficulty,
  type GameId,
  type ItemStats,
  type Theme,
  type User,
  type UserFlag,
} from './types';

export type Phase = 'loading' | 'pickUser' | 'pickGame' | 'playing';
export type EditorMode = 'new' | 'edit';
export type AnswerResult = 'correct' | 'wrong' | null;

export interface Round {
  id: number;
  target: Country;
  options: Country[];
  /** Codes of wrongly chosen options, in order. */
  wrong: string[];
  solved: boolean;
}

/** Delay between a correct answer and the next round. */
export const NEXT_ROUND_DELAY_MS = 1000;
/** Maximum number of recent targets that are not repeated. */
const RECENT_SIZE = 15;
const KNOWN_CODES = new Set(COUNTRIES.map((c) => c.code));

export function systemTheme(): Theme {
  return typeof matchMedia !== 'undefined' && matchMedia('(prefers-color-scheme: dark)').matches
    ? 'dark'
    : 'light';
}

/** Fills in fields added in later versions of the app. */
function withDefaults(user: User): User {
  return { ...user, filter: user.filter ?? structuredClone(DEFAULT_FILTER) };
}

class AppState {
  phase = $state<Phase>('loading');
  users = $state<User[]>([]);
  user = $state<User | null>(null);
  game = $state<GameId>('flag');
  round = $state<Round | null>(null);
  playDays = $state<string[]>([]);
  editor = $state<EditorMode | null>(null);
  menuOpen = $state(false);
  statsOpen = $state(false);
  filterOpen = $state(false);

  dayStreak = $derived(streaks(this.playDays));
  /** Countries that can be asked, according to the player's filter. */
  pool = $derived(applyFilter(COUNTRIES, this.user?.filter ?? DEFAULT_FILTER));

  #db: store.DB | null = null;
  #stats: Record<GameId, Map<string, ItemStats>> = { flag: new Map(), country: new Map() };
  #recent: string[] = [];
  #mistakes = 0;
  #roundSeq = 0;

  async init(): Promise<void> {
    try {
      this.#db = await store.openDatabase();
      this.users = (await store.listUsers(this.#db)).map(withDefaults);
    } catch (err) {
      // e.g. storage disabled: the app still works, but nothing is saved.
      console.warn('IndexedDB unavailable; progress will not be saved.', err);
      this.#db = null;
    }
    this.phase = 'pickUser';
    if (this.users.length === 0) this.editor = 'new';
  }

  // ---------------------------------------------------------------- users

  async chooseUser(user: User): Promise<void> {
    this.user = { ...withDefaults(user), lastActiveAt: Date.now() };
    applyTheme(this.user.theme);
    this.#recent = [];
    if (this.#db && this.user.id !== undefined) {
      const id = this.user.id;
      const [days, flag, country] = await Promise.all([
        store.getPlayDays(this.#db, id),
        store.getStats(this.#db, id, 'flag'),
        store.getStats(this.#db, id, 'country'),
      ]);
      this.playDays = days;
      this.#stats = { flag, country };
    } else {
      this.playDays = [];
      this.#stats = { flag: new Map(), country: new Map() };
    }
    await this.#saveUser();
    this.editor = null;
    this.phase = 'pickGame';
  }

  async createUser(name: string, flag: UserFlag): Promise<void> {
    const now = Date.now();
    const user: User = {
      name,
      flag,
      difficulty: 'easy',
      theme: currentTheme(),
      adapt: { flag: K_START, country: K_START },
      perfectRun: 0,
      bestPerfectRun: 0,
      filter: structuredClone(DEFAULT_FILTER),
      createdAt: now,
      lastActiveAt: now,
    };
    const saved = this.#db ? await store.saveUser(this.#db, user) : { ...user, id: -now };
    this.users = [saved, ...this.users];
    await this.chooseUser(saved);
  }

  async updateUser(name: string, flag: UserFlag): Promise<void> {
    if (!this.user) return;
    this.user.name = name;
    this.user.flag = flag;
    this.editor = null;
    await this.#saveUser();
  }

  switchUser(): void {
    this.menuOpen = false;
    this.round = null;
    this.user = null;
    this.phase = 'pickUser';
  }

  setDifficulty(d: Difficulty): void {
    if (!this.user || this.user.difficulty === d) return;
    this.user.difficulty = d;
    void this.#saveUser();
    if (this.phase === 'playing') this.newRound();
  }

  setFilter(filter: CountryFilter): void {
    if (!this.user) return;
    this.user.filter = filter;
    this.#recent = [];
    void this.#saveUser();
    if (this.phase === 'playing') this.newRound();
  }

  toggleTheme(): void {
    if (!this.user) return;
    this.user.theme = this.user.theme === 'dark' ? 'light' : 'dark';
    applyTheme(this.user.theme);
    void this.#saveUser();
  }

  async #saveUser(): Promise<void> {
    if (!this.user) return;
    const snapshot = $state.snapshot(this.user) as User;
    if (this.#db) await store.saveUser(this.#db, snapshot);
    this.users = this.users.map((u) => (u.id === snapshot.id ? snapshot : u));
  }

  // ------------------------------------------------------- export / import

  /** Downloads the current player's data as a JSON file. */
  exportUser(): void {
    if (!this.user) return;
    const data = buildExport($state.snapshot(this.user) as User, this.#stats, this.playDays);
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = exportFileName(this.user.name);
    document.body.append(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  /** Creates a new player from an exported JSON file. Throws ImportError on invalid files. */
  async importUser(text: string): Promise<User> {
    const imported: ImportedPlayer = parseImport(text, KNOWN_CODES);
    const user = this.#db
      ? await store.insertUserWithData(this.#db, imported.user, imported.stats, imported.playDays)
      : { ...imported.user, id: -Date.now() };
    this.users = [user, ...this.users];
    return user;
  }

  // ---------------------------------------------------------------- games

  startGame(game: GameId): void {
    this.game = game;
    this.menuOpen = false;
    this.#recent = [];
    this.phase = 'playing';
    this.newRound();
  }

  /** Shows the game picker; the current round is kept so the picker can be dismissed. */
  changeGame(): void {
    this.menuOpen = false;
    this.phase = 'pickGame';
  }

  newRound(): void {
    if (!this.user) return;
    const pool = this.pool;
    const { target, options } = pickRound(
      pool,
      this.#stats[this.game],
      this.user.adapt[this.game],
      OPTION_COUNT[this.user.difficulty],
      this.#recent,
      Math.random,
      COUNTRIES,
    );
    // With few countries in the pool, fewer recent targets are excluded.
    const recentSize = Math.min(RECENT_SIZE, Math.floor(pool.length / 2));
    this.#recent = recentSize > 0 ? [...this.#recent, target.code].slice(-recentSize) : [];
    this.#mistakes = 0;
    this.round = { id: ++this.#roundSeq, target, options, wrong: [], solved: false };
  }

  /** Handles the selection of an option in the current round. */
  answer(code: string): AnswerResult {
    const round = this.round;
    const user = this.user;
    if (!round || !user || round.solved || round.wrong.includes(code)) return null;
    this.#markPlayedToday();
    const game = this.game;

    if (code === round.target.code) {
      round.solved = true;
      playCorrect();
      if (this.#mistakes === 0) {
        void this.#record(game, code, false);
        user.perfectRun++;
        user.bestPerfectRun = Math.max(user.bestPerfectRun, user.perfectRun);
      }
      user.adapt[game] = nextK(user.adapt[game], this.#mistakes);
      void this.#saveUser();
      const id = round.id;
      setTimeout(() => {
        if (this.round?.id === id && this.phase === 'playing') this.newRound();
      }, NEXT_ROUND_DELAY_MS);
      return 'correct';
    }

    round.wrong.push(code);
    playWrong();
    // The wrongly chosen item was not recognised either.
    void this.#record(game, code, true);
    if (this.#mistakes === 0) {
      // The target counts as missed once per round.
      void this.#record(game, round.target.code, true);
      user.perfectRun = 0;
      void this.#saveUser();
    }
    this.#mistakes++;
    return 'wrong';
  }

  async #record(game: GameId, code: string, incorrect: boolean): Promise<void> {
    const map = this.#stats[game];
    const next = recordGuess(map.get(code), incorrect);
    map.set(code, next);
    if (this.#db && this.user?.id !== undefined) {
      await store.putStat(this.#db, { userId: this.user.id, game, code, ...next });
    }
  }

  #markPlayedToday(): void {
    const today = dayKey();
    if (this.playDays.includes(today) || !this.user) return;
    this.playDays = [...this.playDays, today];
    if (this.#db && this.user.id !== undefined) void store.addPlayDay(this.#db, this.user.id, today);
  }

  /** Stats of the current user for a game. */
  statsFor(game: GameId): ReadonlyMap<string, ItemStats> {
    return this.#stats[game];
  }
}

function currentTheme(): Theme {
  const t = document.documentElement.dataset.theme;
  return t === 'dark' || t === 'light' ? t : systemTheme();
}

export function applyTheme(theme: Theme): void {
  document.documentElement.dataset.theme = theme;
  document
    .querySelector('meta[name="theme-color"]')
    ?.setAttribute('content', theme === 'dark' ? '#121212' : '#FFFFFF');
}

/** Shares the app with the system share sheet, or copies its link. Returns what happened. */
export async function shareApp(): Promise<'shared' | 'copied' | 'failed'> {
  const url = new URL('./', location.href).href;
  const data = { title: 'Flag Quiz', text: 'Learn the flags of the world with Flag Quiz!', url };
  try {
    if (navigator.share && (!navigator.canShare || navigator.canShare(data))) {
      await navigator.share(data);
      return 'shared';
    }
    await navigator.clipboard.writeText(url);
    return 'copied';
  } catch (err) {
    // The user closing the share sheet is not an error worth reporting.
    if (err instanceof DOMException && err.name === 'AbortError') return 'shared';
    return 'failed';
  }
}

export const app = new AppState();
