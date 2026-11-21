import { openDB, type DBSchema, type IDBPDatabase } from 'idb';
import { isLanguage } from './languages';
import type { ReminderConfig } from './reminders';
import { migrateLegacyScores } from './scores';
import { DEFAULT_SETTINGS, GAMES, perGame, type GameId, type ItemStats, type Settings, type StatRecord, type User } from './types';

interface FlagQuizDB extends DBSchema {
  users: { key: number; value: User };
  stats: {
    key: [number, GameId, string];
    value: StatRecord;
    indexes: { byUserGame: [number, GameId]; byUser: number };
  };
  playDays: {
    key: [number, string];
    value: { userId: number; date: string };
    indexes: { byUser: number };
  };
  /**
   * Device-wide preferences, under the key "settings"; under "reminder", what
   * the service worker needs for the daily reminder (public/sw-reminder.js).
   */
  settings: { key: string; value: Settings | ReminderConfig };
}

export type DB = IDBPDatabase<FlagQuizDB>;

export const DB_NAME = 'flag-quiz';
/**
 * Version history:
 * 1. users, stats (counts), playDays
 * 2. stats get a difficulty score
 * 3. settings
 * 4. users: per-game scores instead of one run of rounds without mistakes
 */
export const DB_VERSION = 4;
const SETTINGS_KEY = 'settings';

/** What to do when other open copies of the app get in the way of each other. */
export interface OpenEvents {
  /** An older copy, open in another tab or window, prevents the upgrade; it continues once that copy closes. */
  blocked?: () => void;
  /** A newer copy wants to upgrade the data: this connection has been closed and must not be used. */
  blocking?: () => void;
}

/**
 * Opens (and if needed upgrades) the database. Rejects with a `VersionError`
 * DOMException when the data was saved by a newer version of the app.
 */
export function openDatabase(name: string = DB_NAME, events: OpenEvents = {}): Promise<DB> {
  let db: DB | undefined;
  const opening = openDB<FlagQuizDB>(name, DB_VERSION, {
    blocked: () => events.blocked?.(),
    blocking: () => {
      db?.close();
      events.blocking?.();
    },
    async upgrade(db, oldVersion, _newVersion, tx) {
      if (oldVersion < 1) {
        db.createObjectStore('users', { keyPath: 'id', autoIncrement: true });
        const stats = db.createObjectStore('stats', { keyPath: ['userId', 'game', 'code'] });
        stats.createIndex('byUserGame', ['userId', 'game']);
        stats.createIndex('byUser', 'userId');
        const days = db.createObjectStore('playDays', { keyPath: ['userId', 'date'] });
        days.createIndex('byUser', 'userId');
      }
      if (oldVersion === 1) {
        // v1 stored only counts; approximate the new difficulty score from them.
        let cursor = await tx.objectStore('stats').openCursor();
        while (cursor) {
          const { c, d } = cursor.value;
          await cursor.update({ ...cursor.value, s: (d + 1) / (c + d + 2) });
          cursor = await cursor.continue();
        }
      }
      if (oldVersion < 3) {
        db.createObjectStore('settings');
      }
      if (oldVersion >= 1 && oldVersion < 4) {
        const stats = tx.objectStore('stats');
        let cursor = await tx.objectStore('users').openCursor();
        while (cursor) {
          const legacy = cursor.value as User & { perfectRun?: number; bestPerfectRun?: number };
          const rows = await stats.index('byUser').getAll(legacy.id!);
          const byGame = perGame(() => [] as ItemStats[]);
          for (const r of rows) if (GAMES.includes(r.game)) byGame[r.game].push(r);
          const { perfectRun: _run, bestPerfectRun: _best, ...user } = legacy;
          await cursor.update({ ...user, scores: migrateLegacyScores(legacy, byGame) });
          cursor = await cursor.continue();
        }
      }
    },
  });
  return opening.then((opened) => (db = opened));
}

/** Users, most recently active first. */
export async function listUsers(db: DB): Promise<User[]> {
  const users = await db.getAll('users');
  return users.sort((a, b) => b.lastActiveAt - a.lastActiveAt);
}

/** Inserts or updates a user and returns it with its id. */
export async function saveUser(db: DB, user: User): Promise<User> {
  const copy = structuredClone(user);
  if (copy.id === undefined) delete copy.id;
  const id = await db.put('users', copy);
  return { ...copy, id };
}

export async function getStats(db: DB, userId: number, game: GameId): Promise<Map<string, ItemStats>> {
  const rows = await db.getAllFromIndex('stats', 'byUserGame', [userId, game]);
  return new Map(rows.map((r) => [r.code, { s: r.s, c: r.c, d: r.d }]));
}

export async function getAllStats(db: DB, userId: number): Promise<StatRecord[]> {
  return db.getAllFromIndex('stats', 'byUser', userId);
}

export async function putStat(db: DB, record: StatRecord): Promise<void> {
  await db.put('stats', { ...record });
}

export async function addPlayDay(db: DB, userId: number, date: string): Promise<void> {
  await db.put('playDays', { userId, date });
}

export async function getPlayDays(db: DB, userId: number): Promise<string[]> {
  const rows = await db.getAllFromIndex('playDays', 'byUser', userId);
  return rows.map((r) => r.date).sort();
}

/** Creates a new user together with its statistics and play days, atomically. */
export async function insertUserWithData(
  db: DB,
  user: User,
  stats: Omit<StatRecord, 'userId'>[],
  playDays: string[],
): Promise<User> {
  const tx = db.transaction(['users', 'stats', 'playDays'], 'readwrite');
  const copy = structuredClone(user);
  delete copy.id;
  const id = await tx.objectStore('users').add(copy);
  await Promise.all([
    ...stats.map((r) => tx.objectStore('stats').put({ ...r, userId: id })),
    ...playDays.map((date) => tx.objectStore('playDays').put({ userId: id, date })),
  ]);
  await tx.done;
  return { ...copy, id };
}

/** Deletes a user with all their statistics and play days, atomically. */
export async function deleteUserWithData(db: DB, userId: number): Promise<void> {
  const tx = db.transaction(['users', 'stats', 'playDays'], 'readwrite');
  const statKeys = await tx.objectStore('stats').index('byUser').getAllKeys(userId);
  const dayKeys = await tx.objectStore('playDays').index('byUser').getAllKeys(userId);
  await Promise.all([
    tx.objectStore('users').delete(userId),
    ...statKeys.map((k) => tx.objectStore('stats').delete(k)),
    ...dayKeys.map((k) => tx.objectStore('playDays').delete(k)),
  ]);
  await tx.done;
}

export async function getSettings(db: DB): Promise<Settings> {
  const settings = { ...DEFAULT_SETTINGS, ...(((await db.get('settings', SETTINGS_KEY)) as Settings | undefined) ?? {}) };
  if (typeof settings.reminders !== 'boolean') settings.reminders = false;
  if (!isLanguage(settings.language)) settings.language = DEFAULT_SETTINGS.language;
  return settings;
}

/** Writes what the service worker needs for the daily reminder, keeping the day it was last shown. */
export async function saveReminder(db: DB, config: Omit<ReminderConfig, 'lastShown'>): Promise<void> {
  const previous = (await db.get('settings', 'reminder')) as ReminderConfig | undefined;
  await db.put('settings', { ...config, lastShown: previous?.lastShown }, 'reminder');
}

export async function saveSettings(db: DB, settings: Settings): Promise<void> {
  await db.put('settings', { ...settings }, SETTINGS_KEY);
}
