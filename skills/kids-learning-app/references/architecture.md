# Architecture and pitfalls

Reference implementation: Flag Quiz (`src/` in this repository). Copy and
adapt its files instead of starting from scratch.

## Module layout

```
index.html                 meta tags (OG/Twitter/JSON-LD), icons, theme-color
vite.config.ts             base './', svelte(), VitePWA({...}), vitest config
pwa-assets.config.ts       icon generation from public/<app>-logo.svg
scripts/fetch-*.mjs        reproducible data + asset generation (countries, capitals + photos, map)
scripts/build-credits.mjs  credits.html from the data files (brand-styled, donation card)
public/                    flags, photos, brand logos, fonts (for credits.html), PWA icons,
                           og-image.png, screenshots/ (manifest), credits.html
SECURITY.md, BestPracticesChecklist.md   filled in (see SKILL.md)
src/
  main.ts                  install listener first, then font + global CSS + mount(App)
  app.css                  brand tokens (light/dark), resets, .icon-btn
  App.svelte               header (Streaks | ProfileMenu), <main> game, modals, turn banner,
                           install help, full-screen button, splash, rotate overlay
  data/*.ts                generated content (code, name, ratio, population, continents, …)
  lib/
    types.ts               GameId, Difficulty, Pattern, User, ItemStats, filters
    select.ts              scores, weights, adaptive k, pickRound, filters   (pure, tested)
    dates.ts               dayKey, addDays, lastDays, streaks                 (pure, tested)
    db.ts                  idb schema + versioned migrations                  (tested with fake-indexeddb)
    transfer.ts            export/import JSON + strict validation             (pure, tested)
    turns.ts               multiplayer turn order and round-robin              (pure, tested)
    adultCheck.ts          grown-ups-only equations for destructive actions   (pure, tested)
    speech.ts              robust speak(), on/off switch                       (tested with a fake engine)
    sound.ts               Web Audio chime / bonk, on/off switch
    install.svelte.ts      PWA install state: beforeinstallprompt, platform, standalone
    palette.ts             avatar colours, randomFlag()
    app.svelte.ts          AppState class with $state/$derived; rounds, answers, persistence
  components/
    Modal.svelte           scrim + dialog, Escape/backdrop close when allowed, focus handling
    Splash.svelte          logo, gold app name, "made by" + AOSSIE logo; ~4 s, tap to skip
    UserPicker.svelte      👤/👥 toggle, player tiles, ➕ new, ⬆️ import, 🗑 delete mode, rounds stepper
    DeletePlayer.svelte    grown-ups-only confirmation (equation)
    FlagEditor.svelte      name, 3 colour slots, palette, pattern previews
    GamePicker.svelte      one illustrated tile per game
    ProfileMenu.svelte     name + avatar button, next players' flags, icon menu (same-size items)
    Streaks.svelte         🔥 days, ⭐ perfect rounds, ✅ correct answers
    InstallHelp.svelte     how to install where there is no install prompt (iOS, others)
    FullscreenButton.svelte  discreet toggle, lower-right corner
    StatsModal.svelte      bests, calendar, accuracy rings, mastered items (fitted)
    FilterModal.svelte     restrict the content pool
    TurnBanner.svelte      multiplayer: next player's flag and name
    Guess*.svelte          one component per game, presentational (map game loads its data lazily)
    CapitalPhotos.svelte   four photos: 2×2, or one row in wide short spaces (container query)
    GameIcon.svelte        one icon per game (statistics)
    CustomFlag.svelte      SVG avatar renderer (viewBox 0 0 30 20)
    Flag.svelte            image fitted to a size container, real aspect ratio
```

## Data model (IndexedDB)

| Store | Key | Value |
| --- | --- | --- |
| `users` | `id` (autoIncrement) | name, flag, difficulty, theme, filter, adapt (k per game), perfectRun, bestPerfectRun, correctCount, createdAt, lastActiveAt |
| `stats` | `[userId, game, code]` (+ indexes `byUserGame`, `byUser`) | `s`, `c`, `d` |
| `playDays` | `[userId, date]` (+ index `byUser`) | — |
| `settings` | `"settings"` | device-wide: speech on/off, sounds on/off, multiplayer rounds per turn |

- Use a `perGame(fn)` helper for per-game records, so adding a game is a type
  error everywhere it must be handled; fill missing games in old records.
- Use autoIncrement numeric ids: `crypto.randomUUID` is unavailable over plain HTTP.
- Bump the DB version for every schema/meaning change and migrate in
  `upgrade(db, oldVersion, newVersion, tx)`. Also fill new user fields with
  defaults when loading (`withDefaults`).

## Game loop (in the state class)

```
newRound():  pickRound(pool, stats[game], k, optionCount, recent, rng, fillers)
answer(code):
  ignore if solved or already wrong
  mark today as played
  correct → solved; chime; if no mistakes: record(target, correct), perfectRun++
            k = nextK(k, mistakes); save; after 1 s → newRound() if still same round
  wrong   → record(code, incorrect); if first mistake: record(target, incorrect), perfectRun = 0
            mistakes++
```

- Guard the delayed `newRound` with the round id and the phase, so switching
  games or difficulty doesn't produce a stray round.
- When a filter leaves fewer items than options, take the extra distractors
  from the full set; reduce the "recent" window to half the pool.

## Multiplayer

- The state class holds `players` (session, in turn order) and `turn`; the
  current player is `$derived(players[turn])`, so every per-player feature
  (difficulty, filter, stats, streaks, menu actions) follows the turn for free.
- Keep per-player caches keyed by user id (stats maps, play days).
- Guard every delayed action (next round, reveal, banner) with both the round
  id and a session counter that is bumped on switching players or games.
- Count rounds per turn and pass the turn after the configured maximum (after
  the 1 s correct-answer delay), as well as after a mistake.
- Keep picker state (single/multi, selected ids) in the app state, not in the
  picker component: the editor modal replaces the picker while creating a
  player.

## Layout techniques

- `#app { height: 100dvh }`, `html, body { overflow: hidden }`.
- The header is absolutely positioned; the prompt row reserves side padding
  (`--side-reserve`) so it never collides with the header corners.
- Grids of options: `grid-template-rows: repeat(var(--rows), minmax(0, 1fr))`
  with `min-height: 0` everywhere along the chain.
- Images fitted with container queries: wrap in `container-type: size` and set
  `width: min(100cqw, 100cqh * var(--ratio)); aspect-ratio: var(--ratio)`.
- Cap grid height so labels stay next to their images, e.g.
  `max-height: calc(rows * ((100cqw - gaps) / 4.6 + 56px) + gaps)`, and align
  images to the end of their box.
- Modals: `max-height: 100%; overflow: auto` as a last resort. For "show all N
  items" views, compute the item size in JS: measure the fixed part, then pick
  the largest size whose greedy flex-wrap row count fits the remaining height.
- Short screens (`max-height: 560px`): lay the menu out in rows.

## Pitfalls met while building Flag Quiz

- **Svelte 5 proxies**: `structuredClone`/IndexedDB `put` fail on `$state`
  proxies — always pass `$state.snapshot(x)`.
- **`bind:this` inside `{#if}`** must be declared with `$state()`, or
  svelte-check warns and updates are missed.
- **Initial prop values** captured on purpose: wrap in `untrack(() => …)` to
  silence `state_referenced_locally`.
- **Hover speech after re-render**: when new options render under a mouse that
  hasn't moved, browsers fire `pointerenter`. Track the last mouse position;
  after each new round mute the element under it (`elementFromPoint` +
  `data-code`) until its `pointerleave`.
- **Hover vs touch**: speak on `pointerenter` only when `pointerType ===
  'mouse'`; show 🔊 buttons with `@media (hover: none)`.
- **`aria-disabled`** (keeps focus/announcements) instead of `disabled` for
  already-answered options; Playwright needs `{ force: true }` to click them.
- **SVG avatars**: don't use `preserveAspectRatio="none"`; size the box with
  the right aspect ratio instead, or circles become ovals.
- **Dark-mode swatches**: give colour swatches an outline based on
  `var(--text)`, or black disappears on dark surfaces.
- **Speech** (see `src/lib/speech.ts`): engines differ in how they survive
  interruptions. Only `cancel()` when something is speaking, then wait ~80 ms
  before `speak()` (Safari/iOS and Chrome/Android can drop an utterance queued
  right after `cancel()`); keep a reference to the current utterance (Chrome
  can garbage-collect it and its events never fire); reset the engine
  (`cancel()` + `resume()`) when speech is switched on or off; and add a
  watchdog that resets and retries once if an utterance never starts. Prefer
  `localService` voices, de-duplicate the same text within ~700 ms, and speak
  the first utterance synchronously inside a user gesture (iOS). Test with a
  fake `speechSynthesis` (vitest `stubGlobal` + fake timers).
- **Imports are untrusted**: limit file size, check `format`/`version`,
  validate every field (colour regex, enums, finite numbers in range,
  non-negative integers, date regex), skip unknown item codes, and create a
  new player in one transaction.
- **Open data APIs disappear** (REST Countries v3.1 was retired). Prefer
  downloadable files (GeoNames `countryInfo.txt`, CC BY 4.0) and cross-check
  them (World Bank API).
- **Social previews** need absolute URLs for `og:image`; exclude the image
  from the service-worker precache (`globIgnores`).
- **Wikidata Query Service**: geo `wikibase:around` queries over big cities
  and `P279*` class checks over thousands of items time out; you're also
  rate-limited (HTTP 429) after a few heavy queries. Walk `P131+` down from
  the city instead, rank by `wikibase:sitelinks` in a sub-query with a LIMIT,
  apply class whitelists only to that short list, run one query per area
  (a `VALUES` list of areas made the planner time out), and use the geo query
  only as a small-radius fallback.
- **Wikidata data errors**: check that landmarks are within ~50 km of the
  city; a "located in" chain once put Irish railway stations in Pitcairn.
- **Commons**: get licences in batches of 50 titles with `prop=imageinfo&
  iiprop=url|extmetadata&iiurlwidth=…`; strip HTML from `Artist`; skip
  `NonFree`; retry thumbnail downloads on 429 honouring `Retry-After`; always
  send an identifying User-Agent (project URL, no personal data).
- **world-atlas ids** are ISO numeric strings; map them to alpha-2 (GeoNames
  has the numeric codes). A few shapes have no id (Kosovo, Somaliland, N.
  Cyprus…): assign or draw them as neutral land. Simplify with
  topojson-simplify (quantile 0.5 halved the size to ~480 KB).
- **SVG maps**: use `vector-effect="non-scaling-stroke"` and scale markers and
  labels by `1/zoom` so they keep their screen size; distinguish taps from
  drags with a movement threshold and find the tapped element with
  `document.elementFromPoint` (pointer capture changes `event.target`);
  `touch-action: none` on the map.
- **Hover styles** must not override result colours (`:hover:not(.wrong)`).
- **`beforeinstallprompt`** fires early: register the listener in a module
  imported first in `main.ts`.
- **Safari grid percentages**: `width: min(100%, …)` (or `%` widths) inside a
  grid column sized by its content resolve against the content in WebKit, so
  items overflow into the next column; Chrome looks fine. Give grid areas
  explicit tracks (`grid-template-columns: minmax(0, 1fr)`) and
  `min-width: 0`. Always verify layouts in Playwright's WebKit too.
- **Endless animations block Playwright**: elements that wiggle (e.g. delete
  mode) never become "stable"; click them with `{ force: true }`.
- **Wikidata capitals** can point to the wrong item (Nicaragua's pointed to a
  new item without photo or coordinates) or lack an English label (shown as a
  Q-id); pin items and names by code in the script. Several best-rank values
  (South Africa, Bolivia…) need a curated choice.
- **Landmark gaps**: some cities record few landmarks as "located in" them
  (Tallinn, Managua). The geo fallback times out; use the images of the
  city's English Wikipedia article instead (`prop=images`), filtered for
  maps, flags, seals and logos. Then review every item's photos by name: drop
  unsuitable subjects (a regex on titles and file names), unlabelled items
  (Q-ids), duplicates under different names, and non-landmarks.
- **Precaching photos**: add `webp` to `globPatterns`; ~1,100 files / 16 MB
  precache in ~2 s locally. Check offline by waiting until `caches` hold all
  entries, then `setOffline(true)` and reload.
- **Template CI that can't pass as is**: gitleaks needs `GITLEAKS_LICENSE`
  for organization repos and Dependabot runs don't get Actions secrets → skip
  with `if: github.actor != 'dependabot[bot]'`. Dependency Review needs the
  repository's dependency graph → gate with
  `if: vars.DEPENDENCY_REVIEW_ENABLED == 'true'` and document how to enable it
  (changing repository settings may be refused by the permission system).
  Tell Dependabot to ignore major versions the toolchain can't use yet
  (TypeScript 7 for svelte-check).
- **Vulnerabilities in transitive dependencies**: fix with npm `overrides`
  scoped to the parent (e.g. `"workbox-build": { "glob": "^14" }`) after
  checking the parent only uses APIs that still exist; verify with the OSV
  batch API (below). A pasted OSV report may come from an older commit — check
  the scan of the latest commit first.
- **First push**: gitleaks fails scanning `root^..head` on a repo's first push
  (no parent); it is not a leak. Confirm with a manual full-history run.
- **Template workflows** reference actions by SHA; pin new workflows the same
  way (`gh api repos/<owner>/<action>/git/ref/tags/<tag>`).

## Checking dependencies against OSV

```js
// node --input-type=module: all packages in package-lock.json against https://osv.dev
const lock = JSON.parse(await (await import('node:fs/promises')).readFile('package-lock.json', 'utf8'));
const queries = [...new Map(Object.entries(lock.packages).filter(([k, v]) => k && v.version)
  .map(([k, v]) => { const name = k.split('node_modules/').pop(); return [`${name}@${v.version}`, { package: { name, ecosystem: 'npm' }, version: v.version }]; })).values()];
const { results } = await (await fetch('https://api.osv.dev/v1/querybatch', { method: 'POST', body: JSON.stringify({ queries }) })).json();
console.log(results.flatMap((r, i) => (r.vulns ? [`${queries[i].package.name}@${queries[i].version}`] : [])));
```

## Verification script skeleton (playwright-core)

```js
import { chromium, webkit } from 'playwright-core';
// Run everything in both engines: system Chrome and Playwright's WebKit
// (`npx playwright@<playwright-core version> install webkit`).
const browser = await chromium.launch({
  executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
});
// const browser = await webkit.launch();
const ctx = await browser.newContext({ viewport: { width: 844, height: 390 }, hasTouch: true, isMobile: true });
await ctx.addInitScript(() => {
  window.__spoken = [];
  const speak = speechSynthesis.speak.bind(speechSynthesis);
  speechSynthesis.speak = (u) => (window.__spoken.push(u.text), speak(u));
});
const page = await ctx.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
await page.goto('http://localhost:4173/');
// … drive the UI, take screenshots, then:
const { sw, sh, w, h } = await page.evaluate(() => ({
  sw: document.documentElement.scrollWidth, sh: document.documentElement.scrollHeight,
  w: innerWidth, h: innerHeight,
}));
```
