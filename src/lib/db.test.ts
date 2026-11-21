import 'fake-indexeddb/auto';
import { openDB } from 'idb';
import { describe, expect, it } from 'vitest';
import {
  addPlayDay,
  getAllStats,
  getPlayDays,
  getStats,
  insertUserWithData,
  listUsers,
  openDatabase,
  putStat,
  saveUser,
} from './db';
import { emptyScores } from './scores';
import { DEFAULT_FILTER, type User } from './types';

let n = 0;
const freshName = () => `test-${++n}`;
const fresh = () => openDatabase(freshName());

function user(name: string, lastActiveAt: number): User {
  return {
    name,
    flag: { colors: ['#E4002B', '#FFFFFF', '#0032A0'], pattern: 'vbands' },
    difficulty: 'easy',
    theme: 'light',
    adapt: { flag: 1, country: 1, location: 1, capital: 1, capitalCountry: 1 },
    scores: emptyScores(),
    correctCount: 0,
    filter: structuredClone(DEFAULT_FILTER),
    createdAt: lastActiveAt,
    lastActiveAt,
  };
}

describe('users', () => {
  it('creates, updates and lists users by recent activity', async () => {
    const db = await fresh();
    const a = await saveUser(db, user('Ana', 1));
    const b = await saveUser(db, user('Ben', 2));
    expect(a.id).toBeTypeOf('number');
    expect((await listUsers(db)).map((u) => u.name)).toEqual(['Ben', 'Ana']);

    await saveUser(db, { ...a, name: 'Ana Maria', lastActiveAt: 3 });
    const users = await listUsers(db);
    expect(users).toHaveLength(2);
    expect(users[0]).toMatchObject({ id: a.id, name: 'Ana Maria' });
    expect(users[1].id).toBe(b.id);
  });

  it('inserts a user with statistics and play days', async () => {
    const db = await fresh();
    await saveUser(db, user('Existing', 1));
    const created = await insertUserWithData(
      db,
      { ...user('Imported', 2), id: 999 },
      [{ game: 'flag', code: 'FR', s: 0.1, c: 9, d: 0 }],
      ['2026-11-19', '2026-11-20'],
    );
    expect(created.id).not.toBe(999);
    expect((await getStats(db, created.id!, 'flag')).get('FR')).toEqual({ s: 0.1, c: 9, d: 0 });
    expect(await getPlayDays(db, created.id!)).toEqual(['2026-11-19', '2026-11-20']);
  });
});

describe('stats', () => {
  it('stores per user, game and country', async () => {
    const db = await fresh();
    await putStat(db, { userId: 1, game: 'flag', code: 'FR', s: 0.45, c: 1, d: 0 });
    await putStat(db, { userId: 1, game: 'flag', code: 'FR', s: 0.505, c: 1, d: 1 });
    await putStat(db, { userId: 1, game: 'country', code: 'FR', s: 0.55, c: 0, d: 1 });
    await putStat(db, { userId: 2, game: 'flag', code: 'FR', s: 0.45, c: 1, d: 0 });

    expect((await getStats(db, 1, 'flag')).get('FR')).toEqual({ s: 0.505, c: 1, d: 1 });
    expect((await getStats(db, 1, 'country')).get('FR')).toEqual({ s: 0.55, c: 0, d: 1 });
    expect(await getAllStats(db, 1)).toHaveLength(2);
  });

  it('migrates version 1 counts to difficulty scores', async () => {
    const name = freshName();
    const v1 = await openDB(name, 1, {
      upgrade(db) {
        db.createObjectStore('users', { keyPath: 'id', autoIncrement: true });
        const stats = db.createObjectStore('stats', { keyPath: ['userId', 'game', 'code'] });
        stats.createIndex('byUserGame', ['userId', 'game']);
        stats.createIndex('byUser', 'userId');
        const days = db.createObjectStore('playDays', { keyPath: ['userId', 'date'] });
        days.createIndex('byUser', 'userId');
      },
    });
    await v1.put('stats', { userId: 1, game: 'flag', code: 'FR', c: 2, d: 0 });
    v1.close();

    const db = await openDatabase(name);
    expect((await getStats(db, 1, 'flag')).get('FR')).toEqual({ s: 0.25, c: 2, d: 0 });
  });

  it('migrates version 3 players to per-game scores', async () => {
    const name = freshName();
    const v3 = await openDB(name, 3, {
      upgrade(db) {
        db.createObjectStore('users', { keyPath: 'id', autoIncrement: true });
        const stats = db.createObjectStore('stats', { keyPath: ['userId', 'game', 'code'] });
        stats.createIndex('byUserGame', ['userId', 'game']);
        stats.createIndex('byUser', 'userId');
        const days = db.createObjectStore('playDays', { keyPath: ['userId', 'date'] });
        days.createIndex('byUser', 'userId');
        db.createObjectStore('settings');
      },
    });
    const { scores: _scores, ...legacy } = user('Old', 1);
    await v3.put('users', { ...legacy, id: 1, perfectRun: 4, bestPerfectRun: 9 });
    await v3.put('stats', { userId: 1, game: 'flag', code: 'FR', s: 0.2, c: 3, d: 1 });
    await v3.put('stats', { userId: 1, game: 'capital', code: 'FR', s: 0.2, c: 5, d: 2 });
    v3.close();

    const db = await openDatabase(name);
    const [migrated] = await listUsers(db);
    expect(migrated).not.toHaveProperty('perfectRun');
    expect(migrated.scores.flag).toEqual({ correct: 3, gold: 0, bestGold: 0, silver: 0, bestSilver: 0 });
    expect(migrated.scores.capital).toEqual({ correct: 5, gold: 4, bestGold: 9, silver: 4, bestSilver: 9 });
  });
});

describe('play days', () => {
  it('stores each day once per user, sorted', async () => {
    const db = await fresh();
    await addPlayDay(db, 1, '2026-11-20');
    await addPlayDay(db, 1, '2026-11-19');
    await addPlayDay(db, 1, '2026-11-20');
    await addPlayDay(db, 2, '2026-11-18');
    expect(await getPlayDays(db, 1)).toEqual(['2026-11-19', '2026-11-20']);
  });
});

describe('several copies of the app', () => {
  it('steps aside when a newer version needs to upgrade', async () => {
    const name = freshName();
    let blocking = 0;
    await openDatabase(name, { blocking: () => blocking++ });
    // A newer version of the app opens the same data.
    const newer = await openDB(name, 99);
    expect(blocking).toBe(1);
    expect(newer.version).toBe(99);
    newer.close();
  });

  it('reports that the data was saved by a newer version', async () => {
    const name = freshName();
    (await openDB(name, 99)).close();
    await expect(openDatabase(name)).rejects.toMatchObject({ name: 'VersionError' });
  });

  it('waits for an older copy to close before upgrading', async () => {
    const name = freshName();
    const older = await openDB(name, 3, {
      upgrade(db) {
        db.createObjectStore('users', { keyPath: 'id', autoIncrement: true });
        const stats = db.createObjectStore('stats', { keyPath: ['userId', 'game', 'code'] });
        stats.createIndex('byUserGame', ['userId', 'game']);
        stats.createIndex('byUser', 'userId');
        const days = db.createObjectStore('playDays', { keyPath: ['userId', 'date'] });
        days.createIndex('byUser', 'userId');
        db.createObjectStore('settings');
      },
    });
    let blocked = 0;
    const opening = openDatabase(name, { blocked: () => blocked++ });
    await new Promise((r) => setTimeout(r, 20));
    expect(blocked).toBe(1);
    older.close();
    const db = await opening;
    expect(db.version).toBeGreaterThan(3);
    db.close();
  });
});
