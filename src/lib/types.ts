import type { Continent } from '../data/countries';
import { DEFAULT_LANGUAGE, type LanguageCode } from './languages';

/**
 * `flag` = "Guess the Flag", `country` = "Guess the Country",
 * `location` = "Guess the Location", `capital` = "Guess the Capital",
 * `capitalCountry` = "Guess the Capital's Country".
 */
export type GameId = 'flag' | 'country' | 'location' | 'capital' | 'capitalCountry';
export const GAMES: readonly GameId[] = ['flag', 'country', 'location', 'capital', 'capitalCountry'];

/** A record with one value per game. */
export function perGame<T>(value: (game: GameId) => T): Record<GameId, T> {
  return Object.fromEntries(GAMES.map((g) => [g, value(g)])) as Record<GameId, T>;
}

/** Device-wide preferences. */
export interface Settings {
  /** Read names aloud. */
  speech: boolean;
  /** Feedback sounds. */
  sounds: boolean;
  /** Multiplayer: maximum rounds in a row per player. */
  turnRounds: number;
  /** Language of the app. */
  language: LanguageCode;
  /** Daily reminder notification (installed app only). */
  reminders: boolean;
}

export const DEFAULT_SETTINGS: Settings = { speech: true, sounds: true, turnRounds: 3, language: DEFAULT_LANGUAGE, reminders: false };
export const TURN_ROUNDS_MIN = 1;
export const TURN_ROUNDS_MAX = 10;

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
  /** Scores per game. */
  scores: Record<GameId, GameScore>;
  /** Total number of correct answers, in all games. */
  correctCount: number;
  filter: CountryFilter;
  createdAt: number;
  lastActiveAt: number;
}

/** A player's scores in one game. */
export interface GameScore {
  /** Correct answers (green-gold check mark). */
  correct: number;
  /** Gold stars: rounds in a row solved without mistakes; a mistake resets them to 0. */
  gold: number;
  bestGold: number;
  /** Silver stars: +1 per round solved without mistakes, −1 per mistake, never below 0. */
  silver: number;
  bestSilver: number;
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
