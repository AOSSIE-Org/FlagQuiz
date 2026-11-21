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
 * Needs Node 22.18+ (imports the language list from TypeScript).
 */
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { LANGUAGES } from '../src/lib/languages.ts';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT_DIR = join(ROOT, 'src', 'locales', 'names');
const UA = 'FlagQuizDataBuilder/1.0 (https://github.com/AOSSIE-Org/FlagQuiz)';

const LANGS = LANGUAGES.map((l) => l.code);

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
  id: {"CD": "Republik Demokratik Kongo", "CG": "Republik Kongo", "PS": "Palestina", "GS": "Georgia Selatan"},
  de: {"CD": "Demokratische Republik Kongo", "CG": "Republik Kongo", "PS": "Palästina", "GS": "Südgeorgien"},
  ja: {"CD": "コンゴ民主共和国", "CG": "コンゴ共和国", "HK": "香港", "MO": "マカオ", "PS": "パレスチナ", "GS": "南ジョージア"},
  mr: {"CD": "काँगो लोकशाही प्रजासत्ताक", "CG": "काँगोचे प्रजासत्ताक", "PS": "पॅलेस्टाईन", "GS": "दक्षिण जॉर्जिया"},
  vi: {"CD": "Cộng hòa Dân chủ Congo", "CG": "Cộng hòa Congo", "PS": "Palestine", "GS": "Nam Georgia"},
  te: {"CD": "కాంగో ప్రజాస్వామ్య గణతంత్రం", "CG": "కాంగో గణతంత్రం", "HK": "హాంకాంగ్", "MO": "మకావ్", "PS": "పాలస్తీనా", "GS": "దక్షిణ జార్జియా"},
  sw: {"CD": "Jamhuri ya Kidemokrasia ya Kongo", "CG": "Jamhuri ya Kongo", "HK": "Hong Kong", "MO": "Makau", "PS": "Palestina", "GS": "Georgia Kusini"},
  tr: {"CD": "Demokratik Kongo Cumhuriyeti", "CG": "Kongo Cumhuriyeti", "PS": "Filistin", "GS": "Güney Georgia"},
  fil: {"CD": "Demokratikong Republika ng Congo", "CG": "Republika ng Congo", "HK": "Hong Kong", "MO": "Macau", "PS": "Palestina", "GS": "Timog Georgia"},
  ta: {"CD": "காங்கோ ஜனநாயகக் குடியரசு", "CG": "காங்கோ குடியரசு", "PS": "பாலஸ்தீனம்", "GS": "தெற்கு ஜார்ஜியா"},
  yue: {"CD": "剛果民主共和國", "CG": "剛果共和國", "HK": "香港", "MO": "澳門", "PS": "巴勒斯坦", "GS": "南喬治亞"},
  fa: {"CD": "جمهوری دموکراتیک کنگو", "CG": "جمهوری کنگو", "PS": "فلسطین", "GS": "جورجیای جنوبی"},
  ko: {"HK": "홍콩", "MO": "마카오", "PS": "팔레스타인", "GS": "사우스조지아"},
  am: {"PS": "ፍልስጤም", "GS": "ደቡብ ጆርጂያ"},
  th: {"CD": "สาธารณรัฐประชาธิปไตยคองโก", "CG": "สาธารณรัฐคองโก", "PS": "ปาเลสไตน์", "GS": "เซาท์จอร์เจีย"},
  jv: {"CD": "Républik Démokratik Kongo", "CG": "Républik Kongo", "PS": "Palestina", "GS": "Georgia Kidul"},
  it: {"CD": "Repubblica Democratica del Congo", "CG": "Repubblica del Congo", "PS": "Palestina", "GS": "Georgia del Sud"},
  gu: {"CD": "કોંગો લોકશાહી પ્રજાસત્તાક", "CG": "કોંગો પ્રજાસત્તાક", "HK": "હોંગકોંગ", "MO": "મકાઉ", "PS": "પેલેસ્ટાઇન", "GS": "દક્ષિણ જ્યોર્જિયા"},
  kn: {"CD": "ಕಾಂಗೋ ಪ್ರಜಾಸತ್ತಾತ್ಮಕ ಗಣರಾಜ್ಯ", "CG": "ಕಾಂಗೋ ಗಣರಾಜ್ಯ", "PS": "ಪ್ಯಾಲೆಸ್ಟೈನ್", "GS": "ದಕ್ಷಿಣ ಜಾರ್ಜಿಯಾ"},
};

/** CLDR's long official names of Hong Kong and Macao ("Special Administrative Region…"). */
const HONG_KONG_MACAO = {
  am: {"HK": "ሆንግ ኮንግ", "MO": "ማካኦ"},
  ar: {"MO": "ماكاو"},
  bn: {"HK": "হংকং", "MO": "ম্যাকাও"},
  de: {"HK": "Hongkong", "MO": "Macau"},
  fa: {"HK": "هنگ‌کنگ", "MO": "ماکائو"},
  fr: {"HK": "Hong Kong", "MO": "Macao"},
  id: {"HK": "Hong Kong", "MO": "Makau"},
  it: {"HK": "Hong Kong", "MO": "Macao"},
  jv: {"HK": "Hong Kong", "MO": "Makau"},
  kn: {"HK": "ಹಾಂಗ್ ಕಾಂಗ್", "MO": "ಮಕಾವು"},
  mr: {"HK": "हाँगकाँग", "MO": "मकाओ"},
  ta: {"HK": "ஹாங்காங்", "MO": "மகாவ்"},
  th: {"HK": "ฮ่องกง", "MO": "มาเก๊า"},
  tr: {"HK": "Hong Kong", "MO": "Makao"},
  vi: {"HK": "Hồng Kông", "MO": "Ma Cao"},
};
for (const [lang, names] of Object.entries(HONG_KONG_MACAO)) {
  COUNTRY_OVERRIDES[lang] = { ...COUNTRY_OVERRIDES[lang], ...names };
}

/** Simpler names for the languages added later (same reasons as above). */
const MORE_OVERRIDES = {
  sq: {"HK": "Hong-Kongu", "MO": "Makao", "CD": "Republika Demokratike e Kongos", "CG": "Republika e Kongos", "PS": "Palestina", "GS": "Xhorxha Jugore"},
  eu: {"HK": "Hong Kong", "MO": "Macau", "CG": "Kongoko Errepublika", "PS": "Palestina", "GS": "Hegoaldeko Georgia"},
  bs: {"HK": "Hong Kong", "MO": "Makao", "CG": "Republika Kongo", "PS": "Palestina", "GS": "Južna Džordžija"},
  bg: {"HK": "Хонконг", "MO": "Макао", "CD": "Демократична република Конго", "CG": "Република Конго", "PS": "Палестина", "GS": "Южна Джорджия"},
  ca: {"HK": "Hong Kong", "MO": "Macau", "CD": "República Democràtica del Congo", "CG": "República del Congo", "PS": "Palestina", "GS": "Geòrgia del Sud"},
  hr: {"HK": "Hong Kong", "MO": "Makao", "CD": "Demokratska Republika Kongo", "CG": "Republika Kongo", "PS": "Palestina", "GS": "Južna Georgia"},
  cs: {"HK": "Hongkong", "MO": "Macao", "CD": "Demokratická republika Kongo", "CG": "Konžská republika", "PS": "Palestina", "GS": "Jižní Georgie"},
  da: {"HK": "Hongkong", "MO": "Macao", "CD": "Den Demokratiske Republik Congo", "CG": "Republikken Congo", "PS": "Palæstina", "GS": "South Georgia"},
  nl: {"HK": "Hongkong", "MO": "Macau", "CD": "Democratische Republiek Congo", "CG": "Republiek Congo", "PS": "Palestina", "GS": "Zuid-Georgia"},
  et: {"HK": "Hongkong", "MO": "Macau", "CD": "Kongo Demokraatlik Vabariik", "PS": "Palestiina", "GS": "Lõuna-Georgia"},
  fi: {"HK": "Hongkong", "MO": "Macao", "PS": "Palestiina", "GS": "Etelä-Georgia"},
  gl: {"HK": "Hong Kong", "MO": "Macau", "PS": "Palestina", "GS": "Xeorxia do Sur"},
  el: {"HK": "Χονγκ Κονγκ", "MO": "Μακάο", "CD": "Λαϊκή Δημοκρατία του Κονγκό", "CG": "Δημοκρατία του Κονγκό", "PS": "Παλαιστίνη", "GS": "Νότια Γεωργία"},
  hu: {"HK": "Hongkong", "MO": "Makaó", "CD": "Kongói Demokratikus Köztársaság", "CG": "Kongói Köztársaság", "PS": "Palesztina", "GS": "Déli-Georgia"},
  is: {"HK": "Hong Kong", "MO": "Makaó", "CD": "Austur-Kongó", "CG": "Vestur-Kongó", "PS": "Palestína", "GS": "Suður-Georgía"},
  ga: {"HK": "Hong Cong", "MO": "Macao", "CG": "Poblacht an Chongó", "PS": "an Phalaistín", "GS": "an tSeoirsia Theas"},
  lv: {"HK": "Honkonga", "MO": "Makao", "CD": "Kongo Demokrātiskā Republika", "CG": "Kongo Republika", "PS": "Palestīna", "GS": "Dienviddžordžija"},
  lt: {"HK": "Honkongas", "MO": "Makao", "CD": "Kongo Demokratinė Respublika", "CG": "Kongo Respublika", "PS": "Palestina", "GS": "Pietų Džordžija"},
  mk: {"HK": "Хонгконг", "MO": "Макао", "CD": "Демократска Република Конго", "CG": "Република Конго", "PS": "Палестина", "GS": "Јужна Џорџија"},
  mt: {"HK": "Hong Kong", "MO": "il-Macao", "CG": "ir-Repubblika tal-Kongo", "PS": "il-Palestina", "GS": "il-Georgia tan-Nofsinhar"},
  nb: {"HK": "Hongkong", "MO": "Macao", "CD": "Den demokratiske republikken Kongo", "CG": "Republikken Kongo", "PS": "Palestina", "GS": "Sør-Georgia", "LC": "Saint Lucia", "VC": "Saint Vincent og Grenadinene"},
  pl: {"HK": "Hongkong", "MO": "Makau", "CG": "Republika Konga", "PS": "Palestyna", "GS": "Georgia Południowa"},
  ro: {"HK": "Hong Kong", "MO": "Macao", "CD": "Republica Democrată Congo", "CG": "Republica Congo", "PS": "Palestina", "GS": "Georgia de Sud"},
  sr: {"HK": "Хонгконг", "MO": "Макао", "CD": "Демократска Република Конго", "CG": "Република Конго", "PS": "Палестина", "GS": "Јужна Џорџија"},
  sk: {"HK": "Hongkong", "MO": "Macao", "PS": "Palestína", "GS": "Južná Georgia"},
  sl: {"HK": "Hongkong", "MO": "Makav", "CG": "Republika Kongo", "PS": "Palestina", "GS": "Južna Georgia"},
  sv: {"HK": "Hongkong", "MO": "Macao", "CD": "Demokratiska republiken Kongo", "CG": "Republiken Kongo", "PS": "Palestina", "GS": "Sydgeorgien"},
  uk: {"HK": "Гонконг", "MO": "Макао", "CD": "Демократична Республіка Конго", "CG": "Республіка Конго", "PS": "Палестина", "GS": "Південна Джорджія"},
  cy: {"HK": "Hong Kong", "MO": "Macau", "CD": "Gweriniaeth Ddemocrataidd y Congo", "CG": "Gweriniaeth y Congo", "PS": "Palesteina", "GS": "De Georgia"},
  hy: {"HK": "Հոնկոնգ", "MO": "Մակաո", "CD": "Կոնգոյի Դեմոկրատական Հանրապետություն", "CG": "Կոնգոյի Հանրապետություն", "PS": "Պաղեստին", "GS": "Հարավային Ջորջիա"},
  az: {"HK": "Honq Konq", "MO": "Makao", "CD": "Konqo Demokratik Respublikası", "CG": "Konqo Respublikası", "PS": "Fələstin", "GS": "Cənubi Corciya"},
  my: {"HK": "ဟောင်ကောင်", "MO": "မကာအို", "CD": "ကွန်ဂို ဒီမိုကရက်တစ် သမ္မတနိုင်ငံ", "CG": "ကွန်ဂို သမ္မတနိုင်ငံ", "PS": "ပါလက်စတိုင်း", "GS": "တောင် ဂျော်ဂျီယာ"},
  ka: {"HK": "ჰონკონგი", "MO": "მაკაო", "CD": "კონგოს დემოკრატიული რესპუბლიკა", "CG": "კონგოს რესპუბლიკა", "PS": "პალესტინა", "GS": "სამხრეთ ჯორჯია"},
  he: {"HK": "הונג קונג", "MO": "מקאו", "CD": "הרפובליקה הדמוקרטית של קונגו", "CG": "הרפובליקה של קונגו", "PS": "פלסטין", "GS": "ג׳ורג׳יה הדרומית"},
  kk: {"HK": "Гонконг", "MO": "Макао", "CD": "Конго Демократиялық Республикасы", "CG": "Конго Республикасы", "PS": "Палестина", "GS": "Оңтүстік Георгия"},
  km: {"HK": "ហុងកុង", "MO": "ម៉ាកាវ", "CD": "សាធារណរដ្ឋប្រជាធិបតេយ្យកុងហ្គោ", "CG": "សាធារណរដ្ឋកុងហ្គោ", "PS": "ប៉ាឡេស្ទីន", "GS": "ហ្សកហ្ស៊ីខាងត្បូង"},
  lo: {"HK": "ຮົງກົງ", "MO": "ມາກາວ", "CD": "ສາທາລະນະລັດປະຊາທິປະໄຕຄອງໂກ", "CG": "ສາທາລະນະລັດຄອງໂກ", "PS": "ປາເລັດສະໄຕນ໌", "GS": "ຈໍເຈຍຕອນໃຕ້"},
  ms: {"HK": "Hong Kong", "MO": "Macau", "CD": "Republik Demokratik Congo", "CG": "Republik Congo", "PS": "Palestin", "GS": "Georgia Selatan"},
  ml: {"HK": "ഹോങ്കോങ്", "MO": "മക്കാവു", "CD": "കോംഗോ ജനാധിപത്യ റിപ്പബ്ലിക്", "CG": "കോംഗോ റിപ്പബ്ലിക്", "PS": "പലസ്തീൻ", "GS": "ദക്ഷിണ ജോർജ്ജിയ"},
  mn: {"HK": "Хонконг", "MO": "Макао", "CD": "Бүгд Найрамдах Ардчилсан Конго", "CG": "Бүгд Найрамдах Конго", "PS": "Палестин", "GS": "Өмнөд Жоржиа"},
  ne: {"HK": "हङकङ", "MO": "मकाउ", "CD": "प्रजातान्त्रिक गणतन्त्र कङ्गो", "CG": "गणतन्त्र कङ्गो", "PS": "प्यालेस्टाइन", "GS": "दक्षिण जर्जिया"},
  ps: {"HK": "هانګ کانګ", "MO": "مکاو", "CD": "د کانګو ډیموکراټیک جمهوریت", "CG": "د کانګو جمهوریت", "PS": "فلسطین", "GS": "سويلي جارجيا"},
  si: {"HK": "හොංකොං", "MO": "මැකාවු", "CD": "කොංගෝ ප්‍රජාතන්ත්‍රවාදී ජනරජය", "CG": "කොංගෝ ජනරජය", "PS": "පලස්තීනය", "GS": "දකුණු ජෝර්ජියාව"},
  uz: {"HK": "Gonkong", "MO": "Makao", "CD": "Kongo Demokratik Respublikasi", "CG": "Kongo Respublikasi", "PS": "Falastin", "GS": "Janubiy Georgiya"},
  af: {"HK": "Hongkong", "MO": "Macau", "CG": "Republiek van die Kongo", "PS": "Palestina", "GS": "Suid-Georgië"},
  so: {"CG": "Jamhuuriyadda Kongo", "PS": "Falastiin", "GS": "Joorjiyada Koonfureed", "KN": "Saint Kitts iyo Nevis", "LC": "Saint Lusia", "VC": "Saint Finsent iyo Girenadiins"},
  zu: {"HK": "i-Hong Kong", "MO": "i-Macau", "CD": "i-Democratic Republic of the Congo", "CG": "i-Republic of the Congo", "PS": "i-Palestine", "GS": "i-South Georgia"},
};
for (const [lang, names] of Object.entries(MORE_OVERRIDES)) {
  COUNTRY_OVERRIDES[lang] = { ...COUNTRY_OVERRIDES[lang], ...names };
}

/**
 * Languages whose CLDR data has (almost) no country names fall back to a
 * language their speakers read; so do their missing capital names.
 */
const FALLBACK_LANG = { su: 'id', jv: 'id' };

/** CLDR abbreviations that children wouldn't understand. */
function expand(lang, name) {
  if (lang === 'ru') return name.replace(/\bо-ва\b/g, 'острова').replace(/\bо-в\b/g, 'остров');
  return name;
}

/** Wikidata labels to query per language, best first (Simplified Chinese before generic Chinese). */
const LABEL_LANGS = {
  zh: ['zh-hans', 'zh-cn', 'zh'],
  yue: ['yue', 'zh-hk', 'zh-hant'],
  fil: ['fil', 'tl'],
  su: ['su', 'id'],
  jv: ['jv', 'id'],
  ms: ['ms', 'id'],
};
const labelLangs = (lang) => LABEL_LANGS[lang] ?? [lang];

/** Capital names where Wikidata's label is a district, a different city or a mistranslation. */
const CAPITAL_OVERRIDES = {
  zh: { NR: '亚伦', JP: '东京', US: '华盛顿' },
  yue: { JP: '東京' },
  ja: { BE: 'ブリュッセル', CN: '北京', KP: '平壌', TW: '台北', JP: '東京', KR: 'ソウル', NR: 'ヤレン' },
  ko: { CN: '베이징', JP: '도쿄', KP: '평양', KR: '서울', NR: '야렌', TW: '타이베이' },
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
  if ((lang === 'zh' || lang === 'yue') && name.length > 2) name = name.replace(/市$/, '');
  // Some Khmer labels start with ទីក្រុង ("city of"), most don't.
  if (lang === 'km') name = name.replace(/^ទីក្រុង/, '');
  return name;
}

/** Removes explanatory parentheses, e.g. "Myanmar (Burma)" → "Myanmar". */
const STRIP_PARENS = new Set(['MM', 'CC']);

async function readData(file) {
  const src = await readFile(join(ROOT, 'src', 'data', file), 'utf8');
  return JSON.parse(src.slice(src.indexOf('= [') + 2).replace(/;\s*$/, ''));
}

async function sparql(query) {
  // POST: the queries are too long for a URL.
  for (let attempt = 1; ; attempt++) {
    const res = await fetch('https://query.wikidata.org/sparql', {
      method: 'POST',
      headers: {
        'User-Agent': UA,
        Accept: 'application/sparql-results+json',
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({ query }),
    });
    if (res.ok) return (await res.json()).results.bindings;
    if (attempt >= 4) throw new Error(`Wikidata: HTTP ${res.status}`);
    await new Promise((r) => setTimeout(r, 3000 * attempt));
  }
}

const countries = await readData('countries.ts');
const capitals = await readData('capitals.ts');

// ------------------------------------------------------------------ capitals

// Candidate capital items of every country (any rank), with coordinates.
console.log('Querying capitals…');
const rows = await sparql(`SELECT ?iso ?cap ?coord WHERE {
  { ?country wdt:P297 ?iso ; p:P36/ps:P36 ?cap . }
  UNION { VALUES (?iso ?cap) { ${Object.entries(CAPITAL_ITEM).map(([iso, q]) => `("${iso}" wd:${q})`).join(' ')} } }
  ?cap wdt:P625 ?coord .
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
const capitalItem = new Map();
for (const capital of capitals) {
  let best = null;
  for (const r of rows) {
    if (r.iso.value !== capital.code) continue;
    const m = r.coord.value.match(/Point\(([-\d.e]+) ([-\d.e]+)\)/);
    if (!m) continue;
    const d = km(capital.lat, capital.lon, Number(m[2]), Number(m[1]));
    if (!best || d < best.d) best = { d, item: r.cap.value.split('/').pop() };
  }
  if (!best || best.d > 5) {
    console.warn(`  ${capital.code} ${capital.name}: no matching Wikidata item; English name used`);
    continue;
  }
  capitalItem.set(capital.code, best.item);
}

// Their labels in every language (one row per label).
console.log('Querying capital labels…');
const variants = [...new Set(LANGS.flatMap(labelLangs))];
const labelRows = await sparql(`SELECT ?cap ?label WHERE {
  VALUES ?cap { ${[...new Set(capitalItem.values())].map((q) => `wd:${q}`).join(' ')} }
  ?cap rdfs:label ?label .
  FILTER(LANG(?label) IN (${variants.map((l) => `"${l}"`).join(', ')}))
}`);
const labelsOf = new Map();
for (const r of labelRows) {
  const item = r.cap.value.split('/').pop();
  const labels = labelsOf.get(item) ?? {};
  labels[r.label['xml:lang']] = r.label.value;
  labelsOf.set(item, labels);
}
const capitalLabels = new Map(
  [...capitalItem].map(([code, item]) => {
    const labels = labelsOf.get(item) ?? {};
    return [code, Object.fromEntries(LANGS.map((l) => [l, labelLangs(l).map((x) => labels[x]).find(Boolean)]))];
  }),
);

// ------------------------------------------------------------------- output

await mkdir(OUT_DIR, { recursive: true });
/** The CLDR name of a region in `lang`, or in its fallback language, or undefined. */
function regionName(lang, code) {
  for (const l of [lang, FALLBACK_LANG[lang]].filter(Boolean)) {
    const name = COUNTRY_OVERRIDES[l]?.[code] ?? new Intl.DisplayNames([l], { type: 'region', fallback: 'none' }).of(code);
    if (name) return expand(l, name);
  }
  return undefined;
}

for (const lang of LANGS) {
  const countryNames = {};
  for (const c of countries) {
    let name = c.name;
    if (lang !== 'en') {
      name = regionName(lang, c.code) ?? c.name;
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
    Object.entries(CONTINENT_REGIONS).map(([k, region]) => [k, regionName(lang, region) ?? region]),
  );
  const data = { countries: countryNames, capitals: capitalNames, continents };
  await writeFile(join(OUT_DIR, `${lang}.json`), `${JSON.stringify(data, null, 1)}\n`);
  console.log(`${lang}: ${countries.length} countries, ${capitals.length} capitals (${missing} in English)`);
}
