/**
 * Internationalisation.
 *
 * - UI messages live in src/locales/<lang>.ts, keyed like src/locales/en.ts
 *   (the source of truth); missing keys fall back to English.
 * - Country, capital and continent names live in src/locales/names/<lang>.json,
 *   generated from CLDR and Wikidata by scripts/fetch-names.mjs.
 * - Languages other than English are loaded on demand (and precached by the
 *   service worker, so they work offline).
 * - The document's `lang` and `dir` follow the language, so browsers pick the
 *   right fonts, hyphenation and right-to-left layout; text-to-speech uses a
 *   voice for the language.
 */
import { LANGUAGES, DEFAULT_LANGUAGE, type LanguageCode } from './languages';
import { setSpeechLanguage } from './speech';
import en, { type MessageKey, type Messages } from '../locales/en';
import enNames from '../locales/names/en.json';

export type { MessageKey };
export { LANGUAGES, DEFAULT_LANGUAGE, isLanguage, type Language, type LanguageCode } from './languages';

export interface Names {
  countries: Record<string, string>;
  capitals: Record<string, string>;
  continents: Record<string, string>;
}

const messageLoaders = import.meta.glob<{ default: Messages }>(['../locales/*.ts', '!../locales/en.ts']);
const nameLoaders = import.meta.glob<{ default: Names }>(['../locales/names/*.json', '!../locales/names/en.json']);

class I18n {
  lang = $state<LanguageCode>(DEFAULT_LANGUAGE);
  messages = $state.raw<Messages>(en);
  names = $state.raw<Names>(enNames);
  numbers = $derived(new Intl.NumberFormat(this.lang));
  collator = $derived(new Intl.Collator(this.lang));
}

export const i18n = new I18n();

/** Loads a language and makes it the current one. */
export async function setLanguage(code: LanguageCode): Promise<void> {
  const lang = LANGUAGES.find((l) => l.code === code) ?? LANGUAGES[0];
  let messages: Messages = en;
  let names: Names = enNames;
  if (lang.code !== 'en') {
    const [m, n] = await Promise.all([
      messageLoaders[`../locales/${lang.code}.ts`]?.(),
      nameLoaders[`../locales/names/${lang.code}.json`]?.(),
    ]);
    messages = { ...en, ...m?.default };
    names = n?.default ?? enNames;
  }
  i18n.messages = messages;
  i18n.names = names;
  i18n.lang = lang.code;
  setSpeechLanguage(lang.speech);
  if (typeof document !== 'undefined') {
    document.documentElement.lang = lang.code;
    document.documentElement.dir = lang.dir;
  }
}

/** Replaces {placeholders} in a message. */
export function format(message: string, params?: Record<string, string | number>): string {
  if (!params) return message;
  return message.replace(/\{(\w+)\}/g, (match, key: string) =>
    key in params ? String(typeof params[key] === 'number' ? num(params[key]) : params[key]) : match,
  );
}

/** The message `key` in the current language. */
export function t(key: MessageKey, params?: Record<string, string | number>): string {
  return format(i18n.messages[key] ?? en[key], params);
}

/** A number written the way the current language writes numbers. */
export function num(n: number): string {
  return i18n.numbers.format(n);
}

export function countryName(code: string): string {
  return i18n.names.countries[code] ?? enNames.countries[code as keyof typeof enNames.countries] ?? code;
}

export function capitalName(code: string): string {
  return i18n.names.capitals[code] ?? enNames.capitals[code as keyof typeof enNames.capitals] ?? code;
}

export function continentName(code: string): string {
  return i18n.names.continents[code] ?? code;
}
