/**
 * Saved data from every earlier version must keep working.
 *
 * src/lib/fixtures/ holds data saved by each version of the database
 * (db-v<N>.json) and of the export files (export-v<N>*.json, backup-v<N>.json).
 * Whenever the saved data changes, add a fixture of the previous version
 * (ideally recorded from the deployed app) before bumping the version: the
 * last test fails until every version has one.
 */
import 'fake-indexeddb/auto';
import { openDB } from 'idb';
import { describe, expect, it } from 'vitest';
import { COUNTRIES } from '../data/countries';
import { DB_VERSION, getPlayDays, getSettings, getStats, listUsers, openDatabase } from './db';
import { BACKUP_VERSION, EXPORT_VERSION, parseImportFile } from './transfer';
import { GAMES, type User } from './types';
import { withDefaults } from './users';

interface DbFixture {
  dbVersion: number;
  stores: { users: object[]; stats: object[]; playDays: object[]; settings?: object };
  expected: {
    users: Partial<User>[];
    stats: { userId: number; game: string; code: string; s: number; c: number; d: number }[];
    playDays: Record<string, string[]>;
    settings?: object;
  };
}
interface FileFixture {
  file: unknown;
  expected: Partial<User>[];
  statCount: number;
}

const dbFixtures = import.meta.glob<DbFixture>('./fixtures/db-v*.json', { eager: true, import: 'default' });
const fileFixtures = import.meta.glob<FileFixture>(['./fixtures/export-v*.json', './fixtures/backup-v*.json'], {
  eager: true,
  import: 'default',
});
const KNOWN = new Set(COUNTRIES.map((c) => c.code));

/** Creates a database as the given old version of the app did, with the fixture's data. */
async function createOldDatabase(name: string, fx: DbFixture): Promise<void> {
  const db = await openDB(name, fx.dbVersion, {
    upgrade(db) {
      db.createObjectStore('users', { keyPath: 'id', autoIncrement: true });
      const stats = db.createObjectStore('stats', { keyPath: ['userId', 'game', 'code'] });
      stats.createIndex('byUserGame', ['userId', 'game']);
      stats.createIndex('byUser', 'userId');
      const days = db.createObjectStore('playDays', { keyPath: ['userId', 'date'] });
      days.createIndex('byUser', 'userId');
      if (fx.dbVersion >= 3) db.createObjectStore('settings');
    },
  });
  for (const u of fx.stores.users) await db.put('users', u);
  for (const s of fx.stores.stats) await db.put('stats', s);
  for (const d of fx.stores.playDays) await db.put('playDays', d);
  if (fx.stores.settings) await db.put('settings', fx.stores.settings, 'settings');
  db.close();
}

/** A player as the current app expects it. */
function expectComplete(u: User) {
  expect(u).not.toHaveProperty('perfectRun');
  expect(u).not.toHaveProperty('bestPerfectRun');
  expect(u.correctCount).toBeTypeOf('number');
  expect(u.filter.continents.length).toBeGreaterThan(0);
  for (const g of GAMES) {
    expect(u.adapt[g], g).toBeTypeOf('number');
    expect(Object.keys(u.scores[g]).sort()).toEqual(['bestGold', 'bestSilver', 'correct', 'gold', 'silver']);
  }
}

describe('saved data from earlier versions', () => {
  it.each(Object.entries(dbFixtures))('%s opens with the current version', async (file, fx) => {
    const name = `compat-${file}`;
    await createOldDatabase(name, fx);
    const db = await openDatabase(name);
    const users = (await listUsers(db)).map(withDefaults);
    users.forEach(expectComplete);
    for (const expected of fx.expected.users) {
      expect(users.find((u) => u.name === expected.name), expected.name).toMatchObject(expected);
    }
    for (const s of fx.expected.stats) {
      const got = (await getStats(db, s.userId, s.game as never)).get(s.code);
      expect(got?.s).toBeCloseTo(s.s, 10);
      expect(got).toMatchObject({ c: s.c, d: s.d });
    }
    for (const [id, days] of Object.entries(fx.expected.playDays)) expect(await getPlayDays(db, Number(id))).toEqual(days);
    if (fx.expected.settings) expect(await getSettings(db)).toEqual(fx.expected.settings);
    db.close();
  });

  it.each(Object.entries(fileFixtures))('%s can be imported', (_file, fx) => {
    const players = parseImportFile(JSON.stringify(fx.file), KNOWN);
    players.forEach((p) => expectComplete(withDefaults(p.user)));
    expect(players.map((p) => p.user)).toMatchObject(fx.expected);
    expect(players.reduce((n, p) => n + p.stats.length, 0)).toBe(fx.statCount);
  });

  it('has a fixture for every version', () => {
    const versions = (pattern: RegExp, files: string[]) =>
      [...new Set(files.flatMap((f) => (pattern.exec(f) ? [Number(pattern.exec(f)![1])] : [])))].sort((a, b) => a - b);
    const range = (n: number) => Array.from({ length: n }, (_, i) => i + 1);
    expect(versions(/db-v(\d+)/, Object.keys(dbFixtures))).toEqual(range(DB_VERSION));
    expect(versions(/export-v(\d+)/, Object.keys(fileFixtures))).toEqual(range(EXPORT_VERSION));
    expect(versions(/backup-v(\d+)/, Object.keys(fileFixtures))).toEqual(range(BACKUP_VERSION));
  });
});
