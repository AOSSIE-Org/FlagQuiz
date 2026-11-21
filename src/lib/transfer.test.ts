import { describe, expect, it } from 'vitest';
import { buildExport, exportFileName, ImportError, parseImport, type ExportFile } from './transfer';
import { DEFAULT_FILTER, type ItemStats, type User } from './types';

const known = new Set(['FR', 'DE', 'BR']);

const user: User = {
  id: 7,
  name: 'Ana',
  flag: { colors: ['#00843D', '#FFCD00', '#0032A0'], pattern: 'hoist' },
  difficulty: 'medium',
  theme: 'dark',
  adapt: { flag: 2, country: -1, location: 1, capital: 1, capitalCountry: 1 },
  scores: {
    flag: { correct: 30, gold: 3, bestGold: 12, silver: 5, bestSilver: 14 },
    country: { correct: 10, gold: 0, bestGold: 4, silver: 1, bestSilver: 6 },
    location: { correct: 0, gold: 0, bestGold: 0, silver: 0, bestSilver: 0 },
    capital: { correct: 0, gold: 0, bestGold: 0, silver: 0, bestSilver: 0 },
    capitalCountry: { correct: 0, gold: 0, bestGold: 0, silver: 0, bestSilver: 0 },
  },
  correctCount: 40,
  filter: { continents: ['EU', 'SA'], topN: 2 },
  createdAt: 1000,
  lastActiveAt: 2000,
};

function exported(): ExportFile {
  return buildExport(
    user,
    {
      flag: new Map<string, ItemStats>([['FR', { s: 0.1, c: 9, d: 0 }]]),
      country: new Map<string, ItemStats>([['DE', { s: 0.55, c: 0, d: 1 }]]),
      location: new Map(),
      capital: new Map(),
      capitalCountry: new Map(),
    },
    ['2026-11-19', '2026-11-20'],
    new Date('2026-11-21T10:00:00Z'),
  );
}

const reparse = (data: unknown) => parseImport(JSON.stringify(data), known, 5000);

describe('export / import', () => {
  it('round-trips a player', () => {
    const file = exported();
    expect(file.player).not.toHaveProperty('id');
    const { user: u, stats, playDays } = reparse(file);
    const { id: _id, ...withoutId } = user;
    expect(u).toEqual({ ...withoutId, lastActiveAt: 5000 });
    expect(stats).toEqual([
      { game: 'flag', code: 'FR', s: 0.1, c: 9, d: 0 },
      { game: 'country', code: 'DE', s: 0.55, c: 0, d: 1 },
    ]);
    expect(playDays).toEqual(['2026-11-19', '2026-11-20']);
  });

  it('makes safe file names', () => {
    expect(exportFileName('Ana Maria')).toBe('flag-quiz-ana-maria.json');
    expect(exportFileName('../../x')).toBe('flag-quiz-x.json');
    expect(exportFileName('???')).toBe('flag-quiz-player.json');
  });

  it('rejects files that are not player files', () => {
    expect(() => parseImport('not json', known)).toThrow(ImportError);
    expect(() => reparse({ hello: 1 })).toThrow(ImportError);
    expect(() => reparse({ ...exported(), version: 99 })).toThrow(ImportError);
  });

  it('rejects malformed players and data', () => {
    const f = exported();
    expect(() => reparse({ ...f, player: { ...f.player, name: '  ' } })).toThrow(ImportError);
    expect(() =>
      reparse({ ...f, player: { ...f.player, flag: { colors: ['red', '#000000', '#FFFFFF'], pattern: 'hoist' } } }),
    ).toThrow(ImportError);
    expect(() => reparse({ ...f, player: { ...f.player, flag: { ...f.player.flag, pattern: 'x' } } })).toThrow(
      ImportError,
    );
    expect(() => reparse({ ...f, stats: [{ game: 'flag', code: 'FR', s: 2, c: 0, d: 0 }] })).toThrow(ImportError);
    expect(() => reparse({ ...f, stats: [{ game: 'x', code: 'FR', s: 0.5, c: 0, d: 0 }] })).toThrow(ImportError);
    expect(() => reparse({ ...f, stats: [{ game: 'flag', code: 'FR', s: 0.5, c: -1, d: 0 }] })).toThrow(ImportError);
    expect(() => reparse({ ...f, playDays: ['yesterday'] })).toThrow(ImportError);
    expect(() => parseImport('x'.repeat(6 * 1024 * 1024), known)).toThrow('File too large');
  });

  it('sanitises settings and skips unknown countries', () => {
    const f = exported();
    const { user: u, stats, playDays } = reparse({
      ...f,
      player: {
        ...f.player,
        name: '  A very very long player name  ',
        difficulty: 'impossible',
        adapt: { flag: 100, country: 'x' },
        filter: { continents: ['XX'], topN: 1e9 },
        scores: { flag: { correct: 2, gold: 20, bestGold: 5, silver: -3, bestSilver: 'x' }, country: null },
      },
      stats: [...f.stats, { game: 'flag', code: 'ZZ', s: 0.5, c: 1, d: 1 }, f.stats[0]],
      playDays: ['2026-11-20', '2026-11-19', '2026-11-20'],
    });
    expect(u.name).toBe('A very very long');
    expect(u.difficulty).toBe('easy');
    expect(u.adapt).toEqual({ flag: 4, country: 1, location: 1, capital: 1, capitalCountry: 1 });
    expect(u.filter).toEqual({ continents: DEFAULT_FILTER.continents, topN: known.size });
    expect(u.scores.flag).toEqual({ correct: 2, gold: 20, bestGold: 20, silver: 0, bestSilver: 0 });
    expect(u.scores.country).toEqual({ correct: 0, gold: 0, bestGold: 0, silver: 0, bestSilver: 0 });
    expect(stats.map((s) => s.code)).toEqual(['FR', 'DE']);
    expect(playDays).toEqual(['2026-11-19', '2026-11-20']);
  });

  it('imports version 1 files, moving the old run to the most played game', () => {
    const f = exported();
    const { scores: _scores, ...player } = f.player;
    const { user: u } = reparse({
      ...f,
      version: 1,
      player: { ...player, perfectRun: 3, bestPerfectRun: 12 },
      stats: [
        { game: 'flag', code: 'FR', s: 0.1, c: 9, d: 0 },
        { game: 'country', code: 'DE', s: 0.5, c: 2, d: 30 },
      ],
    });
    expect(u.scores.flag).toEqual({ correct: 9, gold: 0, bestGold: 0, silver: 0, bestSilver: 0 });
    expect(u.scores.country).toEqual({ correct: 2, gold: 3, bestGold: 12, silver: 3, bestSilver: 12 });
  });

  it('rejects files from newer versions with a reason', () => {
    try {
      reparse({ ...exported(), version: 99 });
      expect.unreachable();
    } catch (err) {
      expect(err).toBeInstanceOf(ImportError);
      expect((err as ImportError).reason).toBe('unsupportedVersion');
    }
  });
});
