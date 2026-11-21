#!/usr/bin/env node
/**
 * Builds the names of countries, capitals and continents in every language of
 * the app (src/locales/names/<lang>.json):
 *   - countries and continents: the Unicode CLDR names shipped with Node's ICU
 *     (the same data browsers use for Intl.DisplayNames), with a few
 *     child-friendly overrides where CLDR uses technical or abbreviated forms;
 *   - capitals: Wikidata labels (CC0) of the capital items used by the games,
 *     falling back to English when a language has no label.
 * English uses the curated names of src/data/countries.ts and capitals.ts.
 *
 * Usage: npm run fetch-names (after fetch-countries / fetch-capitals)
 */
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT_DIR = join(ROOT, 'src', 'locales', 'names');
const UA = 'FlagQuizDataBuilder/1.0 (https://github.com/AOSSIE-Org/FlagQuiz)';

/** Must match LANGUAGES in src/lib/i18n.svelte.ts. */
const LANGS = ['en', 'zh', 'hi', 'es', 'ar', 'fr', 'bn', 'pt', 'ru', 'ur'];

/** Continent codes of the app → UN M.49 / CLDR region codes. */
const CONTINENT_REGIONS = { AF: '002', AS: '142', EU: '150', NA: '003', SA: '005', OC: '009', AN: 'AQ' };

/** Capital items pinned by fetch-capitals.mjs (see CAPITAL_ITEM there). */
const CAPITAL_ITEM = { NI: 'Q3274', GQ: 'Q3818' };

/** Where CLDR names are technical ("Congo - Kinshasa", "SAR China", …), simpler names for children. */
const COUNTRY_OVERRIDES = {
  zh: { HK: '中国香港', MO: '中国澳门', PS: '巴勒斯坦', GS: '南乔治亚' },
  hi: {
    CD: 'कांगो लोकतांत्रिक गणराज्य',
    CG: 'कांगो गणराज्य',
    HK: 'हाँग काँग',
    MO: 'मकाऊ',
    PS: 'फ़िलिस्तीन',
    GS: 'दक्षिण जॉर्जिया',
  },
  es: { CG: 'República del Congo', HK: 'Hong Kong', MO: 'Macao', PS: 'Palestina', GS: 'Georgia del Sur' },
  ar: {
    CD: 'جمهورية الكونغو الديمقراطية',
    CG: 'جمهورية الكونغو',
    HK: 'هونغ كونغ',
    TL: 'تيمور الشرقية',
    PS: 'فلسطين',
    GS: 'جورجيا الجنوبية',
  },
  fr: { CD: 'République démocratique du Congo', CG: 'République du Congo', PS: 'Palestine', GS: 'Géorgie du Sud' },
  bn: {
    CD: 'গণতান্ত্রিক কঙ্গো প্রজাতন্ত্র',
    CG: 'কঙ্গো প্রজাতন্ত্র',
    PS: 'ফিলিস্তিন',
    GS: 'দক্ষিণ জর্জিয়া',
  },
  pt: { CD: 'República Democrática do Congo', HK: 'Hong Kong', MO: 'Macau', PS: 'Palestina', GS: 'Geórgia do Sul' },
  ru: {
    CD: 'Демократическая Республика Конго',
    CG: 'Республика Конго',
    HK: 'Гонконг',
    MO: 'Макао',
    PS: 'Палестина',
    GS: 'Южная Георгия',
  },
  ur: {
    CD: 'عوامی جمہوریہ کانگو',
    CG: 'جمہوریہ کانگو',
    HK: 'ہانگ کانگ',
    MO: 'مکاؤ',
    PS: 'فلسطین',
    GS: 'جنوبی جارجیا',
  },
};

/** CLDR abbreviations that children wouldn't understand. */
function expand(lang, name) {
  if (lang === 'ru') return name.replace(/\bо-ва\b/g, 'острова').replace(/\bо-в\b/g, 'остров');
  return name;
}

/** Wikidata labels to query per language, best first (Simplified Chinese before generic Chinese). */
const LABEL_LANGS = { zh: ['zh-hans', 'zh-cn', 'zh'] };
const labelLangs = (lang) => LABEL_LANGS[lang] ?? [lang];

/** Capital names where Wikidata's label is a district, a different city or a mistranslation. */
const CAPITAL_OVERRIDES = {
  zh: { NR: '亚伦', JP: '东京', US: '华盛顿' },
  hi: { NR: 'यारेन', AG: 'सेंट जॉन्स' },
  ar: { NR: 'يارين' },
  bn: { NR: 'ইয়ারেন' },
  es: { AG: "Saint John's" },
  pt: { AG: "Saint John's" },
};

/** Tidies a Wikidata label: no disambiguation suffixes ("Stanley, Falkland Islands", "Paris (ville)"). */
function tidyCapital(lang, label) {
  let name = label.replace(/\s*\(.*\)$/, '');
  if (!/D\.\s?C\./.test(name)) name = name.replace(/,\s*[^,]+$/, '');
  // Chinese labels often end in 市 ("city"), which children don't say.
  if (lang === 'zh' && name.length > 2) name = name.replace(/市$/, '');
  return name;
}

/** Removes explanatory parentheses, e.g. "Myanmar (Burma)" → "Myanmar". */
const STRIP_PARENS = new Set(['MM', 'CC']);

async function readData(file) {
  const src = await readFile(join(ROOT, 'src', 'data', file), 'utf8');
  return JSON.parse(src.slice(src.indexOf('= [') + 2).replace(/;\s*$/, ''));
}

async function sparql(query) {
  const url = `https://query.wikidata.org/sparql?query=${encodeURIComponent(query)}`;
  for (let attempt = 1; ; attempt++) {
    const res = await fetch(url, { headers: { 'User-Agent': UA, Accept: 'application/sparql-results+json' } });
    if (res.ok) return (await res.json()).results.bindings;
    if (attempt >= 4) throw new Error(`Wikidata: HTTP ${res.status}`);
    await new Promise((r) => setTimeout(r, 3000 * attempt));
  }
}

const countries = await readData('countries.ts');
const capitals = await readData('capitals.ts');

// ------------------------------------------------------------------ capitals

// Candidate capital items of every country (any rank), with coordinates and labels.
const variants = [...new Set(LANGS.flatMap(labelLangs))];
const v = (code) => `?l_${code.replace('-', '_')}`;
const labelVars = variants.map(v).join(' ');
const labelOptionals = variants.map((l) => `OPTIONAL { ?cap rdfs:label ${v(l)} FILTER(LANG(${v(l)}) = "${l}") }`).join('\n  ');
console.log('Querying capital labels…');
const rows = await sparql(`SELECT ?iso ?cap ?coord ${labelVars} WHERE {
  { ?country wdt:P297 ?iso ; p:P36/ps:P36 ?cap . }
  UNION { VALUES (?iso ?cap) { ${Object.entries(CAPITAL_ITEM).map(([iso, q]) => `("${iso}" wd:${q})`).join(' ')} } }
  ?cap wdt:P625 ?coord .
  ${labelOptionals}
}`);

/** Distance in km between two points. */
function km(lat1, lon1, lat2, lon2) {
  const rad = Math.PI / 180;
  const a =
    Math.sin(((lat2 - lat1) * rad) / 2) ** 2 +
    Math.cos(lat1 * rad) * Math.cos(lat2 * rad) * Math.sin(((lon2 - lon1) * rad) / 2) ** 2;
  return 12742 * Math.asin(Math.sqrt(a));
}

// The capital item of each country is the candidate closest to the capital's coordinates.
const capitalLabels = new Map();
for (const capital of capitals) {
  let best = null;
  for (const r of rows) {
    if (r.iso.value !== capital.code) continue;
    const m = r.coord.value.match(/Point\(([-\d.e]+) ([-\d.e]+)\)/);
    if (!m) continue;
    const d = km(capital.lat, capital.lon, Number(m[2]), Number(m[1]));
    if (!best || d < best.d) best = { d, r };
  }
  if (!best || best.d > 5) {
    console.warn(`  ${capital.code} ${capital.name}: no matching Wikidata item; English name used`);
    continue;
  }
  capitalLabels.set(
    capital.code,
    Object.fromEntries(LANGS.map((l) => [l, labelLangs(l).map((x) => best.r[v(x).slice(1)]?.value).find(Boolean)])),
  );
}

// ------------------------------------------------------------------- output

await mkdir(OUT_DIR, { recursive: true });
for (const lang of LANGS) {
  const regions = new Intl.DisplayNames([lang], { type: 'region' });
  const countryNames = {};
  for (const c of countries) {
    let name = c.name;
    if (lang !== 'en') {
      name = COUNTRY_OVERRIDES[lang]?.[c.code] ?? expand(lang, regions.of(c.code));
      if (STRIP_PARENS.has(c.code)) name = name.replace(/\s*[(（].*?[)）]\s*/g, ' ').trim();
    }
    countryNames[c.code] = name;
  }
  const capitalNames = {};
  let missing = 0;
  for (const c of capitals) {
    const label = lang === 'en' ? c.name : capitalLabels.get(c.code)?.[lang];
    if (!label) missing++;
    capitalNames[c.code] =
      CAPITAL_OVERRIDES[lang]?.[c.code] ?? (label && lang !== 'en' ? tidyCapital(lang, label) : c.name);
  }
  const continents = Object.fromEntries(
    Object.entries(CONTINENT_REGIONS).map(([k, region]) => [k, regions.of(region)]),
  );
  const data = { countries: countryNames, capitals: capitalNames, continents };
  await writeFile(join(OUT_DIR, `${lang}.json`), `${JSON.stringify(data, null, 1)}\n`);
  console.log(`${lang}: ${countries.length} countries, ${capitals.length} capitals (${missing} in English)`);
}
