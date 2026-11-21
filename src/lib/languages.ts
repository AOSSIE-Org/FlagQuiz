/** The languages of the app. */

export interface Language {
  /** BCP 47 language code, used for messages, Intl and the `lang` attribute. */
  code: LanguageCode;
  /** The language's name in itself. */
  name: string;
  /** Preferred text-to-speech locale. */
  speech: string;
  dir: 'ltr' | 'rtl';
}

/** The ten most spoken languages in the world (total speakers, Ethnologue). */
export const LANGUAGES = [
  { code: 'en', name: 'English', speech: 'en-US', dir: 'ltr' },
  { code: 'zh', name: '中文', speech: 'zh-CN', dir: 'ltr' },
  { code: 'hi', name: 'हिन्दी', speech: 'hi-IN', dir: 'ltr' },
  { code: 'es', name: 'Español', speech: 'es-ES', dir: 'ltr' },
  { code: 'ar', name: 'العربية', speech: 'ar-SA', dir: 'rtl' },
  { code: 'fr', name: 'Français', speech: 'fr-FR', dir: 'ltr' },
  { code: 'bn', name: 'বাংলা', speech: 'bn-IN', dir: 'ltr' },
  { code: 'pt', name: 'Português', speech: 'pt-BR', dir: 'ltr' },
  { code: 'ru', name: 'Русский', speech: 'ru-RU', dir: 'ltr' },
  { code: 'ur', name: 'اردو', speech: 'ur-PK', dir: 'rtl' },
] as const satisfies readonly (Omit<Language, 'code'> & { code: string })[];

export type LanguageCode = (typeof LANGUAGES)[number]['code'];
export const DEFAULT_LANGUAGE: LanguageCode = 'en';

export function isLanguage(code: unknown): code is LanguageCode {
  return LANGUAGES.some((l) => l.code === code);
}
