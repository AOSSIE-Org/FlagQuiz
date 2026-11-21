import type { Continent } from '../data/countries';

/** `flag` = "Guess the Flag", `country` = "Guess the Country". */
export type GameId = 'flag' | 'country';
export const GAMES: readonly GameId[] = ['flag', 'country'];

export type Difficulty = 'easy' | 'medium' | 'hard';
export const DIFFICULTIES: readonly Difficulty[] = ['easy', 'medium', 'hard'];
export const OPTION_COUNT: Record<Difficulty, number> = { easy: 3, medium: 6, hard: 9 };

export type Theme = 'light' | 'dark';

export type Pattern =
  | 'vbands'
  | 'hbands'
  | 'nordic'
  | 'diagonal'
  | 'hoist'
  | 'disc'
  | 'rhombus'
  | 'cross'
  | 'starDisc'
  | 'crescent'
  | 'canton'
  | 'stars';
export const PATTERNS: readonly Pattern[] = [
  'vbands',
  'hbands',
  'nordic',
  'diagonal',
  'hoist',
  'disc',
  'rhombus',
  'cross',
  'starDisc',
  'crescent',
  'canton',
  'stars',
];

export const CONTINENTS: readonly Continent[] = ['AF', 'AS', 'EU', 'NA', 'SA', 'OC', 'AN'];

/** Restricts which countries can be asked. */
export interface CountryFilter {
  /** Countries on any of these continents. */
  continents: Continent[];
  /** Only the N most populous countries among the selected continents. */
  topN: number;
}

export const DEFAULT_FILTER: CountryFilter = { continents: [...CONTINENTS], topN: 100 };

export interface UserFlag {
  colors: [string, string, string];
  pattern: Pattern;
}

export interface User {
  id?: number;
  name: string;
  flag: UserFlag;
  difficulty: Difficulty;
  theme: Theme;
  /** Adaptive exponent per game: > 0 favours harder items, < 0 easier ones. */
  adapt: Record<GameId, number>;
  /** Current number of consecutive rounds solved without mistakes. */
  perfectRun: number;
  /** Best ever number of consecutive rounds solved without mistakes. */
  bestPerfectRun: number;
  filter: CountryFilter;
  createdAt: number;
  lastActiveAt: number;
}

/** What a player knows about one country in one game. */
export interface ItemStats {
  /** Difficulty score in [0, 1]: starts at 0.5, s' = 0.9 s + 0.1 z (z = 1 if incorrect). */
  s: number;
  /** Number of correct guesses. */
  c: number;
  /** Number of incorrect guesses. */
  d: number;
}

export interface StatRecord extends ItemStats {
  userId: number;
  game: GameId;
  code: string;
}
