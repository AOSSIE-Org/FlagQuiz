#!/usr/bin/env node
/**
 * Builds public/credits.html, the app's credits page (data sources, photo
 * authors and licences, and how to support AOSSIE), from src/data/*.ts.
 * Styled according to AOSSIE's brand guidelines.
 *
 * Usage: npm run build-credits (also run by npm run fetch-capitals)
 */
import { copyFile, mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(ROOT, 'public', 'credits.html');
const FONT = 'inter-latin-wght-normal.woff2';
export const DONATE_URL = 'https://buymeacoffee.com/aossie';

/** Reads the exported array of a generated data module. */
async function readData(file) {
  const src = await readFile(join(ROOT, 'src', 'data', file), 'utf8');
  return JSON.parse(src.slice(src.indexOf('= [') + 2).replace(/;\s*$/, ''));
}

const esc = (s = '') =>
  String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

export async function buildCredits() {
  const capitals = await readData('capitals.ts');
  const countries = new Map((await readData('countries.ts')).map((c) => [c.code, c]));

  // Inter, bundled so the page works offline too.
  await mkdir(join(ROOT, 'public', 'fonts'), { recursive: true });
  await copyFile(join(ROOT, 'node_modules', '@fontsource-variable', 'inter', 'files', FONT), join(ROOT, 'public', 'fonts', FONT));

  const cards = capitals
    .map((c) => {
      const country = countries.get(c.code);
      const photos = c.photos
        .map(
          (p) => `
        <figure>
          <a href="${esc(p.source)}"><img src="${esc(p.src)}" alt="${esc(p.title)}" loading="lazy" width="360" height="240" /></a>
          <figcaption><a href="${esc(p.source)}">${esc(p.title)}</a><span title="© ${esc(p.author)}">© ${esc(p.author)} · ${
            p.licenseUrl ? `<a href="${esc(p.licenseUrl)}">${esc(p.license)}</a>` : esc(p.license)
          }</span></figcaption>
        </figure>`,
        )
        .join('');
      return `
    <article class="card">
      <h3><img class="flag" src="flags/${c.code.toLowerCase()}.svg" alt="" /> ${esc(c.name)} <small>${esc(country?.name ?? c.code)}</small></h3>
      <div class="photos">${photos}
      </div>
    </article>`;
    })
    .join('');

  const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<meta name="robots" content="noindex" />
<title>Flag Quiz</title>
<link rel="icon" href="flag-quiz-logo.svg" type="image/svg+xml" />
<style>
  @font-face {
    font-family: 'Inter';
    src: url('fonts/${FONT}') format('woff2');
    font-weight: 100 900;
    font-display: swap;
  }
  /* AOSSIE brand: Golden Wallet, Baggy Green, dark #121212, white, muted grey. */
  :root {
    --gold: #ffcd00;
    --green: #00843d;
    --ink: #121212;
    --grey: #7a7a7a;
    --bg: #ffffff;
    --surface: #f5f5f5;
    --text: var(--ink);
    --border: #e4e4e4;
    --link: var(--green);
    color-scheme: light;
  }
  @media (prefers-color-scheme: dark) {
    :root {
      --bg: var(--ink);
      --surface: #1e1e1e;
      --text: #ffffff;
      --border: #333333;
      --link: var(--gold);
      color-scheme: dark;
    }
  }
  * { box-sizing: border-box; }
  body {
    margin: 0;
    background: var(--bg);
    color: var(--text);
    font-family: 'Inter', system-ui, -apple-system, 'Segoe UI', sans-serif;
    font-size: 18px;
    line-height: 1.55;
    -webkit-font-smoothing: antialiased;
  }
  a { color: var(--link); text-decoration-thickness: 1px; text-underline-offset: 2px; }
  main { max-width: 1040px; margin: 0 auto; padding: 32px 20px 48px; }
  header { display: flex; align-items: center; gap: 18px; margin-bottom: 8px; }
  header img { width: 72px; height: 72px; }
  h1 { margin: 0; font-size: clamp(36px, 6vw, 48px); font-weight: 800; letter-spacing: -0.02em; }
  h2 {
    margin: 40px 0 14px;
    font-size: 28px;
    font-weight: 600;
    display: flex;
    align-items: center;
    gap: 10px;
  }
  h2::before { content: ''; width: 6px; height: 1.1em; border-radius: 3px; background: var(--green); }
  .lead { font-size: 20px; margin: 16px 0 4px; }
  .donate {
    margin: 28px 0 8px;
    padding: 24px 26px;
    border-radius: 18px;
    background: linear-gradient(135deg, rgb(255 205 0 / 0.22), rgb(0 132 61 / 0.14));
    border: 2px solid var(--gold);
  }
  .donate h2 { margin: 0 0 8px; }
  .donate h2::before { background: var(--gold); }
  .donate p { margin: 0 0 16px; }
  .button {
    display: inline-flex;
    align-items: center;
    gap: 10px;
    padding: 12px 22px;
    border-radius: 999px;
    background: var(--gold);
    color: var(--ink);
    font-weight: 700;
    font-size: 17px;
    text-decoration: none;
    box-shadow: 0 6px 18px rgb(255 205 0 / 0.35);
    transition: transform 0.12s ease;
  }
  .button:hover { transform: translateY(-2px); }
  .data { list-style: none; padding: 0; margin: 0; display: grid; gap: 10px; }
  .data li { padding: 12px 16px; border-radius: 12px; background: var(--surface); }
  .note { color: var(--grey); font-size: 15px; }
  .cards { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 16px; }
  .card { padding: 14px; border-radius: 16px; background: var(--surface); border: 1px solid var(--border); }
  .card h3 { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; margin: 0 0 10px; font-size: 18px; }
  .card h3 small { color: var(--grey); font-weight: 500; font-size: 14px; }
  .flag { height: 20px; width: auto; border-radius: 3px; box-shadow: 0 0 0 1px rgb(0 0 0 / 0.12); }
  .photos { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
  figure { margin: 0; min-width: 0; }
  figure img { display: block; width: 100%; height: auto; aspect-ratio: 3 / 2; object-fit: cover; border-radius: 8px; background: var(--border); }
  figcaption { display: grid; margin-top: 4px; font-size: 12px; line-height: 1.35; }
  figcaption a:first-child { font-weight: 600; color: var(--text); text-decoration: none; }
  /* Some authors' notices are long: three lines, full text on hover and on the photo's page. */
  figcaption span {
    color: var(--grey);
    overflow-wrap: anywhere;
    display: -webkit-box;
    -webkit-box-orient: vertical;
    -webkit-line-clamp: 3;
    line-clamp: 3;
    overflow: hidden;
  }
  footer { margin-top: 48px; display: flex; flex-direction: column; align-items: center; gap: 6px; color: var(--grey); font-size: 15px; }
  footer img { height: 40px; width: auto; }
</style>
</head>
<body>
<main>
  <header>
    <img src="flag-quiz-logo.svg" alt="" />
    <h1>Flag Quiz</h1>
  </header>

  <p class="lead">Flag Quiz is free and open source software by <a href="https://aossie.org/">AOSSIE</a>, licensed under the GNU General Public License v3.</p>
  <p>Source code: <a href="https://github.com/AOSSIE-Org/FlagQuiz">github.com/AOSSIE-Org/FlagQuiz</a>.</p>

  <section class="donate">
    <h2>Help keep learning free</h2>
    <p>AOSSIE is a not-for-profit organization. Flag Quiz has no ads, no subscriptions and never collects your data — and we want to keep it that way for every child, everywhere. If Flag Quiz has made your children curious about the world, please consider buying us a coffee: every donation, however small, helps us build and maintain more free educational apps. Contributions of code, ideas, translations and feedback are just as welcome!</p>
    <a class="button" href="${DONATE_URL}" target="_blank" rel="noopener">☕ Support AOSSIE</a>
  </section>

  <h2>Data</h2>
  <ul class="data">
    <li>Flags: <a href="https://github.com/hampusborgos/country-flags">hampusborgos/country-flags</a> (public domain, from Wikimedia Commons).</li>
    <li>Populations and continents: <a href="https://www.geonames.org/">GeoNames</a> (<a href="https://creativecommons.org/licenses/by/4.0/">CC BY 4.0</a>).</li>
    <li>Capitals: <a href="https://www.wikidata.org/">Wikidata</a> (CC0).</li>
    <li>World map: <a href="https://www.naturalearthdata.com/">Natural Earth</a> (public domain), via <a href="https://github.com/topojson/world-atlas">world-atlas</a>.</li>
  </ul>

  <h2>Photos of capitals</h2>
  <p class="note">All photos are from <a href="https://commons.wikimedia.org/">Wikimedia Commons</a>, resized and cropped. Follow the links for the originals and the full licence terms.</p>
  <div class="cards">${cards}
  </div>

  <footer>
    <span>made by</span>
    <a href="https://aossie.org/"><img src="brand/aossie-secondary.svg" alt="AOSSIE" /></a>
  </footer>
</main>
</body>
</html>
`;
  await writeFile(OUT, html);
  return OUT;
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  console.log(`Wrote ${await buildCredits()}`);
}
