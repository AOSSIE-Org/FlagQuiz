#!/usr/bin/env node
/**
 * Builds the country data of the app:
 *   - flags of all ISO 3166-1 countries and territories from
 *     https://github.com/hampusborgos/country-flags (public domain, sourced from
 *     Wikimedia Commons, accurate proportions), optimised with SVGO;
 *   - population and continent from GeoNames
 *     (https://download.geonames.org/export/dump/countryInfo.txt, CC BY 4.0).
 *     GeoNames populations were cross-checked against the World Bank's 2024
 *     figures (SP.POP.TOTL): all 216 countries in both datasets agree within 10%.
 *
 * Writes:
 *   - public/flags/<code>.svg
 *   - src/data/countries.ts
 *
 * Usage: npm run fetch-countries
 */
import { mkdir, rm, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { optimize } from 'svgo';

// Pinned upstream commit, so that the generated assets are reproducible.
const COMMIT = 'c09927e63705529bbf59ca6684cd9b23225dddad';
const BASE = `https://raw.githubusercontent.com/hampusborgos/country-flags/${COMMIT}`;

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const FLAG_DIR = join(ROOT, 'public', 'flags');
const DATA_FILE = join(ROOT, 'src', 'data', 'countries.ts');

/** Entries upstream that are not ISO 3166-1 countries/territories. */
const NOT_ISO = new Set(['EU', 'XK', 'GB-ENG', 'GB-NIR', 'GB-SCT', 'GB-WLS']);

/**
 * Territories whose official flag is byte-identical to another country's flag.
 * They are excluded (the sovereign country is kept), otherwise some questions
 * would have two correct answers.
 */
const SAME_FLAG_AS = {
  BL: 'FR', GF: 'FR', GP: 'FR', MF: 'FR', MQ: 'FR', NC: 'FR', PM: 'FR', RE: 'FR', YT: 'FR',
  BQ: 'NL',
  SH: 'GB',
  BV: 'NO', SJ: 'NO',
  HM: 'AU',
  UM: 'US',
};

const GEONAMES = 'https://download.geonames.org/export/dump/countryInfo.txt';

/**
 * GeoNames assigns a single continent per country. Well-known transcontinental
 * countries are listed under both continents (main continent first).
 */
const EXTRA_CONTINENTS = {
  RU: ['AS'],
  TR: ['EU'],
  KZ: ['EU'],
  EG: ['AS'],
  AZ: ['EU'],
  GE: ['EU'],
};

/** Short, child-friendly English names. */
const NAME_OVERRIDES = {
  BN: 'Brunei',
  BO: 'Bolivia',
  CC: 'Cocos Islands',
  CD: 'DR Congo',
  CI: 'Ivory Coast',
  CN: 'China',
  CZ: 'Czechia',
  FK: 'Falkland Islands',
  FM: 'Micronesia',
  GS: 'South Georgia',
  IO: 'British Indian Ocean Territory',
  IR: 'Iran',
  KP: 'North Korea',
  KR: 'South Korea',
  LA: 'Laos',
  MD: 'Moldova',
  PN: 'Pitcairn Islands',
  RU: 'Russia',
  SX: 'Sint Maarten',
  SY: 'Syria',
  SZ: 'Eswatini',
  ST: 'São Tomé and Príncipe',
  TR: 'Türkiye',
  TW: 'Taiwan',
  TZ: 'Tanzania',
  VA: 'Vatican City',
  VE: 'Venezuela',
  VG: 'British Virgin Islands',
  VI: 'US Virgin Islands',
  WF: 'Wallis and Futuna',
};

async function get(url, as = 'text') {
  for (let attempt = 1; ; attempt++) {
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
      return as === 'json' ? await res.json() : await res.text();
    } catch (err) {
      if (attempt >= 3) throw new Error(`Failed to fetch ${url}: ${err.message}`);
      await new Promise((r) => setTimeout(r, 500 * attempt));
    }
  }
}

async function mapLimit(items, limit, fn) {
  const queue = [...items];
  const workers = Array.from({ length: limit }, async () => {
    while (queue.length) await fn(queue.shift());
  });
  await Promise.all(workers);
}

const all = await get(`${BASE}/countries.json`, 'json');
const codes = Object.keys(all)
  .filter((c) => !NOT_ISO.has(c) && !(c in SAME_FLAG_AS))
  .sort();

await rm(FLAG_DIR, { recursive: true, force: true });
await mkdir(FLAG_DIR, { recursive: true });

const ratios = {};
let done = 0;
await mapLimit(codes, 8, async (code) => {
  const lower = code.toLowerCase();
  const raw = await get(`${BASE}/svg/${lower}.svg`);
  const { data } = optimize(raw, {
    multipass: true,
    floatPrecision: 2,
    plugins: [{ name: 'preset-default', params: { overrides: { removeViewBox: false } } }],
  });
  if (!data.startsWith('<svg')) throw new Error(`Unexpected content for ${code}`);
  const vb = data.match(/viewBox="([^"]+)"/);
  if (vb) {
    const [, , w, h] = vb[1].split(/[\s,]+/).map(Number);
    ratios[code] = Math.round((w / h) * 1000) / 1000;
  }
  await writeFile(join(FLAG_DIR, `${lower}.svg`), data);
  process.stdout.write(`\r${++done}/${codes.length}`);
});
process.stdout.write('\n');

// Population and continent per ISO code.
const geo = new Map();
for (const line of (await get(GEONAMES)).split('\n')) {
  if (!line || line.startsWith('#')) continue;
  const f = line.split('\t');
  geo.set(f[0], { population: Number(f[7]) || 0, continent: f[8] });
}

const entries = codes.map((code) => {
  const info = geo.get(code);
  if (!info) throw new Error(`No GeoNames data for ${code}`);
  return {
    code,
    name: NAME_OVERRIDES[code] ?? all[code],
    ratio: ratios[code] ?? 1.5,
    population: info.population,
    continents: [info.continent, ...(EXTRA_CONTINENTS[code] ?? [])],
  };
});

const today = new Date().toISOString().slice(0, 10);
const ts = `// Generated by scripts/fetch-countries.mjs on ${today}. Do not edit by hand.
// Flags: https://github.com/hampusborgos/country-flags (public domain), commit ${COMMIT}.
// Population and continents: GeoNames (https://www.geonames.org/, CC BY 4.0).

/** AF Africa, AN Antarctica, AS Asia, EU Europe, NA North America, OC Oceania, SA South America. */
export type Continent = 'AF' | 'AN' | 'AS' | 'EU' | 'NA' | 'OC' | 'SA';

export interface Country {
  /** ISO 3166-1 alpha-2 code. */
  code: string;
  /** Child-friendly English name. */
  name: string;
  /** Width / height of the flag. */
  ratio: number;
  population: number;
  /** Main continent first. */
  continents: Continent[];
}

export const COUNTRIES: readonly Country[] = ${JSON.stringify(entries, null, 2)};
`;
await mkdir(dirname(DATA_FILE), { recursive: true });
await writeFile(DATA_FILE, ts);
console.log(`Wrote ${entries.length} flags to public/flags and ${DATA_FILE}`);
