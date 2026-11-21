import { CAPITALS } from '../data/capitals';
import { COUNTRIES, type Country } from '../data/countries';
import * as store from './db';
import { dayKey, streaks } from './dates';
import { applyFilter, K_START, nextK, pickRound, recordGuess } from './select';
import { setLanguage, t } from './i18n.svelte';
import { bestGoldOverall, emptyScores, migrateLegacyScores, normalizeScores, scoreCorrect, scoreMistake } from './scores';
import { playCorrect, playWrong, setSoundsEnabled } from './sound';
import { setSpeechEnabled, speak } from './speech';
import { buildExport, exportFileName, parseImport, type ImportedPlayer } from './transfer';
import { nextTurn, turnOrder } from './turns';
import {
  DEFAULT_FILTER,
  DEFAULT_SETTINGS,
  OPTION_COUNT,
  TURN_ROUNDS_MAX,
  TURN_ROUNDS_MIN,
  GAMES,
  perGame,
  type Settings,
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
export type PickerMode = 'single' | 'multi';
export type AnswerResult = 'correct' | 'wrong' | null;

export interface Round {
  id: number;
  target: Country;
  options: Country[];
  /** Codes of wrongly chosen options, in order. */
  wrong: string[];
  /** True once the target is found, or revealed after a mistake in multiplayer. */
  solved: boolean;
}

/** Delay between a correct answer and the next round. */
export const NEXT_ROUND_DELAY_MS = 1000;
/** Multiplayer: how long the correct answer is shown after a mistake. */
export const REVEAL_MS = 1500;
/** Multiplayer: how long the "next player" banner is shown. */
export const TURN_BANNER_MS = 1600;
/** Maximum number of recent targets that are not repeated. */
const RECENT_SIZE = 15;
const KNOWN_CODES = new Set(COUNTRIES.map((c) => c.code));
const CAPITAL_CODES = new Set(CAPITALS.map((c) => c.code));

/** Countries that can appear in a game. */
export function availableIn(game: GameId): (c: Country) => boolean {
  if (game === 'capital' || game === 'capitalCountry') return (c) => CAPITAL_CODES.has(c.code);
  if (game === 'location') return (c) => c.code !== 'AQ';
  return () => true;
}

type PlayerStats = Record<GameId, Map<string, ItemStats>>;
const emptyStats = (): PlayerStats => perGame(() => new Map());

export function systemTheme(): Theme {
  return typeof matchMedia !== 'undefined' && matchMedia('(prefers-color-scheme: dark)').matches
    ? 'dark'
    : 'light';
}

/** Fills in fields added in later versions of the app (the database migrates saved players too). */
function withDefaults(user: User): User {
  const legacy = user as User & { perfectRun?: number; bestPerfectRun?: number };
  const { perfectRun: _run, bestPerfectRun: _best, ...rest } = legacy;
  return {
    ...rest,
    filter: user.filter ?? structuredClone(DEFAULT_FILTER),
    correctCount: user.correctCount ?? 0,
    scores: user.scores ? normalizeScores(user.scores) : migrateLegacyScores(legacy, perGame(() => [])),
    adapt: { ...perGame(() => K_START), ...user.adapt },
  };
}

class AppState {
  phase = $state<Phase>('loading');
  users = $state<User[]>([]);
  game = $state<GameId>('flag');
  round = $state<Round | null>(null);
  editor = $state<EditorMode | null>(null);
  menuOpen = $state(false);
  statsOpen = $state(false);
  filterOpen = $state(false);
  languageOpen = $state(false);
  settings = $state<Settings>({ ...DEFAULT_SETTINGS });

  /** Player picker: one player, or several players taking turns. */
  pickerMode = $state<PickerMode>('single');
  /** Player picker, multiplayer: ids of the players who will play. */
  selectedIds = $state<number[]>([]);

  /** Players of the current session, in turn order. */
  players = $state<User[]>([]);
  turn = $state(0);
  /** Multiplayer: the player whose turn just started, shown in a banner. */
  banner = $state<User | null>(null);
  playDaysById = $state<Record<number, string[]>>({});

  /** The player whose turn it is. */
  user = $derived<User | null>(this.players[this.turn] ?? null);
  multiplayer = $derived(this.players.length > 1);
  playDays = $derived(this.user?.id !== undefined ? (this.playDaysById[this.user.id] ?? []) : []);
  dayStreak = $derived(streaks(this.playDays));
  /** Countries of the current game that can be asked, according to the current player's filter. */
  pool = $derived(applyFilter(COUNTRIES.filter(availableIn(this.game)), this.user?.filter ?? DEFAULT_FILTER));

  #db: store.DB | null = null;
  #stats = new Map<number, PlayerStats>();
  #recent: string[] = [];
  #mistakes = 0;
  #roundSeq = 0;
  /** Multiplayer: rounds the current player has played in this turn. */
  #turnRounds = 0;
  /** Incremented whenever pending timers must be ignored. */
  #session = 0;

  async init(): Promise<void> {
    try {
      this.#db = await store.openDatabase();
      this.users = (await store.listUsers(this.#db)).map(withDefaults);
      this.settings = await store.getSettings(this.#db);
    } catch (err) {
      // e.g. storage disabled: the app still works, but nothing is saved.
      console.warn('IndexedDB unavailable; progress will not be saved.', err);
      this.#db = null;
    }
    setSpeechEnabled(this.settings.speech);
    setSoundsEnabled(this.settings.sounds);
    await setLanguage(this.settings.language);
    this.phase = 'pickUser';
    if (this.users.length === 0) this.editor = 'new';
  }

  // --------------------------------------------------------------- settings

  setSettings(patch: Partial<Settings>): void {
    const next = { ...this.settings, ...patch };
    next.turnRounds = Math.min(TURN_ROUNDS_MAX, Math.max(TURN_ROUNDS_MIN, Math.round(next.turnRounds)));
    const languageChanged = next.language !== this.settings.language;
    this.settings = next;
    if (languageChanged) void setLanguage(next.language);
    setSpeechEnabled(next.speech);
    setSoundsEnabled(next.sounds);
    if (this.#db) void store.saveSettings(this.#db, $state.snapshot(next) as Settings);
  }

  // ---------------------------------------------------------------- players

  setPickerMode(mode: PickerMode): void {
    this.pickerMode = mode;
  }

  toggleSelected(id: number): void {
    this.selectedIds = this.selectedIds.includes(id)
      ? this.selectedIds.filter((x) => x !== id)
      : [...this.selectedIds, id];
  }

  /** Starts a multiplayer session with the selected players. */
  async startMultiplayer(): Promise<void> {
    const selected = this.users.filter((u) => u.id !== undefined && this.selectedIds.includes(u.id));
    if (selected.length >= 2) await this.startSession(selected);
  }

  /** Starts a session with one or more players and shows the game picker. */
  async startSession(selected: User[]): Promise<void> {
    this.#session++;
    const now = Date.now();
    let players = selected.map((u) => ({ ...withDefaults(u), lastActiveAt: now }));
    if (players.length > 1) players = turnOrder(players, (p) => bestGoldOverall(p.scores));
    await Promise.all(players.map((p) => this.#load(p)));
    this.players = players;
    this.turn = 0;
    this.banner = null;
    this.round = null;
    this.#recent = [];
    applyTheme(players[0].theme);
    await Promise.all(this.players.map((p) => this.#saveUser(p)));
    this.editor = null;
    this.phase = 'pickGame';
  }

  async #load(player: User): Promise<void> {
    if (player.id === undefined) return;
    if (!this.#db) {
      this.#stats.set(player.id, this.#stats.get(player.id) ?? emptyStats());
      return;
    }
    const id = player.id;
    const db = this.#db;
    const [days, ...maps] = await Promise.all([
      store.getPlayDays(db, id),
      ...GAMES.map((g) => store.getStats(db, id, g)),
    ]);
    this.#stats.set(id, Object.fromEntries(GAMES.map((g, i) => [g, maps[i]])) as PlayerStats);
    this.playDaysById = { ...this.playDaysById, [id]: days };
  }

  async createUser(name: string, flag: UserFlag): Promise<void> {
    const now = Date.now();
    const user: User = {
      name,
      flag,
      difficulty: 'easy',
      theme: currentTheme(),
      adapt: perGame(() => K_START),
      scores: emptyScores(),
      correctCount: 0,
      filter: structuredClone(DEFAULT_FILTER),
      createdAt: now,
      lastActiveAt: now,
    };
    const saved = this.#db ? await store.saveUser(this.#db, user) : { ...user, id: -now };
    this.users = [saved, ...this.users];
    if (this.pickerMode === 'multi') {
      // Stay in the player picker, with the new player selected.
      this.selectedIds = [...this.selectedIds, saved.id!];
      this.editor = null;
    } else {
      await this.startSession([saved]);
    }
  }

  async updateUser(name: string, flag: UserFlag): Promise<void> {
    if (!this.user) return;
    this.user.name = name;
    this.user.flag = flag;
    this.editor = null;
    await this.#saveUser(this.user);
  }

  /** Deletes a player and all their data. Not allowed for players in the current session. */
  async deleteUser(id: number): Promise<void> {
    if (this.players.some((p) => p.id === id)) return;
    if (this.#db) await store.deleteUserWithData(this.#db, id);
    this.users = this.users.filter((u) => u.id !== id);
    this.selectedIds = this.selectedIds.filter((x) => x !== id);
    this.#stats.delete(id);
  }

  switchUser(): void {
    this.#session++;
    this.menuOpen = false;
    this.round = null;
    this.banner = null;
    this.players = [];
    this.turn = 0;
    this.phase = 'pickUser';
  }

  setDifficulty(d: Difficulty): void {
    if (!this.user || this.user.difficulty === d) return;
    this.user.difficulty = d;
    void this.#saveUser(this.user);
    if (this.phase === 'playing' && !this.banner) this.newRound();
  }

  setFilter(filter: CountryFilter): void {
    if (!this.user) return;
    this.user.filter = filter;
    this.#recent = [];
    void this.#saveUser(this.user);
    if (this.phase === 'playing' && !this.banner) this.newRound();
  }

  /** Light/dark mode applies to everyone playing. */
  toggleTheme(): void {
    if (!this.user) return;
    const theme: Theme = this.user.theme === 'dark' ? 'light' : 'dark';
    for (const p of this.players) {
      p.theme = theme;
      void this.#saveUser(p);
    }
    applyTheme(theme);
  }

  async #saveUser(player: User): Promise<void> {
    const snapshot = $state.snapshot(player) as User;
    if (this.#db) await store.saveUser(this.#db, snapshot);
    this.users = this.users.map((u) => (u.id === snapshot.id ? snapshot : u));
  }

  // ------------------------------------------------------- export / import

  /** Downloads the current player's data as a JSON file. */
  exportUser(): void {
    if (!this.user) return;
    const data = buildExport(
      $state.snapshot(this.user) as User,
      perGame((g) => this.statsFor(g)),
      this.playDays,
    );
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
    this.#session++;
    this.game = game;
    this.menuOpen = false;
    this.banner = null;
    this.#recent = [];
    this.#turnRounds = 0;
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
      this.statsFor(this.game),
      this.user.adapt[this.game],
      OPTION_COUNT[this.user.difficulty],
      this.#recent,
      Math.random,
      COUNTRIES.filter(availableIn(this.game)),
    );
    // With few countries in the pool, fewer recent targets are excluded.
    const recentSize = Math.min(RECENT_SIZE, Math.floor(pool.length / 2));
    this.#recent = recentSize > 0 ? [...this.#recent, target.code].slice(-recentSize) : [];
    this.#mistakes = 0;
    this.round = { id: ++this.#roundSeq, target, options, wrong: [], solved: false };
  }

  /** Runs `fn` after `ms`, unless the round or session changed meanwhile. */
  #later(ms: number, fn: () => void): void {
    const roundId = this.round?.id;
    const session = this.#session;
    setTimeout(() => {
      if (this.round?.id === roundId && this.#session === session && this.phase === 'playing') fn();
    }, ms);
  }

  /** Handles the selection of an option in the current round. */
  answer(code: string): AnswerResult {
    const round = this.round;
    const user = this.user;
    if (!round || !user || round.solved || this.banner || round.wrong.includes(code)) return null;
    this.#markPlayedToday(user);
    const game = this.game;

    if (code === round.target.code) {
      round.solved = true;
      playCorrect();
      user.correctCount++;
      scoreCorrect(user.scores[game], this.#mistakes === 0);
      if (this.#mistakes === 0) this.#record(user, game, code, false);
      user.adapt[game] = nextK(user.adapt[game], this.#mistakes);
      void this.#saveUser(user);
      // Multiplayer: after the maximum number of rounds in a row, the next player plays.
      this.#turnRounds++;
      const turnOver = this.multiplayer && this.#turnRounds >= this.settings.turnRounds;
      this.#later(NEXT_ROUND_DELAY_MS, () => (turnOver ? this.#passTurn() : this.newRound()));
      return 'correct';
    }

    round.wrong.push(code);
    playWrong();
    // The wrongly chosen item was not recognised either.
    this.#record(user, game, code, true);
    // Every mistake costs a silver star; gold stars restart from zero.
    scoreMistake(user.scores[game]);
    // The target counts as missed once per round.
    if (this.#mistakes === 0) this.#record(user, game, round.target.code, true);
    this.#mistakes++;

    if (this.multiplayer) {
      // A mistake ends the turn: show the right answer, then pass the turn.
      round.solved = true;
      user.adapt[game] = nextK(user.adapt[game], this.#mistakes);
      this.#later(REVEAL_MS, () => this.#passTurn());
    }
    void this.#saveUser(user);
    return 'wrong';
  }

  #passTurn(): void {
    this.#turnRounds = 0;
    this.turn = nextTurn(this.turn, this.players.length);
    const player = this.user;
    if (!player) return;
    this.banner = player;
    speak(player.name);
    this.#later(TURN_BANNER_MS, () => {
      this.banner = null;
      this.newRound();
    });
  }

  #record(user: User, game: GameId, code: string, incorrect: boolean): void {
    if (user.id === undefined) return;
    const stats = this.#stats.get(user.id) ?? emptyStats();
    this.#stats.set(user.id, stats);
    const next = recordGuess(stats[game].get(code), incorrect);
    stats[game].set(code, next);
    if (this.#db) void store.putStat(this.#db, { userId: user.id, game, code, ...next });
  }

  #markPlayedToday(user: User): void {
    const today = dayKey();
    if (user.id === undefined) return;
    const days = this.playDaysById[user.id] ?? [];
    if (days.includes(today)) return;
    this.playDaysById = { ...this.playDaysById, [user.id]: [...days, today] };
    if (this.#db) void store.addPlayDay(this.#db, user.id, today);
  }

  /** Stats of the current player for a game. */
  statsFor(game: GameId): ReadonlyMap<string, ItemStats> {
    const id = this.user?.id;
    return (id !== undefined ? this.#stats.get(id)?.[game] : undefined) ?? new Map();
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
  const data = { title: 'Flag Quiz', text: t('shareText'), url };
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
