---
name: kids-learning-app
description: Plan, build, verify and ship a small, purely local educational web game for young children (e.g. learning flags, capitals, animals, letters, numbers, shapes, colours, maps) with AOSSIE's stack and conventions — Svelte 5 + TypeScript + Vite, IndexedDB storage, offline PWA that also works as a plain static site, AOSSIE branding, icon-first minimal UI that fits one screen without scrolling, multiple players with custom flag avatars, spoken prompts, adaptive difficulty, streaks and statistics, JSON export/import, social sharing metadata, AOSSIE Template-Repo initialization with all TODOs filled, and GitHub Pages deployment. Use when asked to create a new learning app, quiz or game for kids, or to extend one built this way.
compatibility: Needs Node.js 20+, npm, git and network access (to fetch the template repo, brand assets and open data). A Chromium-based browser plus playwright-core is strongly recommended for visual verification. The GitHub CLI (gh) is used for repository and Pages checks.
metadata:
  version: "1.0"
  category: app-generation
  origin: Distilled from building Flag Quiz (https://github.com/AOSSIE-Org/FlagQuiz); see prompts/ in that repo.
user-invocable: true
---

# Kids Learning App

## Purpose

Build a small educational game for young children that runs entirely in the
browser, stores everything locally, works offline, and follows AOSSIE's
branding and repository conventions. The reference implementation is
**Flag Quiz** (this repository): reuse its structure and code wherever the new
subject allows.

Read [references/architecture.md](references/architecture.md) before writing
code. It has the module layout, the data model, the adaptive algorithm, and
the pitfalls that cost time while building Flag Quiz.

## Non-negotiable requirements

Apply these unless the user explicitly says otherwise.

**Locality and privacy**
- No backend, no accounts, no analytics, no network requests at runtime. Fonts,
  icons, images and data are bundled.
- All player data lives in IndexedDB (via `idb`). Tolerate IndexedDB being
  unavailable: the app must still run, just without saving.
- Built with a relative base (`base: './'`) so `dist/` works from any static
  host and sub-folder. Offline support comes from a service worker
  (`vite-plugin-pwa`) that registers only where supported (HTTPS/localhost).

**Audience: young children**
- As little text as possible. Prefer intuitive icons (Lucide). Every icon-only
  button has an `aria-label` and a `title`.
- Prompts and answers are spoken with the Web Speech API (prefer local voices).
  Speak on hover (mouse only) and on click. On touch screens, add an explicit
  🔊 button wherever hover would be the only way to hear something.
- Feedback is immediate and visual + audible: green ✓ and a chime (Web Audio,
  no audio files) for correct; red border/text, a shake, and a reveal of what
  was actually picked for wrong answers. Next round after ~1 s.
- Big touch targets, playful but calm animations, `prefers-reduced-motion`
  respected.

**Layout**
- One page, `100dvh`, `overflow: hidden`, never scrolls, at 1280×720 and on a
  phone in landscape (844×390). Show a "rotate your phone" overlay in portrait
  on small screens.
- No footer, no navigation bar. Top-left: streaks (🔥 days in a row, ⭐ rounds
  without mistakes), side by side and large. Top-right: profile button that
  looks like the player's custom flag and opens an icon menu.
- Everything else happens in modals: pick/create player, pick game, edit
  player, statistics, settings/filters.

**Branding** ([AOSSIE Brand.md](https://github.com/AOSSIE-Org/Info/blob/main/Brand.md))
- Colours as CSS variables: Golden Wallet `#FFCD00`, Baggy Green `#00843D`,
  dark `#121212`, white `#FFFFFF`, muted `#7A7A7A`. Red is only for errors.
- Inter (bundled with `@fontsource-variable/inter`).
- Light and dark mode (per player, defaulting to the system preference).
- Ask whether the AOSSIE logo should be shown. Flag Quiz started with the
  secondary logo top-left and later removed it to make room for the streaks.

**Players and progress**
- Players have a name and a custom flag (3 colours from a kid-friendly palette
  or a custom colour picker, + one of ~12 patterns: stripes, crosses, circles,
  rhombuses, stars, moons); the flag is their avatar, shown top right with the
  name to its left. In the editor, patterns come before colours.
- Multiplayer on one device: a 👤/👥 toggle in the player picker; in 👥 mode
  tapping toggles players and ▶ starts. Players take turns in round-robin,
  lowest best run first; a mistake reveals the answer and passes the turn with
  a banner that shows and speaks the next player's name. Difficulty, filters
  and statistics stay per player, so children of different ages can play
  together.
- Per player, per game and per item: a difficulty score `s` (starts at 0.5,
  `s' = 0.9·s + 0.1·z`, z = 1 if wrong) plus correct/incorrect counts. An item
  is mastered when `s < 0.2`.
- Adaptive selection: draw the target and the distractors with weight `s^k`;
  `k` rises after perfect rounds and falls with mistakes. Don't repeat recent
  targets.
- Record play days (local `YYYY-MM-DD`) for streaks; keep current and best
  "rounds without mistakes".
- Statistics modal: streaks and bests, 4-week calendar, accuracy per game, and
  all mastered items — the modal grows to fit them and never overflows.
- Export a player as JSON (menu) and import it as a new player (player picker),
  validating every field of the untrusted file.

**Repository**
- Initialize from [AOSSIE-Org/Template-Repo](https://github.com/AOSSIE-Org/Template-Repo)
  and fill **every** TODO (README, CONTRIBUTING, PRIVACY, MAINTAINERS, issue
  templates, even comments). Don't confuse instructions that merely mention
  "TODO" (e.g. in `.coderabbit.yaml`) with placeholders.
- Social metadata in `index.html`: title, description, canonical URL, Open
  Graph + Twitter card tags with an absolute 1200×630 `og-image.png`, and
  JSON-LD `WebApplication`.
- Share button in the menu: `navigator.share`, falling back to copying the link.
- CI workflow (check, test, build) and a GitHub Pages deploy workflow, with
  actions pinned to commit SHAs like the template's workflows.

## Workflow

### 1. Clarify, then plan

Research before asking: read the template repo, the brand guide and candidate
data sources (licence, completeness, freshness, whether the API still exists).
Then present a concise plan and a numbered list of decisions, each with 2–3
lettered options and the recommended one first, so the user can answer like
"1 - c, 2 - a". Typical decisions:

1. Scope of the content set (e.g. UN members only vs. all ISO territories).
2. Data/asset source (licence, accuracy).
3. Custom avatar design (number of patterns).
4. How touch users hear spoken text.
5. What counts as a mistake for the statistics.
6. Language(s).
7. Offline/PWA.
8. App name, domain, GitHub repo name, maintainers (GitHub + Discord handles).

Never guess the GitHub repository name or people's real names; ask, or use
what the user gave and say so.

### 2. Scaffold

1. Copy the template files (without `.git`) into the repo. Append Node entries
   (`node_modules/`, `dist/`, `dev-dist/`, …) to its `.gitignore`.
2. Create `package.json` by hand and install the latest versions:
   `svelte @sveltejs/vite-plugin-svelte vite typescript@^6 svelte-check
   @tsconfig/svelte vitest fake-indexeddb vite-plugin-pwa
   @vite-pwa/assets-generator workbox-window svgo` (dev) and
   `idb @lucide/svelte @fontsource-variable/inter`. Check peer dependency
   ranges (`npm view <pkg> peerDependencies`) — e.g. svelte-check didn't
   support TypeScript 7.
3. Trim `.github/dependabot.yml` to the ecosystems used (npm, GitHub Actions).

### 3. Data and assets

Write a reproducible script (`scripts/fetch-<data>.mjs`, exposed as an npm
script) that downloads the content from pinned sources, optimises images with
SVGO, and generates a typed `src/data/*.ts` file with a "generated, do not
edit" header naming sources, licences and the date. Then:

- Look for duplicates that would make a question ambiguous (e.g. byte-identical
  flags of territories and their sovereign state) and remove them.
- Cross-check numbers against a second source and report agreement.
- Keep display names short and child-friendly (override official names).
- Record attribution (CC BY etc.) in the README and generated file.

Create the app logo as an SVG, generate PWA icons with
`npx pwa-assets-generator`, and render the 1200×630 social image by
screenshotting an HTML page with Chrome.

### 4. Build

Follow the module layout in [references/architecture.md](references/architecture.md):
pure, unit-tested logic in `src/lib/*.ts`; one Svelte 5 runes state class in
`src/lib/app.svelte.ts`; components in `src/components/`. Keep the game logic
(round creation, answering, scoring) in the state class so all games share it,
and keep components presentational.

### 5. Verify — always in a real browser

Unit tests are necessary but not sufficient. Run `npm run check`, `npm test`,
`npm run build`, then `vite preview` and drive the app with playwright-core
and the system Chrome:

- Screenshot every screen at 1280×720 and 844×390 (touch), light and dark, all
  difficulty levels, and **look at the screenshots**.
- Assert `scrollWidth/scrollHeight` equal the viewport (no scrolling).
- Assert there are no `pageerror` or console errors.
- Spy on `speechSynthesis.speak` (via `addInitScript`) to test what is spoken.
- Test offline: wait for `navigator.serviceWorker.ready`, go offline, reload.
- Test export (download event) and import (`setInputFiles`), including a bad
  file and a stress case (e.g. every item mastered) for the statistics modal.

Fix what the screenshots reveal (spacing, contrast of swatches in dark mode,
distorted previews, labels far from their images) and re-run.

### 6. Document and ship

- Fill all template TODOs; README gets features, tech stack, data sources and
  licences, Mermaid architecture and user-flow diagrams, key journeys, commands,
  deployment notes and screenshots (`docs/screenshots/`).
- PRIVACY: local storage only, what is stored, no third parties, speech-engine
  caveat, export/import, share, children, free.
- Save the conversation in `prompts/` if the user asks (their prompts verbatim,
  the assistant's final replies; no tool output).
- Commit only when asked. Push only when asked.

## Reporting

When reporting back, lead with what works and how it was verified (sizes,
modes, tests), then list the decisions you made on the user's behalf and what
was not verified (real devices, Safari, audio playback).
