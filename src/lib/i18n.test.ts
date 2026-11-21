import { describe, expect, it } from 'vitest';
import { CAPITALS } from '../data/capitals';
import { COUNTRIES } from '../data/countries';
import en from '../locales/en';
import { capitalName, countryName, format, LANGUAGES, setLanguage, t } from './i18n.svelte';
import { CONTINENTS } from './types';

const messages = import.meta.glob<{ default: Record<string, string> }>('../locales/*.ts', { eager: true });
const names = import.meta.glob<{ default: Record<string, Record<string, string>> }>('../locales/names/*.json', {
  eager: true,
});
const placeholders = (s: string) => [...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort();

describe('translations', () => {
  it.each(LANGUAGES.map((l) => l.code))('%s has every message, with the same placeholders', (code) => {
    const m = messages[`../locales/${code}.ts`]?.default;
    expect(m).toBeDefined();
    expect(Object.keys(m).sort()).toEqual(Object.keys(en).sort());
    for (const [key, text] of Object.entries(en)) {
      expect(text.length > 0 && m[key].trim().length > 0, key).toBe(true);
      expect(placeholders(m[key]), `${code}: ${key}`).toEqual(placeholders(text));
    }
  });

  it.each(LANGUAGES.map((l) => l.code))('%s names every country, capital and continent', (code) => {
    const n = names[`../locales/names/${code}.json`]?.default;
    expect(n).toBeDefined();
    for (const c of COUNTRIES) expect(n.countries[c.code], c.code).toBeTruthy();
    for (const c of CAPITALS) expect(n.capitals[c.code], c.code).toBeTruthy();
    for (const k of CONTINENTS) expect(n.continents[k], k).toBeTruthy();
  });
});

describe('i18n', () => {
  it('formats placeholders and leaves unknown ones', () => {
    expect(format('{a} and {b}', { a: 'x' })).toBe('x and {b}');
  });

  it('switches language, direction and names', async () => {
    // A minimal document: the tests run in Node.
    const root = { lang: '', dir: '' };
    globalThis.document ??= { documentElement: root } as unknown as Document;
    await setLanguage('fr');
    expect(t('close')).toBe('Fermer');
    expect(countryName('DE')).toBe('Allemagne');
    expect(capitalName('GB')).toBe('Londres');
    expect(document.documentElement.lang).toBe('fr');
    await setLanguage('ar');
    expect(document.documentElement.dir).toBe('rtl');
    await setLanguage('en');
    expect(t('close')).toBe('Close');
    expect(countryName('CI')).toBe('Ivory Coast');
    expect(document.documentElement.dir).toBe('ltr');
  });
});
