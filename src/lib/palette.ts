import { PATTERNS, type UserFlag } from './types';

/** Colours offered for custom flags. */
export const PALETTE: readonly string[] = [
  '#E4002B', // red
  '#FF8200', // orange
  '#FFCD00', // AOSSIE gold
  '#00843D', // AOSSIE green
  '#7BC043', // lime
  '#41B6E6', // sky
  '#0032A0', // blue
  '#7A3EB1', // purple
  '#F472B6', // pink
  '#8B5A2B', // brown
  '#FFFFFF', // white
  '#121212', // black
];

/** A random custom flag with three distinct colours. */
export function randomFlag(rng: () => number = Math.random): UserFlag {
  const pool = [...PALETTE];
  const pick = () => pool.splice(Math.floor(rng() * pool.length), 1)[0];
  return {
    colors: [pick(), pick(), pick()],
    pattern: PATTERNS[Math.floor(rng() * PATTERNS.length)],
  };
}
