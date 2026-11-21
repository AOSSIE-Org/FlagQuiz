#!/usr/bin/env node
/**
 * Builds the capitals data used by the "Guess the Capital" and "Guess the
 * Capital's Country" games:
 *   - the capital of every country in src/data/countries.ts, from Wikidata
 *     (best-rank "capital" statements, with a few curated choices);
 *   - four representative, freely licensed photos per capital from Wikimedia
 *     Commons: the city's main Wikidata image plus its most famous nearby
 *     landmarks (ranked by the number of Wikipedia editions about them);
 *   - author, licence and source of every photo, for attribution.
 *
 * Writes:
 *   - public/capitals/<code>-<n>.webp       (360×240 photos)
 *   - src/data/capitals.ts
 *   - public/credits.html                    (photo and data credits, via build-credits.mjs)
 *
 * Usage: npm run fetch-capitals [-- --only=FR,AU]
 * Wikimedia APIs are queried politely (identifying User-Agent, low concurrency).
 */
import { mkdir, readdir, readFile, rm, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import { buildCredits } from './build-credits.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const PHOTO_DIR = join(ROOT, 'public', 'capitals');
const DATA_FILE = join(ROOT, 'src', 'data', 'capitals.ts');
const CREDITS_FILE = join(ROOT, 'public', 'credits.html');
const UA = 'FlagQuizDataBuilder/1.0 (https://github.com/AOSSIE-Org/FlagQuiz)';
const PHOTOS = 4;
const WIDTH = 360;
const HEIGHT = 240;

/** Countries with several best-rank capitals: the one used in the games. */
const CHOSEN_CAPITAL = {
  ZA: 'Pretoria',
  BO: 'Sucre',
  LK: 'Sri Jayawardenepura Kotte',
  YE: 'Sanaa',
  SZ: 'Mbabane',
  MS: 'Brades',
};

/**
 * Extra Wikidata items whose landmarks belong to a capital, when the capital's
 * landmarks are recorded under a different administrative entity.
 */
const EXTRA_AREAS = {
  GB: ['Q179351', 'Q208152'], // City of Westminster, Tower Hamlets
  NL: ['Q9899'], // Amsterdam municipality (Rijksmuseum, …)
};

/** Capital items to use where Wikidata's capital statement points to an unsuitable item. */
const CAPITAL_ITEM = {
  NI: 'Q3274', // Managua
  GQ: 'Q3818', // Malabo (the official move to Ciudad de la Paz is not yet effective)
};

/** Landmarks to skip after manual review (duplicates under another name, places that aren't landmarks). */
const SKIP_LANDMARKS = new Set(['Stadion Wankdorf', 'Weesp']);

/** Capital names to use where Wikidata has no suitable English label. */
const CAPITAL_NAME = {
  AG: "St. John's",
};

/** Contested capitals are left out of the capital games. */
const EXCLUDED = new Set(['IL', 'PS', 'IO']); // IO: Diego Garcia, a military base

/**
 * Photos must suit young children: no war, violence, prisons, slavery,
 * genocide or adult topics, judging by what they show and their file names.
 */
const UNSUITABLE = /phallolog|erotic|\bsex|torture|genocide|massacre|prison|\bjail|concentration camp|extermination|camp boiro|trostenets|tuol sleng|slave|execution|armed|convoy|soldier|military|\barmy\b|\bnavy\b|riot|protest|bomb|explosion|destroyed|damage|earthquake|\bwar\b|\bcoll\b|^Q\d+$/i;

/** Shorter or more common names for some capitals. */
const NAME_OVERRIDES = {
  'Yaren District': 'Yaren',
  'City of Victoria': 'Victoria',
  'Sri Jayawardenepura Kotte': 'Sri Jayawardenepura Kotte',
};

const only = process.argv.find((a) => a.startsWith('--only='))?.slice(7).split(',');

async function getJSON(url, init = {}) {
  for (let attempt = 1; ; attempt++) {
    try {
      const res = await fetch(url, { ...init, headers: { 'User-Agent': UA, Accept: 'application/json', ...init.headers } });
      if (res.status === 429 || res.status >= 500) throw new Error(`HTTP ${res.status}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}: ${(await res.text()).slice(0, 200)}`);
      return await res.json();
    } catch (err) {
      if (attempt >= 4) throw new Error(`${url.slice(0, 120)}: ${err.message}`);
      await new Promise((r) => setTimeout(r, 2000 * attempt));
    }
  }
}

function sparql(query) {
  return getJSON(`https://query.wikidata.org/sparql?query=${encodeURIComponent(query)}`, {
    headers: { Accept: 'application/sparql-results+json' },
  }).then((d) => d.results.bindings);
}

/** Downloads a file, waiting and retrying when rate-limited. */
async function download(url) {
  for (let attempt = 1; ; attempt++) {
    const res = await fetch(url, { headers: { 'User-Agent': UA } });
    if (res.ok) return Buffer.from(await res.arrayBuffer());
    if ((res.status !== 429 && res.status < 500) || attempt >= 6) throw new Error(`HTTP ${res.status}`);
    const wait = Number(res.headers.get('retry-after')) || 5 * attempt;
    await new Promise((r) => setTimeout(r, wait * 1000));
  }
}

async function mapLimit(items, limit, fn) {
  const queue = items.map((item, i) => [item, i]);
  const out = new Array(items.length);
  await Promise.all(
    Array.from({ length: limit }, async () => {
      while (queue.length) {
        const [item, i] = queue.shift();
        out[i] = await fn(item);
      }
    }),
  );
  return out;
}

/** Whether two landmark names are the same, ignoring case, accents and word order. */
function sameName(a, b) {
  const words = (s) => s.normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase().match(/[a-z0-9]+/g)?.sort().join(' ') ?? '';
  return words(a) === words(b);
}

/** Great-circle distance in km. */
function distanceKm(lat1, lon1, lat2, lon2) {
  const rad = Math.PI / 180;
  const a =
    Math.sin(((lat2 - lat1) * rad) / 2) ** 2 +
    Math.cos(lat1 * rad) * Math.cos(lat2 * rad) * Math.sin(((lon2 - lon1) * rad) / 2) ** 2;
  return 12742 * Math.asin(Math.sqrt(a));
}

const qid = (uri) => uri.slice(uri.lastIndexOf('/') + 1);
/** File name from a Special:FilePath URL. */
const fileName = (uri) => decodeURIComponent(uri.slice(uri.lastIndexOf('/') + 1)).replaceAll('_', ' ');
const isPhoto = (name) => /\.(jpe?g)$/i.test(name) && !/montage|collage|collection|map|flag|coat of arms|logo/i.test(name);
const stripHtml = (s = '') =>
  s.replace(/<[^>]*>/g, '').replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#039;/g, "'").replace(/\s+/g, ' ').trim();

// ------------------------------------------------------------------ capitals

const countriesSrc = await readFile(join(ROOT, 'src', 'data', 'countries.ts'), 'utf8');
const countries = JSON.parse(countriesSrc.slice(countriesSrc.indexOf('= [') + 2).replace(/;\s*$/, ''));
const codes = countries.map((c) => c.code).filter((c) => !EXCLUDED.has(c) && (!only || only.includes(c)));

console.log('Querying capitals…');
const rows = await sparql(`SELECT ?iso ?cap ?capLabel ?coord ?img WHERE {
  ?country wdt:P297 ?iso ; wdt:P36 ?cap .
  OPTIONAL { ?cap wdt:P625 ?coord }
  OPTIONAL { ?cap wdt:P18 ?img }
  SERVICE wikibase:label { bd:serviceParam wikibase:language "en". }
}`);

// Pinned capital items: fetch their label, coordinates and image.
const pinned = Object.entries(CAPITAL_ITEM).filter(([iso]) => codes.includes(iso));
if (pinned.length) {
  const pinnedRows = await sparql(`SELECT ?iso ?cap ?capLabel ?coord ?img WHERE {
    VALUES (?iso ?cap) { ${pinned.map(([iso, q]) => `("${iso}" wd:${q})`).join(' ')} }
    OPTIONAL { ?cap wdt:P625 ?coord }
    OPTIONAL { ?cap wdt:P18 ?img }
    SERVICE wikibase:label { bd:serviceParam wikibase:language "en". }
  }`);
  for (let i = rows.length - 1; i >= 0; i--) if (CAPITAL_ITEM[rows[i].iso.value]) rows.splice(i, 1);
  rows.push(...pinnedRows);
}

const capitals = new Map();
for (const r of rows) {
  const iso = r.iso.value;
  if (!codes.includes(iso)) continue;
  const name = r.capLabel.value;
  if (CHOSEN_CAPITAL[iso] && CHOSEN_CAPITAL[iso] !== name) continue;
  const entry = capitals.get(iso) ?? { code: iso, qid: qid(r.cap.value), name, images: new Set() };
  if (entry.qid !== qid(r.cap.value)) continue; // keep a single capital
  const m = r.coord?.value.match(/Point\(([-\d.]+) ([-\d.]+)\)/);
  if (m) [entry.lon, entry.lat] = [Number(m[1]), Number(m[2])];
  const img = r.img && fileName(r.img.value);
  if (img && isPhoto(img) && !UNSUITABLE.test(img)) entry.images.add(img);
  if (CAPITAL_NAME[iso]) entry.name = CAPITAL_NAME[iso];
  capitals.set(iso, entry);
}
console.log(`${capitals.size} capitals for ${codes.length} countries`);

// ----------------------------------------------------------------- landmarks

/**
 * The most famous landmarks located in a capital (or its sub-divisions), with
 * a photo: buildings, structures, monuments, museums, parks, squares and
 * tourist attractions, ranked by the number of Wikipedia editions about them.
 */
async function landmarks(cap) {
  // One query per area: combining areas in one query makes the planner time out.
  const results = [];
  for (const area of [cap.qid, ...(EXTRA_AREAS[cap.code] ?? [])]) results.push(...(await landmarksIn(area)));
  return results.sort((a, b) => Number(b.sl.value) - Number(a.sl.value));
}

/** Files that are not photos of the place (maps, flags, symbols, …). */
const NOT_A_PHOTO = /map|locator|location|flag|coat[ _]of[ _]arms|seal|emblem|logo|icon|montage|collage|escudo|bandera|mapa|carte|wappen|signature|diagram|chart|graph|stamp|banknote|coin/i;

/**
 * Fallback for capitals whose landmarks aren't recorded as located in them in
 * Wikidata: the photos used in the city's English Wikipedia article, which
 * editors chose to represent it.
 */
async function articlePhotos(cap) {
  const entity = await getJSON(
    `https://www.wikidata.org/w/api.php?action=wbgetentities&format=json&props=sitelinks&sitefilter=enwiki&ids=${cap.qid}`,
  );
  const title = entity.entities?.[cap.qid]?.sitelinks?.enwiki?.title;
  if (!title) return [];
  const data = await getJSON(
    `https://en.wikipedia.org/w/api.php?action=query&format=json&prop=images&imlimit=100&redirects=1&titles=${encodeURIComponent(title)}`,
  );
  const page = Object.values(data.query?.pages ?? {})[0];
  return (page?.images ?? [])
    .map((i) => i.title.replace(/^File:/, ''))
    .filter((f) => isPhoto(f) && !NOT_A_PHOTO.test(f) && !UNSUITABLE.test(f))
    .map((file) => ({ file, title: cap.name }));
}

async function landmarksIn(area) {
  return sparql(`SELECT ?item ?itemLabel ?img ?sl ?loc WHERE {
    { SELECT DISTINCT ?item ?img ?sl ?loc WHERE {
        ?item wdt:P131+ wd:${area} ; wdt:P18 ?img ; wdt:P625 ?loc ; wikibase:sitelinks ?sl .
      } ORDER BY DESC(?sl) LIMIT 80 }
    FILTER EXISTS {
      ?item wdt:P31/wdt:P279* ?cls .
      VALUES ?cls { wd:Q811979 wd:Q570116 wd:Q4989906 wd:Q33506 wd:Q22698 wd:Q174782 wd:Q2319498 }
    }
    # Not airports or railway stations.
    FILTER NOT EXISTS { ?item wdt:P31/wdt:P279* ?no . VALUES ?no { wd:Q1248784 wd:Q55488 } }
    SERVICE wikibase:label { bd:serviceParam wikibase:language "en". }
  } ORDER BY DESC(?sl) LIMIT 20`);
}

console.log('Finding landmarks…');
let done = 0;
await mapLimit([...capitals.values()], 2, async (cap) => {
  cap.candidates = [...cap.images].map((file) => ({ file, title: cap.name }));
  let found = [];
  try {
    found = await landmarks(cap);
  } catch (err) {
    console.warn(`\n${cap.code}: ${err.message}`);
  }
  const seenItems = new Set();
  for (const b of found) {
    const file = fileName(b.img.value);
    // Guard against data errors: landmarks must be near the capital.
    const m = b.loc?.value.match(/Point\(([-\d.]+) ([-\d.]+)\)/);
    if (!m || cap.lat === undefined || distanceKm(cap.lat, cap.lon, Number(m[2]), Number(m[1])) > 50) continue;
    // One photo per landmark.
    const title = b.itemLabel.value;
    if (seenItems.has(b.item.value) || !isPhoto(file) || cap.candidates.some((c) => c.file === file)) continue;
    // Skip unsuitable subjects and duplicates (two items for the same landmark).
    if (UNSUITABLE.test(title) || UNSUITABLE.test(file) || SKIP_LANDMARKS.has(title)) continue;
    if (cap.candidates.some((c) => c.title !== cap.name && sameName(c.title, title))) continue;
    seenItems.add(b.item.value);
    cap.candidates.push({ file, title });
  }
  if (cap.candidates.length < PHOTOS + 2) {
    try {
      for (const c of await articlePhotos(cap)) {
        if (!cap.candidates.some((x) => x.file === c.file)) cap.candidates.push(c);
      }
    } catch (err) {
      console.warn(`\n${cap.code} (article photos): ${err.message}`);
    }
  }
  process.stdout.write(`\r${++done}/${capitals.size}`);
});
process.stdout.write('\n');

// ---------------------------------------------------- photo metadata + files

console.log('Fetching photo licences…');
const allFiles = [...new Set([...capitals.values()].flatMap((c) => c.candidates.slice(0, PHOTOS + 4).map((x) => x.file)))];
const info = new Map();
for (let i = 0; i < allFiles.length; i += 50) {
  const titles = allFiles.slice(i, i + 50).map((f) => `File:${f}`).join('|');
  const url =
    'https://commons.wikimedia.org/w/api.php?action=query&format=json&prop=imageinfo' +
    `&iiprop=url|extmetadata|mime&iiurlwidth=${WIDTH * 2}&titles=${encodeURIComponent(titles)}`;
  const data = await getJSON(url);
  const normalized = new Map((data.query.normalized ?? []).map((n) => [n.to, n.from]));
  for (const page of Object.values(data.query.pages)) {
    const ii = page.imageinfo?.[0];
    if (!ii) continue;
    const md = ii.extmetadata ?? {};
    const original = (normalized.get(page.title) ?? page.title).replace(/^File:/, '');
    info.set(original, {
      thumb: ii.thumburl,
      page: ii.descriptionurl,
      author: stripHtml(md.Artist?.value) || 'Unknown author',
      license: stripHtml(md.LicenseShortName?.value) || 'See source',
      licenseUrl: md.LicenseUrl?.value,
      free: md.NonFree?.value !== 'true',
    });
  }
  process.stdout.write(`\r${Math.min(i + 50, allFiles.length)}/${allFiles.length}`);
}
process.stdout.write('\n');

console.log('Downloading photos…');
if (!only) await rm(PHOTO_DIR, { recursive: true, force: true });
await mkdir(PHOTO_DIR, { recursive: true });
const result = [];
done = 0;
await mapLimit([...capitals.values()], 4, async (cap) => {
  const photos = [];
  for (const cand of cap.candidates) {
    if (photos.length === PHOTOS) break;
    const meta = info.get(cand.file);
    if (!meta?.thumb || !meta.free) continue;
    try {
      const input = await download(meta.thumb);
      const n = photos.length + 1;
      const out = `${cap.code.toLowerCase()}-${n}.webp`;
      await sharp(input).rotate().resize(WIDTH, HEIGHT, { fit: 'cover' }).webp({ quality: 66 }).toFile(join(PHOTO_DIR, out));
      photos.push({
        src: `capitals/${out}`,
        title: cand.title,
        author: meta.author,
        license: meta.license,
        licenseUrl: meta.licenseUrl,
        source: meta.page,
      });
    } catch (err) {
      console.warn(`\n${cap.code} ${cand.file}: ${err.message}`);
    }
  }
  if (photos.length === PHOTOS && cap.lat !== undefined) {
    result.push({ code: cap.code, name: NAME_OVERRIDES[cap.name] ?? cap.name, lat: cap.lat, lon: cap.lon, photos });
  } else {
    console.warn(`\n${cap.code} (${cap.name}): only ${photos.length} photos, left out of the capital games`);
  }
  process.stdout.write(`\r${++done}/${capitals.size}`);
});
process.stdout.write('\n');
if (only) {
  // Partial run: keep the capitals generated before for the other countries.
  const previous = await readFile(DATA_FILE, 'utf8').catch(() => '');
  const start = previous.indexOf('= [');
  if (start >= 0) {
    const kept = JSON.parse(previous.slice(start + 2).replace(/;\s*$/, '')).filter(
      (c) => !only.includes(c.code) && !EXCLUDED.has(c.code),
    );
    result.push(...kept);
  }
}
result.sort((a, b) => a.code.localeCompare(b.code));

// Remove photos that are no longer used (left over from earlier partial runs).
const used = new Set(result.flatMap((c) => c.photos.map((p) => p.src.replace('capitals/', ''))));
for (const file of await readdir(PHOTO_DIR)) if (!used.has(file)) await rm(join(PHOTO_DIR, file));

// -------------------------------------------------------------------- output

const today = new Date().toISOString().slice(0, 10);
await writeFile(
  DATA_FILE,
  `// Generated by scripts/fetch-capitals.mjs on ${today}. Do not edit by hand.
// Capitals: Wikidata (CC0). Photos: Wikimedia Commons, under the licences listed below
// and in public/credits.html.

export interface CapitalPhoto {
  /** Path of the photo, relative to the app. */
  src: string;
  /** What the photo shows. */
  title: string;
  author: string;
  license: string;
  licenseUrl?: string;
  /** Wikimedia Commons page of the original photo. */
  source: string;
}

export interface Capital {
  /** ISO 3166-1 alpha-2 code of the country. */
  code: string;
  name: string;
  lat: number;
  lon: number;
  photos: CapitalPhoto[];
}

export const CAPITALS: readonly Capital[] = ${JSON.stringify(result, null, 2)};
`,
);

await buildCredits();
console.log(`Wrote ${result.length} capitals (${result.length * PHOTOS} photos), ${DATA_FILE} and ${CREDITS_FILE}`);
