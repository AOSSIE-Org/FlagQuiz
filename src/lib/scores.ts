/** Per-game scores: correct answers, gold stars and silver stars. */
import { GAMES, perGame, type GameId, type GameScore, type ItemStats } from './types';

export const emptyScore = (): GameScore => ({ correct: 0, gold: 0, bestGold: 0, silver: 0, bestSilver: 0 });
export const emptyScores = (): Record<GameId, GameScore> => perGame(emptyScore);

/** A round was solved; `firstTry` if without mistakes. */
export function scoreCorrect(score: GameScore, firstTry: boolean): void {
  score.correct++;
  if (!firstTry) return;
  score.gold++;
  score.silver++;
  score.bestGold = Math.max(score.bestGold, score.gold);
  score.bestSilver = Math.max(score.bestSilver, score.silver);
}

/** A wrong answer: gold stars restart from zero, silver stars lose one. */
export function scoreMistake(score: GameScore): void {
  score.gold = 0;
  score.silver = Math.max(0, score.silver - 1);
}

/** The best gold-star run of a player in any game. */
export function bestGoldOverall(scores: Record<GameId, GameScore>): number {
  return Math.max(0, ...GAMES.map((g) => scores[g]?.bestGold ?? 0));
}

const count = (v: unknown): number => (Number.isInteger(v) && (v as number) >= 0 ? (v as number) : 0);

/** Fills in missing or invalid scores. */
export function normalizeScores(value: unknown): Record<GameId, GameScore> {
  const raw = (typeof value === 'object' && value !== null ? value : {}) as Record<string, Record<string, unknown>>;
  return perGame((g) => {
    const s = raw[g] ?? {};
    const gold = count(s.gold);
    const silver = count(s.silver);
    return {
      correct: count(s.correct),
      gold,
      bestGold: Math.max(gold, count(s.bestGold)),
      silver,
      bestSilver: Math.max(silver, count(s.bestSilver)),
    };
  });
}

/**
 * Scores for a player saved by app versions before per-game scores, which only
 * kept one run of rounds without mistakes for all games:
 * - correct answers per game: the first-try correct answers in the game's statistics;
 * - the old run and best run go to the game played most, where they most likely
 *   happened; silver stars start from the same values.
 */
export function migrateLegacyScores(
  legacy: { perfectRun?: unknown; bestPerfectRun?: unknown },
  stats: Record<GameId, Iterable<ItemStats>>,
): Record<GameId, GameScore> {
  const scores = emptyScores();
  let mostPlayed: GameId = GAMES[0];
  let mostGuesses = -1;
  for (const g of GAMES) {
    let guesses = 0;
    for (const { c, d } of stats[g]) {
      scores[g].correct += c;
      guesses += c + d;
    }
    if (guesses > mostGuesses) {
      mostGuesses = guesses;
      mostPlayed = g;
    }
  }
  const run = count(legacy.perfectRun);
  const best = Math.max(run, count(legacy.bestPerfectRun));
  Object.assign(scores[mostPlayed], { gold: run, bestGold: best, silver: run, bestSilver: best });
  return scores;
}
