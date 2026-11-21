#!/usr/bin/env node
/**
 * Builds the world map used by the "Guess the Location" game.
 *
 * Country shapes: Natural Earth 1:50m (public domain) via the world-atlas
 * package, projected with the Natural Earth projection (Antarctica left out),
 * converted to SVG paths.
 * Countries that are too small to click, or missing from the map, get a
 * marker at their position (from Wikidata, CC0, when they have no shape).
 *
 * Writes src/data/map.json. Usage: npm run fetch-map
 */
import { readFile, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { geoArea, geoCentroid, geoNaturalEarth1, geoPath } from 'd3-geo';
import { feature } from 'topojson-client';
import { presimplify, quantile, simplify } from 'topojson-simplify';

const require = createRequire(import.meta.url);
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(ROOT, 'src', 'data', 'map.json');
const UA = 'FlagQuizDataBuilder/1.0 (https://github.com/AOSSIE-Org/FlagQuiz)';
const WIDTH = 1000;
/** Countries smaller than this (in square map units) also get a marker. */
const SMALL_AREA = 12;
/** Share of the least significant points removed when simplifying borders. */
const SIMPLIFY_QUANTILE = 0.5;
/** Polygons smaller than this are dropped, unless they are a country's largest. */
const MIN_PART_AREA = 0.15;

/** Shapes without an ISO code that belong to a country in the list. */
const UNCODED = { Somaliland: 'SO', 'N. Cyprus': 'CY' };

const countriesSrc = await readFile(join(ROOT, 'src', 'data', 'countries.ts'), 'utf8');
const countries = JSON.parse(countriesSrc.slice(countriesSrc.indexOf('= [') + 2).replace(/;\s*$/, ''));
const known = new Set(countries.map((c) => c.code));

async function get(url, accept) {
  const res = await fetch(url, { headers: { 'User-Agent': UA, Accept: accept } });
  if (!res.ok) throw new Error(`${url}: HTTP ${res.status}`);
  return res;
}

// ISO numeric → alpha-2 (GeoNames, CC BY 4.0).
const numericToAlpha2 = new Map();
for (const line of (await (await get('https://download.geonames.org/export/dump/countryInfo.txt', 'text/plain')).text()).split('\n')) {
  if (!line || line.startsWith('#')) continue;
  const f = line.split('\t');
  numericToAlpha2.set(String(Number(f[2])).padStart(3, '0'), f[0]);
}

// Coordinates of every country (Wikidata, CC0), for countries without a shape.
const coordQuery = `SELECT ?iso ?coord WHERE { ?c wdt:P297 ?iso ; wdt:P625 ?coord . }`;
const coords = new Map();
const bindings = (
  await (await get(`https://query.wikidata.org/sparql?query=${encodeURIComponent(coordQuery)}`, 'application/sparql-results+json')).json()
).results.bindings;
for (const b of bindings) {
  const m = b.coord.value.match(/Point\(([-\d.]+) ([-\d.]+)\)/);
  if (m && !coords.has(b.iso.value)) coords.set(b.iso.value, [Number(m[1]), Number(m[2])]);
}

const raw = presimplify(require('world-atlas/countries-50m.json'));
const topo = simplify(raw, quantile(raw, SIMPLIFY_QUANTILE));
const all = feature(topo, topo.objects.countries).features.filter((f) => f.properties.name !== 'Antarctica');

const projection = geoNaturalEarth1().fitWidth(WIDTH, { type: 'FeatureCollection', features: all });
const path = geoPath(projection).digits(1);
const [[, y0], [, y1]] = path.bounds({ type: 'FeatureCollection', features: all });
projection.translate([projection.translate()[0], projection.translate()[1] - y0]);
const height = Math.ceil(y1 - y0);

/** Splits a (multi)polygon feature into polygons, largest first. */
function parts(f) {
  const polys = f.geometry.type === 'MultiPolygon' ? f.geometry.coordinates : [f.geometry.coordinates];
  return polys
    .map((coordinates) => {
      const g = { type: 'Feature', geometry: { type: 'Polygon', coordinates } };
      return { g, area: path.area(g) };
    })
    .sort((a, b) => b.area - a.area);
}

const byCode = new Map();
const neutral = [];
for (const f of all) {
  const code = numericToAlpha2.get(f.id) ?? UNCODED[f.properties.name];
  const ps = parts(f);
  const kept = ps.filter((p, i) => i === 0 || p.area >= MIN_PART_AREA);
  const d = kept.map((p) => path(p.g)).join('');
  if (!code || !known.has(code)) {
    neutral.push(d);
    continue;
  }
  const entry = byCode.get(code) ?? { code, d: '', area: 0, main: null };
  entry.d += d;
  entry.area += ps.reduce((s, p) => s + p.area, 0);
  if (!entry.main || ps[0].area > entry.mainArea) {
    entry.main = ps[0].g;
    entry.mainArea = ps[0].area;
  }
  byCode.set(code, entry);
}

const shapes = [];
for (const c of countries) {
  if (c.code === 'AQ') continue;
  const e = byCode.get(c.code);
  let x;
  let y;
  if (e) {
    [x, y] = projection(geoCentroid(e.main));
    // Centroids of odd shapes can fall outside; use the label point of the main part's bounds then.
    if (!Number.isFinite(x)) [x, y] = path.centroid(e.main);
  } else if (coords.has(c.code)) {
    [x, y] = projection(coords.get(c.code));
  } else {
    console.warn(`No shape or position for ${c.code}`);
    continue;
  }
  shapes.push({
    code: c.code,
    ...(e ? { d: e.d } : {}),
    x: Math.round(x * 10) / 10,
    y: Math.round(y * 10) / 10,
    ...(!e || e.area < SMALL_AREA ? { small: true } : {}),
  });
}

await writeFile(
  OUT,
  JSON.stringify({
    source: 'Natural Earth 1:50m (public domain) via world-atlas; positions from Wikidata (CC0). Generated by scripts/fetch-map.mjs.',
    width: WIDTH,
    height,
    countries: shapes,
    neutral,
  }),
);
const small = shapes.filter((s) => s.small);
console.log(
  `Wrote ${OUT}: ${shapes.length} countries (${shapes.filter((s) => !s.d).length} without shape, ${small.length} with markers), ` +
    `${neutral.length} neutral shapes, ${WIDTH}×${height}, ${(JSON.stringify(shapes).length / 1024).toFixed(0)} KB`,
);
