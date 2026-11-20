import { describe, expect, it } from 'vitest';
import type { Continent } from '../data/countries';
import {
  INITIAL_SCORE,
  K_MAX,
  K_MIN,
  applyFilter,
  isMastered,
  nextK,
  pickRound,
  recordGuess,
  scoreOf,
  updateScore,
  weight,
  weightedIndex,
  weightedSample,
} from './select';
import type { ItemStats } from './types';

/** Deterministic pseudo-random generator (mulberry32). */
function seeded(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const items = Array.from({ length: 50 }, (_, i) => ({ code: `C${i}` }));

describe('difficulty score', () => {
  it('starts at 0.5', () => {
    expect(INITIAL_SCORE).toBe(0.5);
    expect(scoreOf()).toBe(0.5);
  });
  it("is updated as s' = 0.9 s + 0.1 z", () => {
    expect(updateScore(0.5, true)).toBeCloseTo(0.55);
    expect(updateScore(0.5, false)).toBeCloseTo(0.45);
    expect(updateScore(1, true)).toBeCloseTo(1);
    expect(updateScore(0, false)).toBe(0);
  });
  it('records guesses with counts', () => {
    const a = recordGuess(undefined, false);
    expect(a).toEqual({ s: 0.45, c: 1, d: 0 });
    const b = recordGuess(a, true);
    expect(b.s).toBeCloseTo(0.505);
    expect(b).toMatchObject({ c: 1, d: 1 });
  });
  it('needs 9 correct guesses in a row to master an item (score < 0.2)', () => {
    let s: ItemStats | undefined;
    for (let i = 0; i < 8; i++) s = recordGuess(s, false);
    expect(isMastered(s)).toBe(false);
    s = recordGuess(s, false);
    expect(isMastered(s)).toBe(true);
    expect(isMastered(undefined)).toBe(false);
  });
});

describe('weight', () => {
  it('favours hard items when k > 0 and easy items when k < 0', () => {
    expect(weight(0.75, 2)).toBeGreaterThan(weight(0.25, 2));
    expect(weight(0.75, -2)).toBeLessThan(weight(0.25, -2));
    expect(weight(0.75, 0)).toBe(weight(0.25, 0));
  });
  it('stays finite for a zero score and negative k', () => {
    expect(Number.isFinite(weight(0, -3))).toBe(true);
  });
});

describe('nextK', () => {
  it('increases after a perfect round and decreases with mistakes', () => {
    expect(nextK(1, 0)).toBe(1.5);
    expect(nextK(1, 1)).toBe(0.5);
    expect(nextK(1, 3)).toBe(-0.5);
  });
  it('stays within bounds', () => {
    expect(nextK(K_MAX, 0)).toBe(K_MAX);
    expect(nextK(K_MIN, 5)).toBe(K_MIN);
  });
});

describe('weightedIndex / weightedSample', () => {
  it('never picks zero-weight items', () => {
    const rng = seeded(1);
    for (let i = 0; i < 200; i++) expect(weightedIndex([0, 1, 0], rng)).toBe(1);
  });
  it('samples distinct items', () => {
    const out = weightedSample(items, 9, () => 1, seeded(2));
    expect(new Set(out).size).toBe(9);
  });
  it('returns at most the available items', () => {
    expect(weightedSample(items.slice(0, 3), 9, () => 1, seeded(3))).toHaveLength(3);
  });
});

describe('pickRound', () => {
  it('returns the requested number of distinct options including the target', () => {
    for (const n of [3, 6, 9]) {
      const { target, options } = pickRound(items, new Map(), 1, n, [], seeded(n));
      expect(options).toHaveLength(n);
      expect(new Set(options.map((o) => o.code)).size).toBe(n);
      expect(options).toContain(target);
    }
  });

  it('does not repeat recent targets', () => {
    const recent = items.slice(0, 45).map((i) => i.code);
    const rng = seeded(4);
    for (let i = 0; i < 100; i++) {
      const { target } = pickRound(items, new Map(), 1, 3, recent, rng);
      expect(recent).not.toContain(target.code);
    }
  });

  it('fills missing options from the fillers when the pool is small', () => {
    const pool = items.slice(0, 2);
    const rng = seeded(6);
    for (let i = 0; i < 50; i++) {
      const { target, options } = pickRound(pool, new Map(), 1, 9, [], rng, items);
      expect(pool).toContain(target);
      expect(options).toHaveLength(9);
      expect(new Set(options.map((o) => o.code)).size).toBe(9);
    }
  });

  it('adapts the target difficulty to k', () => {
    // Half of the items are hard, half are easy.
    const stats = new Map(items.map((it, i) => [it.code, { s: i < 25 ? 0.8 : 0.1 }]));
    const hardShare = (k: number) => {
      const rng = seeded(5);
      let hard = 0;
      for (let i = 0; i < 2000; i++) {
        const { target } = pickRound(items, stats, k, 3, [], rng);
        if (Number(target.code.slice(1)) < 25) hard++;
      }
      return hard / 2000;
    };
    expect(hardShare(3)).toBeGreaterThan(0.95);
    expect(hardShare(0)).toBeCloseTo(0.5, 1);
    expect(hardShare(-3)).toBeLessThan(0.05);
  });
});

describe('applyFilter', () => {
  const countries: { code: string; population: number; continents: Continent[] }[] = [
    { code: 'A', population: 50, continents: ['EU'] },
    { code: 'B', population: 300, continents: ['AS'] },
    { code: 'C', population: 100, continents: ['EU', 'AS'] },
    { code: 'D', population: 10, continents: ['AF'] },
    { code: 'E', population: 200, continents: ['AF'] },
  ];
  const codes = (f: Parameters<typeof applyFilter>[1]) => applyFilter(countries, f).map((c) => c.code);

  it('keeps countries on any selected continent', () => {
    expect(codes({ continents: ['EU'], topN: 100 }).sort()).toEqual(['A', 'C']);
    expect(codes({ continents: ['AS'], topN: 100 }).sort()).toEqual(['B', 'C']);
  });
  it('keeps the N most populous among the selected continents', () => {
    expect(codes({ continents: ['EU', 'AS', 'AF'], topN: 2 })).toEqual(['B', 'E']);
    expect(codes({ continents: ['AF'], topN: 1 })).toEqual(['E']);
  });
});
