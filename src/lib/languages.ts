/** The languages of the app. */

export interface Language {
  /** BCP 47 language code, used for messages, Intl and the `lang` attribute. */
  code: LanguageCode;
  /** The language's name in itself. */
  name: string;
  /** The language's name in English. */
  english: string;
  /** Preferred text-to-speech locale. */
  speech: string;
  dir: 'ltr' | 'rtl';
}

/**
 * The most spoken languages in the world (Ethnologue 2026, total speakers), as
 * long as browsers have a text-to-speech voice for them and the Unicode CLDR
 * has names of countries in them. Arabic dialects use Modern Standard Arabic.
 */
export const LANGUAGES = [
  { code: 'en', name: 'English', english: 'English', speech: 'en-US', dir: 'ltr' },
  { code: 'zh', name: '中文', english: 'Chinese (Mandarin)', speech: 'zh-CN', dir: 'ltr' },
  { code: 'hi', name: 'हिन्दी', english: 'Hindi', speech: 'hi-IN', dir: 'ltr' },
  { code: 'es', name: 'Español', english: 'Spanish', speech: 'es-ES', dir: 'ltr' },
  { code: 'ar', name: 'العربية', english: 'Arabic', speech: 'ar-SA', dir: 'rtl' },
  { code: 'fr', name: 'Français', english: 'French', speech: 'fr-FR', dir: 'ltr' },
  { code: 'bn', name: 'বাংলা', english: 'Bengali', speech: 'bn-IN', dir: 'ltr' },
  { code: 'pt', name: 'Português', english: 'Portuguese', speech: 'pt-BR', dir: 'ltr' },
  { code: 'id', name: 'Bahasa Indonesia', english: 'Indonesian', speech: 'id-ID', dir: 'ltr' },
  { code: 'ur', name: 'اردو', english: 'Urdu', speech: 'ur-PK', dir: 'rtl' },
  { code: 'ru', name: 'Русский', english: 'Russian', speech: 'ru-RU', dir: 'ltr' },
  { code: 'de', name: 'Deutsch', english: 'German', speech: 'de-DE', dir: 'ltr' },
  { code: 'ja', name: '日本語', english: 'Japanese', speech: 'ja-JP', dir: 'ltr' },
  { code: 'mr', name: 'मराठी', english: 'Marathi', speech: 'mr-IN', dir: 'ltr' },
  { code: 'vi', name: 'Tiếng Việt', english: 'Vietnamese', speech: 'vi-VN', dir: 'ltr' },
  { code: 'te', name: 'తెలుగు', english: 'Telugu', speech: 'te-IN', dir: 'ltr' },
  { code: 'sw', name: 'Kiswahili', english: 'Swahili', speech: 'sw-KE', dir: 'ltr' },
  { code: 'tr', name: 'Türkçe', english: 'Turkish', speech: 'tr-TR', dir: 'ltr' },
  { code: 'fil', name: 'Filipino', english: 'Filipino', speech: 'fil-PH', dir: 'ltr' },
  { code: 'ta', name: 'தமிழ்', english: 'Tamil', speech: 'ta-IN', dir: 'ltr' },
  { code: 'yue', name: '粵語', english: 'Cantonese', speech: 'zh-HK', dir: 'ltr' },
  { code: 'fa', name: 'فارسی', english: 'Persian', speech: 'fa-IR', dir: 'rtl' },
  { code: 'ko', name: '한국어', english: 'Korean', speech: 'ko-KR', dir: 'ltr' },
  { code: 'am', name: 'አማርኛ', english: 'Amharic', speech: 'am-ET', dir: 'ltr' },
  { code: 'th', name: 'ไทย', english: 'Thai', speech: 'th-TH', dir: 'ltr' },
  { code: 'jv', name: 'Basa Jawa', english: 'Javanese', speech: 'jv-ID', dir: 'ltr' },
  { code: 'it', name: 'Italiano', english: 'Italian', speech: 'it-IT', dir: 'ltr' },
  { code: 'gu', name: 'ગુજરાતી', english: 'Gujarati', speech: 'gu-IN', dir: 'ltr' },
  { code: 'kn', name: 'ಕನ್ನಡ', english: 'Kannada', speech: 'kn-IN', dir: 'ltr' },
] as const satisfies readonly (Omit<Language, 'code'> & { code: string })[];

export type LanguageCode = (typeof LANGUAGES)[number]['code'];
export const DEFAULT_LANGUAGE: LanguageCode = 'en';

export function isLanguage(code: unknown): code is LanguageCode {
  return LANGUAGES.some((l) => l.code === code);
}

/**
 * Order of the language picker: English first, then the others in
 * alphabetical order of their own names (Latin script first, then the
 * other scripts, as the Unicode collation orders them).
 */
export function pickerOrder<T extends { code: string; name: string }>(languages: readonly T[]): T[] {
  const collator = new Intl.Collator('en');
  return [...languages].sort((a, b) =>
    a.code === 'en' ? -1 : b.code === 'en' ? 1 : collator.compare(a.name, b.name),
  );
}
