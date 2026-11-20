import type { Continent } from '../data/countries';
import type { CountryFilter, ItemStats } from './types';

/** Difficulty score of an item never guessed. */
export const INITIAL_SCORE = 0.5;
/** An item is mastered when its difficulty score is below this value. */
export const MASTERED_BELOW = 0.2;
/** Weight of the newest guess in the difficulty score. */
const LEARNING_RATE = 0.1;

/** Bounds and step of the adaptive exponent. */
export const K_MIN = -3;
export const K_MAX = 4;
export const K_START = 1;
export const K_STEP = 0.5;

/** Difficulty score of an item for a user, in [0, 1]. */
export function scoreOf(stats?: Pick<ItemStats, 's'>): number {
  return stats?.s ?? INITIAL_SCORE;
}

/** New difficulty score after a guess: s' = 0.9 s + 0.1 z, with z = 1 if incorrect. */
export function updateScore(s: number, incorrect: boolean): number {
  return s * (1 - LEARNING_RATE) + LEARNING_RATE * (incorrect ? 1 : 0);
}

/** Updated stats of an item after a guess. */
export function recordGuess(stats: ItemStats | undefined, incorrect: boolean): ItemStats {
  const prev = stats ?? { s: INITIAL_SCORE, c: 0, d: 0 };
  return {
    s: updateScore(prev.s, incorrect),
    c: prev.c + (incorrect ? 0 : 1),
    d: prev.d + (incorrect ? 1 : 0),
  };
}

export function isMastered(stats?: Pick<ItemStats, 's'>): boolean {
  return scoreOf(stats) < MASTERED_BELOW;
}

/**
 * Sampling weight of an item. With k > 0 difficult items are favoured,
 * with k < 0 easy items are favoured, and k = 0 is uniform.
 */
export function weight(score: number, k: number): number {
  // Scores can approach 0; keep weights finite for negative k.
  return Math.pow(Math.max(score, 1e-6), k);
}

/**
 * Next adaptive exponent after a round: a round without mistakes makes the
 * next selections harder; each mistake makes them easier.
 */
export function nextK(k: number, mistakes: number): number {
  const next = mistakes === 0 ? k + K_STEP : k - K_STEP * mistakes;
  return Math.min(K_MAX, Math.max(K_MIN, next));
}

export type Rng = () => number;

/** Picks an index with probability proportional to its weight. */
export function weightedIndex(weights: readonly number[], rng: Rng = Math.random): number {
  const total = weights.reduce((a, b) => a + b, 0);
  if (!(total > 0) || !Number.isFinite(total)) return Math.floor(rng() * weights.length);
  let r = rng() * total;
  for (let i = 0; i < weights.length; i++) {
    r -= weights[i];
    if (r < 0) return i;
  }
  return weights.length - 1;
}

/** Samples `n` distinct items, each draw weighted by `weightOf`. */
export function weightedSample<T>(
  items: readonly T[],
  n: number,
  weightOf: (item: T) => number,
  rng: Rng = Math.random,
): T[] {
  const pool = [...items];
  const weights = pool.map(weightOf);
  const out: T[] = [];
  while (out.length < n && pool.length > 0) {
    const i = weightedIndex(weights, rng);
    out.push(pool[i]);
    pool.splice(i, 1);
    weights.splice(i, 1);
  }
  return out;
}

export function shuffle<T>(items: readonly T[], rng: Rng = Math.random): T[] {
  const a = [...items];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export interface RoundPick<T> {
  target: T;
  options: T[];
}

/**
 * Picks the target and the options (target included, shuffled) of a round.
 * Both the target and the other options are drawn from `pool` with weights
 * `score ^ k`. Items in `recent` are not used as target. When `pool` is too
 * small to provide all options, the remaining options are drawn from `fillers`.
 */
export function pickRound<T extends { code: string }>(
  pool: readonly T[],
  stats: ReadonlyMap<string, Pick<ItemStats, 's'>>,
  k: number,
  optionCount: number,
  recent: readonly string[] = [],
  rng: Rng = Math.random,
  fillers: readonly T[] = pool,
): RoundPick<T> {
  const w = (item: T) => weight(scoreOf(stats.get(item.code)), k);
  const recentSet = new Set(recent);
  const candidates = pool.filter((i) => !recentSet.has(i.code));
  const [target] = weightedSample(candidates.length ? candidates : pool, 1, w, rng);
  const others = weightedSample(
    pool.filter((i) => i.code !== target.code),
    Math.max(0, optionCount - 1),
    w,
    rng,
  );
  if (others.length < optionCount - 1) {
    const used = new Set([target.code, ...others.map((o) => o.code)]);
    others.push(
      ...shuffle(
        fillers.filter((f) => !used.has(f.code)),
        rng,
      ).slice(0, optionCount - 1 - others.length),
    );
  }
  return { target, options: shuffle([target, ...others], rng) };
}

/**
 * Countries allowed by a filter: those on any of the selected continents,
 * restricted to the `topN` most populous among them.
 */
export function applyFilter<T extends { population: number; continents: readonly Continent[] }>(
  countries: readonly T[],
  filter: CountryFilter,
): T[] {
  const selected = new Set(filter.continents);
  return countries
    .filter((c) => c.continents.some((k) => selected.has(k)))
    .sort((a, b) => b.population - a.population)
    .slice(0, Math.max(1, filter.topN));
}
