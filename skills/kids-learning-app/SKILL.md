---
name: kids-learning-app
description: Plan, build, verify and ship a small, purely local educational web game for young children (e.g. learning flags, capitals, maps, animals, letters, numbers, shapes, colours) with AOSSIE's stack and conventions — Svelte 5 + TypeScript + Vite, IndexedDB storage, offline PWA that also works as a plain static site and installs on phones, AOSSIE branding, icon-first minimal UI that fits one screen without scrolling, spoken prompts, multiple players and multiplayer turns, adaptive difficulty, streaks and statistics, JSON export/import, grown-ups-only deletion, credits and donation pages, social sharing metadata, the AOSSIE Template-Repo with every TODO and checklist filled, CI and GitHub Pages deployment. Use when asked to create a new learning app, quiz or game for kids, or to extend one built this way.
compatibility: Needs Node.js 20+, npm, git, the GitHub CLI (gh) and network access (template repo, brand assets, open data). playwright-core with the system Chrome and Playwright's WebKit build (`npx playwright install webkit`) is required for verification in both browser engines.
metadata:
  version: "1.1"
  category: app-generation
  origin: Distilled from building Flag Quiz (https://github.com/AOSSIE-Org/FlagQuiz); the full conversation is in prompts/1.md of that repo.
user-invocable: true
---

# Kids Learning App

## Purpose

Build a small educational game for young children that runs entirely in the
browser, stores everything locally, works offline, installs on phones, and
follows AOSSIE's branding and repository conventions. The reference
implementation is **Flag Quiz** (this repository): reuse its structure and code
wherever the new subject allows.

Read [references/architecture.md](references/architecture.md) before writing
code. It has the module layout, data model, algorithms, data pipelines, and the
pitfalls that cost time while building Flag Quiz.

## Requirements

Apply all of these unless the user explicitly says otherwise. They are what the
user asked for, or corrected, while building Flag Quiz.

### Locality and privacy
- No backend, no accounts, no analytics, no runtime requests to other
  origins. Fonts, icons, images, map and data are bundled and served from the
  app's own origin.
- All data lives in IndexedDB (via `idb`): players, per-item statistics, play
  days and device-wide settings. The app must still run if IndexedDB is
  unavailable (just without saving).
- Relative base (`base: './'`): `dist/` works from any static host and folder.
- PWA (`vite-plugin-pwa`): **everything is precached at install, photos
  included**, so every game works offline. The service worker registers only
  where supported, so the same build also works as a plain static site.

### Audience: young children
- As little text as possible; intuitive icons (Lucide). Every icon-only button
  has an `aria-label` and a `title`.
- Prompts and answers are read aloud (Web Speech API, local voices preferred):
  on round start, on click, and on hover with a mouse. On touch screens add an
  explicit 🔊 button wherever hover would be the only way to hear something.
  Don't speak an option that merely appears under a stationary mouse when a new
  round is rendered; only a deliberate hover (leave and re-enter) speaks.
- Feedback: correct → green ✓, chime (Web Audio, no files), next round after
  **1 s**; wrong → red border/text, shake, and a reveal of what was picked
  (its name, flag, capital or position), also read aloud.
- Big touch targets; calm animations; `prefers-reduced-motion` respected.

### Layout and shell
- One page, `100dvh`, never scrolls — at 1280×720 and on a phone in landscape
  (844×390). A "rotate your phone" overlay in portrait on small screens.
- No footer, no navigation bar, no logo in the header (the AOSSIE logo is on
  the splash screen and credits page instead).
- Top left: 🔥 days in a row, ⭐ rounds in a row without mistakes, ✅ total
  correct answers — side by side, large.
- Top right: the current player's name, then their custom flag as the profile
  button. In multiplayer, the next players' small flags appear below it.
- Profile menu (all buttons the same size; no wider controls): light/dark,
  edit player, difficulty (one button cycling 3 → 6 → 9 options, showing a
  mini grid), choose items (e.g. continents + top N by population), statistics,
  read-aloud on/off, sound effects on/off, share, save data (export), install
  app (phones/tablets only), credits ⓘ, donate ☕ (gold,
  https://buymeacoffee.com/aossie), change game, switch player.
- Everything else happens in modals: pick/create/import/delete players,
  pick game (illustrated tiles, e.g. real flags, photos, "Aa Ee Oo"), edit
  player, statistics, filters.
- Splash screen at start, **~4 s**, tap to skip: app logo, app name in
  **AOSSIE gold**, and "made by" **above** AOSSIE's **green-and-gold**
  secondary logo.
- A discreet full-screen toggle in the lower-right corner (hidden where the
  Fullscreen API is unavailable, e.g. iPhone Safari).

### Branding ([AOSSIE Brand.md](https://github.com/AOSSIE-Org/Info/blob/main/Brand.md))
- CSS variables: Golden Wallet `#FFCD00`, Baggy Green `#00843D`, dark
  `#121212`, white `#FFFFFF`, muted grey `#7A7A7A`; red only for errors.
- Inter (bundled via `@fontsource-variable/inter`); light and dark mode
  (per player, defaulting to the system preference).
- The same look on every page the app ships, including the credits page.

### Players, games and progress
- Players: a name plus a custom flag avatar — 3 colours (kid-friendly palette
  of ~13 including white, grey and black, plus a rainbow "any colour" picker)
  and ~12 patterns (stripes, crosses, circles, rhombuses, stars, moons…).
  In the editor, patterns come before colours.
- Difficulty (3, 6 or 9 options) is **per player**, so children of different
  ages can play together.
- Per player, per game and per item: difficulty score `s` (starts 0.5,
  `s' = 0.9·s + 0.1·z`, z = 1 if wrong) and correct/incorrect counts; mastered
  when `s < 0.2`. Adaptive selection weights items by `s^k`, with `k` going up
  after perfect rounds and down with mistakes; no recent repeats.
- Filters chosen by the player (e.g. continents, and the N most populous among
  them; defaults: all, 100). If the filter leaves too few items, fill the
  distractors from the whole set.
- Statistics modal: streaks and bests, 4-week calendar, accuracy and all
  mastered items per game; it grows to fit them and never overflows.
- Multiplayer on one device: 👤/👥 toggle in the player picker; in 👥 mode tap
  to select players, set "rounds in a row per player" (default 3) next to the
  selection, then ▶. Lowest best run plays first; round-robin; the turn passes
  after a mistake (answer revealed first) or after the maximum rounds; a
  banner shows and says the next player's name.
- Export a player as JSON and import it as a new player; validate every field
  of the untrusted file.
- Deleting players is grown-ups only: a small, faded 🗑 enters delete mode;
  confirming requires solving a linear equation (new one after each mistake).

### Content
- Use open data with clear licences, generated by reproducible scripts, with
  attribution in the README and on the credits page.
- Photos (e.g. Wikimedia Commons via Wikidata): representative landmarks,
  freely licensed, small WebP files, with author/licence/source kept.
  **Review every item's photos**, filter out anything unsuitable for children
  (war, violence, prisons, slavery, genocide, adult topics) and fix data errors
  by hand in the script. Leave out politically contested answers (e.g.
  contested capitals) and say so.
- Maps: Natural Earth projected at build time; tiny places get large tappable
  markers; zoom/pan.

### Credits, donations, sharing
- `credits.html`, generated by a script and styled with the brand: title is
  just the app name; a paragraph about the licence; "Source code: …" in its own
  paragraph; then a highlighted card saying AOSSIE is a not-for-profit, written
  to encourage donations (no ads, no data collection, free for every child;
  even a coffee helps) and welcoming contributions, with a button to
  https://buymeacoffee.com/aossie; data sources; photo credits grouped by item;
  "made by" AOSSIE logo footer.
- Share button: `navigator.share`, falling back to copying the link.
- Social metadata: title, description, canonical URL, Open Graph + Twitter
  tags with an absolute 1200×630 `og-image.png`, JSON-LD `WebApplication`.
- Installable on phones: "Install app" menu item only on mobile and only when
  not installed; Android uses `beforeinstallprompt`, iOS shows Share → Add to
  Home Screen; manifest with `id`, `display: fullscreen`, orientation,
  maskable icons, screenshots; `apple-mobile-web-app-*` meta tags.

### Repository and CI
- Initialize from [AOSSIE-Org/Template-Repo](https://github.com/AOSSIE-Org/Template-Repo).
  Fill **every** TODO (README, CONTRIBUTING, PRIVACY, MAINTAINERS, issue
  templates, comments) — and the unticked checklists: the README project
  checklist and `BestPracticesChecklist.md` (tick only what is true, with
  evidence; `[~]` + justification for N/A; leave the rest open and say why).
  Add a `SECURITY.md`. Text that merely mentions "TODO" (e.g. in
  `.coderabbit.yaml`) is not a placeholder.
- CI (type-check, tests, build) and a GitHub Pages deploy workflow on every
  push to `main`, actions pinned to commit SHAs.
- Make every template workflow pass. If one needs a secret or setting the repo
  lacks, skip or gate it (see the reference) rather than leave it red.
- Keep dependencies free of known vulnerabilities (npm `overrides` for
  transitive ones) and verify against the OSV database.

## Workflow

### 1. Clarify, then plan
Research first (template, brand guide, data sources: licence, completeness,
freshness, whether the API still exists — Flag Quiz found one retired). Then
present a concise plan and numbered decisions with 2–3 lettered options,
recommended first, so the user can answer "1 - c, 2 - a". Typical decisions:
scope of the content, data sources, avatar design, how touch users hear text,
what counts as a mistake, language(s), offline/PWA, and name, domain, GitHub
repo and maintainers (GitHub + Discord handles). Never guess the repo name or
people's real names. When a request is ambiguous ("counter of correct
guesses"), pick a sensible reading and say so. If a link the user gives can't
be read, say so and use standard practice.

### 2. Scaffold
Copy the template (without `.git`); add Node entries to `.gitignore`; create
`package.json` and install current versions (`svelte`, `vite`,
`@sveltejs/vite-plugin-svelte`, `typescript@^6`, `svelte-check`,
`@tsconfig/svelte`, `vitest`, `fake-indexeddb`, `vite-plugin-pwa`,
`@vite-pwa/assets-generator`, `workbox-window`, `svgo`, `sharp`; runtime `idb`,
`@lucide/svelte`, `@fontsource-variable/inter`). Check peer ranges
(`npm view <pkg> peerDependencies`). Trim `dependabot.yml` to npm + Actions.

### 3. Data and assets
One reproducible script per dataset (`scripts/fetch-*.mjs`, npm scripts),
pinned sources, typed `src/data/*.ts` with a "generated" header naming sources,
licences and date. Remove ambiguous duplicates, cross-check numbers against a
second source, keep names short and child-friendly, review content for
children. Make the logo SVG, PWA icons (`npx pwa-assets-generator`) and the
1200×630 social image (screenshot of an HTML page). `scripts/build-credits.mjs`
regenerates the credits page from the data without re-downloading.

### 4. Build
Pure, unit-tested logic in `src/lib/*.ts`; one Svelte 5 runes state class in
`src/lib/app.svelte.ts` holding game logic shared by all games; presentational
components in `src/components/`.

### 5. Verify — in real browsers, both engines
Run `npm run check`, `npm test`, `npm run build`, `vite preview`, then drive
the app with playwright-core in **Chrome and WebKit** (Safari layout bugs don't
show in Chrome):
- Screenshot every screen at 1280×720 and 844×390 (touch), light and dark,
  every difficulty, and **look at the screenshots**; also check a range of
  sizes (e.g. 740×360 to 1440×900) for overflow programmatically.
- Assert no scrolling, no `pageerror`/console errors.
- Trace speech (`speechSynthesis` start/end/error events) and test the speech
  module with a fake engine.
- Offline: wait until the precache is complete, go offline, reload, play.
- Export/import (download event, `setInputFiles`, a bad file), stress cases
  (e.g. every item mastered), multiplayer turn order and limits, deletion.

### 6. Document, record, ship
- README (features, stack, data and licences, Mermaid architecture and user
  flow, journeys, commands, deployment, screenshots), PRIVACY, CONTRIBUTING,
  SECURITY, checklists, skill — keep them current with every change.
- Keep a running log of the conversation in `prompts/1.md` and update it in
  every turn: the user's prompts verbatim, the assistant's final replies, no
  tool output.
- Commit and push only when asked; split unrelated changes into separate
  commits; after pushing, wait for the workflows and check the live site.
- When a vulnerability or CI report comes in, check which commit it refers to
  before changing anything — it may already be fixed.

## Reporting
Lead with what works and how it was verified (engines, sizes, modes, tests),
then the decisions made on the user's behalf, then what wasn't verified (real
devices, audio playback, browsers not tested).
