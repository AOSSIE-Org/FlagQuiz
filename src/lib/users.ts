/** Players saved by any version of the app, brought up to date. */
import { migrateLegacyScores, normalizeScores } from './scores';
import { K_START } from './select';
import { DEFAULT_FILTER, perGame, type User } from './types';

/** Fills in fields added in later versions of the app (the database migrates saved players too). */
export function withDefaults(user: User): User {
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
