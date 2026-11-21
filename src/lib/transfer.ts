/** Export and import of one player's data as JSON. */
import { migrateLegacyScores, normalizeScores } from './scores';
import { K_MAX, K_MIN, K_START } from './select';
import {
  CONTINENTS,
  DEFAULT_FILTER,
  DIFFICULTIES,
  GAMES,
  PATTERNS,
  type CountryFilter,
  perGame,
  type GameId,
  type ItemStats,
  type User,
  type UserFlag,
} from './types';

export const EXPORT_FORMAT = 'flag-quiz-player';
/**
 * Version history (files of every version can still be imported):
 * 1. one run of rounds without mistakes for all games (`perfectRun`, `bestPerfectRun`)
 * 2. per-game scores (`scores`)
 */
export const EXPORT_VERSION = 2;
const SUPPORTED_VERSIONS = [1, 2];
/** Imported files larger than this are rejected. */
export const MAX_IMPORT_BYTES = 5 * 1024 * 1024;
export const MAX_NAME_LENGTH = 16;

export interface ExportedStat extends ItemStats {
  game: GameId;
  code: string;
}

export interface ExportFile {
  format: typeof EXPORT_FORMAT;
  version: typeof EXPORT_VERSION;
  exportedAt: string;
  player: Omit<User, 'id' | 'lastActiveAt'>;
  stats: ExportedStat[];
  playDays: string[];
}

export interface ImportedPlayer {
  user: User;
  stats: ExportedStat[];
  playDays: string[];
}

/** Why a file can't be imported; also the key of the message shown (`import.<reason>`). */
export type ImportFailure = 'tooLarge' | 'notJson' | 'notPlayerFile' | 'unsupportedVersion' | 'invalid';

export class ImportError extends Error {
  constructor(
    readonly reason: ImportFailure,
    message: string = reason,
  ) {
    super(message);
  }
}

export function buildExport(
  user: User,
  stats: Record<GameId, ReadonlyMap<string, ItemStats>>,
  playDays: readonly string[],
  now: Date = new Date(),
): ExportFile {
  const { id: _id, lastActiveAt: _last, ...player } = user;
  return {
    format: EXPORT_FORMAT,
    version: EXPORT_VERSION,
    exportedAt: now.toISOString(),
    player,
    stats: GAMES.flatMap((game) =>
      [...stats[game]].map(([code, { s, c, d }]) => ({ game, code, s, c, d })),
    ),
    playDays: [...playDays],
  };
}

/** A safe file name for the export of a player. */
export function exportFileName(name: string): string {
  const slug = name
    .normalize('NFKD')
    .replace(/[^\w-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase();
  return `flag-quiz-${slug || 'player'}.json`;
}

// ------------------------------------------------------------------ import

const isObject = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v);
const isCount = (v: unknown): v is number => Number.isInteger(v) && (v as number) >= 0;
const COLOR = /^#[0-9a-f]{6}$/i;
const DATE = /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/;

function fail(message: string, reason: ImportFailure = 'invalid'): never {
  throw new ImportError(reason, message);
}

function parseFlag(v: unknown): UserFlag {
  if (!isObject(v)) fail('Invalid flag');
  const { colors, pattern } = v;
  if (!Array.isArray(colors) || colors.length !== 3 || !colors.every((c) => typeof c === 'string' && COLOR.test(c))) {
    fail('Invalid flag colours');
  }
  if (!PATTERNS.includes(pattern as never)) fail('Invalid flag pattern');
  return { colors: colors.map((c: string) => c.toUpperCase()) as UserFlag['colors'], pattern: pattern as UserFlag['pattern'] };
}

function parseFilter(v: unknown, countryCount: number): CountryFilter {
  if (!isObject(v)) return structuredClone(DEFAULT_FILTER);
  const continents = Array.isArray(v.continents)
    ? CONTINENTS.filter((c) => (v.continents as unknown[]).includes(c))
    : [];
  const topN = Number.isInteger(v.topN) ? Math.min(countryCount, Math.max(1, v.topN as number)) : DEFAULT_FILTER.topN;
  return { continents: continents.length ? continents : [...CONTINENTS], topN };
}

function parseK(v: unknown): number {
  return typeof v === 'number' && Number.isFinite(v) ? Math.min(K_MAX, Math.max(K_MIN, v)) : K_START;
}

/**
 * Parses and validates an exported player file. Unknown or missing optional
 * settings fall back to defaults; malformed data is rejected with an ImportError.
 */
export function parseImport(text: string, knownCodes: ReadonlySet<string>, now: number = Date.now()): ImportedPlayer {
  if (text.length > MAX_IMPORT_BYTES) fail('File too large', 'tooLarge');
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    fail('Not a JSON file', 'notJson');
  }
  if (!isObject(data) || data.format !== EXPORT_FORMAT) fail('Not a Flag Quiz player file', 'notPlayerFile');
  if (!SUPPORTED_VERSIONS.includes(data.version as number)) fail('Unsupported file version', 'unsupportedVersion');

  const p = data.player;
  if (!isObject(p)) fail('Missing player');
  const name = typeof p.name === 'string' ? p.name.trim().slice(0, MAX_NAME_LENGTH) : '';
  if (!name) fail('Missing player name');
  const adapt = isObject(p.adapt) ? p.adapt : {};

  const user: User = {
    name,
    flag: parseFlag(p.flag),
    difficulty: DIFFICULTIES.includes(p.difficulty as never) ? (p.difficulty as User['difficulty']) : 'easy',
    theme: p.theme === 'dark' ? 'dark' : 'light',
    adapt: perGame((g) => parseK(adapt[g])),
    scores: normalizeScores(p.scores),
    correctCount: isCount(p.correctCount) ? p.correctCount : 0,
    filter: parseFilter(p.filter, knownCodes.size),
    createdAt: typeof p.createdAt === 'number' && Number.isFinite(p.createdAt) ? p.createdAt : now,
    lastActiveAt: now,
  };

  if (!Array.isArray(data.stats)) fail('Missing statistics');
  const seen = new Set<string>();
  const stats: ExportedStat[] = [];
  for (const r of data.stats) {
    if (!isObject(r)) fail('Invalid statistics');
    const { game, code, s, c, d } = r;
    if (!GAMES.includes(game as never) || typeof code !== 'string') fail('Invalid statistics');
    if (typeof s !== 'number' || !(s >= 0 && s <= 1) || !isCount(c) || !isCount(d)) fail('Invalid statistics');
    const key = `${game}:${code}`;
    // Countries unknown to this version of the app are skipped.
    if (!knownCodes.has(code) || seen.has(key)) continue;
    seen.add(key);
    stats.push({ game: game as GameId, code, s, c, d });
  }

  if (!Array.isArray(data.playDays)) fail('Missing play days');
  const playDays = [...new Set(data.playDays)].map((d) => {
    if (typeof d !== 'string' || !DATE.test(d)) fail('Invalid play day');
    return d;
  });
  playDays.sort();

  if (data.version === 1) {
    user.scores = migrateLegacyScores(p, perGame((g) => stats.filter((r) => r.game === g)));
  }
  return { user, stats, playDays };
}
