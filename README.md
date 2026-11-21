<!-- Don't delete it -->
<div name="readme-top"></div>

<!-- Organization Logo -->
<div align="center" style="display: flex; align-items: center; justify-content: center; gap: 16px;">
  <img alt="AOSSIE" src="public/aossie-logo.svg" width="175">
  <img alt="Flag Quiz" src="public/flag-quiz-logo.svg" width="175" />
</div>

&nbsp;

<!-- Organization Name -->
<div align="center">

[![Static Badge](https://img.shields.io/badge/flagquiz.aossie.org-228B22?style=for-the-badge&labelColor=FFC517)](https://flagquiz.aossie.org/)

<!-- Correct deployed url to be added -->

</div>

<!-- Organization/Project Social Handles -->
<p align="center">
<!-- Telegram -->
<a href="https://t.me/+bMWGzaMTMa8xN2Ex">
<img src="https://img.shields.io/badge/Telegram-black?style=flat&logo=telegram&logoColor=white&logoSize=auto&color=24A1DE" alt="Telegram Badge"/></a>
&nbsp;&nbsp;
<!-- X (formerly Twitter) -->
<a href="https://x.com/aossie_org">
<img src="https://img.shields.io/twitter/follow/aossie_org" alt="X (formerly Twitter) Badge"/></a>
&nbsp;&nbsp;
<!-- Discord -->
<a href="https://discord.gg/hjUhu33uAn">
<img src="https://img.shields.io/discord/1022871757289422898?style=flat&logo=discord&logoColor=white&logoSize=auto&label=Discord&labelColor=5865F2&color=57F287" alt="Discord Badge"/></a>
&nbsp;&nbsp;
<!-- LinkedIn -->
<a href="https://www.linkedin.com/company/aossie/">
  <img src="https://img.shields.io/badge/LinkedIn-black?style=flat&logo=LinkedIn&logoColor=white&logoSize=auto&color=0A66C2" alt="LinkedIn Badge"></a>
&nbsp;&nbsp;
<!-- Youtube -->
<a href="https://www.youtube.com/@AOSSIE-Org">
  <img src="https://img.shields.io/youtube/channel/subscribers/UCKVVLbawY7Gej_3o2WKsoiA?style=flat&logo=youtube&logoColor=white%20&logoSize=auto&labelColor=FF0000&color=FF0000" alt="Youtube Badge"></a>
</p>


<p align="center">
  <a href="https://scorecard.dev/viewer/?uri=github.com/AOSSIE-Org/FlagQuiz">
    <img src="https://api.scorecard.dev/projects/github.com/AOSSIE-Org/FlagQuiz/badge" alt="OpenSSF Scorecard"/></a>
  &nbsp;&nbsp;
  <a href="./BestPracticesChecklist.md">
    <img src="https://img.shields.io/badge/dynamic/json?url=https%3A%2F%2Fraw.githubusercontent.com%2FAOSSIE-Org%2FFlagQuiz%2Fmain%2Fchecklist-status.json&query=%24.percent&suffix=%25&label=Best%20Practices&logo=openssf" alt="Best Practices"/></a>
  &nbsp;&nbsp;
  <a href="https://github.com/gitleaks/gitleaks">
    <img src="https://img.shields.io/badge/protected%20by-gitleaks-blue" alt="Protected by Gitleaks"/></a>
</p>

---


<div align="center">
<h1>Flag Quiz</h1>
</div>

[Flag Quiz](https://flagquiz.aossie.org/) is a simple, purely local web game for children to learn the flags of all the countries and territories of the world. It uses big icons instead of text, reads country names aloud, adapts to what each child already knows, and keeps all data on the device.

---

## 🚀 Features

- **Two games**:
  - *Guess the Flag*: a country name is shown (and read aloud) and the child picks its flag.
  - *Guess the Country*: a flag is shown and the child picks the country's name.
- **Every flag in the world**: 234 ISO 3166-1 countries and territories, with their real proportions.
- **Spoken names**: names are read aloud on hover or tap, using the device's own text-to-speech voices.
- **Clear feedback**: correct answers get a green check and a chime, and the next round starts after 1 s. A wrong pick turns red and shows (and says) what was actually picked.
- **Adaptive practice**: every country has a difficulty score per player and game, which starts at 0.5 and moves 10% towards 1 after each mistake and 10% towards 0 after each correct guess. Rounds without mistakes make the next questions harder; mistakes make them easier.
- **Three difficulty levels**: 3, 6 or 9 options per round.
- **Choose the countries**: practise only some continents, and only the N most populous countries (all continents and the top 100 by default).
- **Multiple players**: each player has a name and a custom flag (3 colours, from a palette or any colour, and 12 patterns with stripes, crosses, circles, rhombuses, stars and moons). The current player's name and flag are shown top right.
- **Multiplayer mode**: several children take turns on one device. A player keeps playing until they make a mistake; then the right answer is shown and it's the next player's turn. Each player keeps their own difficulty level (3, 6 or 9 options), so children of different ages can play together, and players with the lowest best run play first.
- **Streaks and statistics**: 🔥 days played in a row and ⭐ rounds in a row without mistakes (top left), plus a statistics view with the all-time bests, a 4-week calendar, accuracy, and every mastered flag (difficulty score below 0.2).
- **Save and load players**: export a player's data as a JSON file and import it on another device or browser.
- **Share**: share the app with the device's share sheet (or copy its link).
- **Light and dark mode**, with AOSSIE's brand colours and font.
- **Fits on one screen**: no scrolling on desktop or on phones in landscape.
- **Works offline**: installable as a Progressive Web App, and also works as a plain static website.
- **Private by design**: no accounts, no servers, no analytics. Everything is stored in the browser's IndexedDB.

---

## 💻 Tech Stack

### Frontend
- [Svelte 5](https://svelte.dev/) (runes) + TypeScript
- [Vite](https://vite.dev/) build tool
- [vite-plugin-pwa](https://vite-pwa-org.netlify.app/) (Workbox) for offline support and installation
- [Lucide](https://lucide.dev/) icons and the [Inter](https://rsms.me/inter/) typeface (bundled, no CDN)

### Browser APIs
- **IndexedDB** (through [`idb`](https://github.com/jakearchibald/idb)) for players, statistics and play dates
- **Web Speech API** (`speechSynthesis`) to read country names aloud
- **Web Audio API** for the feedback sounds (generated in code, no audio files)

### Data
- Flags from [hampusborgos/country-flags](https://github.com/hampusborgos/country-flags) (public domain, taken from Wikimedia Commons), optimised with SVGO
- Populations and continents from [GeoNames](https://www.geonames.org/) (CC BY 4.0). The populations agree within 10% with the World Bank's 2024 figures for all 216 countries in both datasets. Russia, Türkiye, Kazakhstan, Egypt, Azerbaijan and Georgia are listed under both of their continents.
- Both are downloaded and generated by [`scripts/fetch-countries.mjs`](scripts/fetch-countries.mjs) into `public/flags/` and `src/data/countries.ts`

### Testing
- [Vitest](https://vitest.dev/) with [`fake-indexeddb`](https://github.com/dumbmatter/fakeIndexedDB)
- [`svelte-check`](https://github.com/sveltejs/language-tools) for type checking

---

## ✅ Project Checklist

The template's checklist categories (protocol, smart contracts, mobile app store releases, AI/ML components) do not apply to Flag Quiz, which is a static, local-only web app. Its own checklist:

- [x] **The web app**:
   - [x] uses the colours and typeface of the [AOSSIE brand guidelines](https://github.com/AOSSIE-Org/Info/blob/main/Brand.md).
   - [x] has good metadata and a preview image for sharing on social media (Open Graph, X/Twitter cards).
   - [x] works offline and can be installed as a PWA.
   - [x] stores all data locally (IndexedDB) and makes no network requests at runtime.
   - [x] fits on one screen on desktop and on phones in landscape.
   - [ ] is deployed to [flagquiz.aossie.org](https://flagquiz.aossie.org/).

---

## 🔗 Repository Links

1. [Main Repository](https://github.com/AOSSIE-Org/FlagQuiz) (the frontend is the whole app; there is no backend)

---

## 🏗️ Architecture Diagram

Flag Quiz is a single static page. There is no backend: all logic runs in the browser.

```mermaid
flowchart LR
  subgraph Browser
    UI["Svelte components<br/>(src/components)"]
    State["App state<br/>(src/lib/app.svelte.ts)"]
    Select["Adaptive selection<br/>(src/lib/select.ts)"]
    Dates["Streaks<br/>(src/lib/dates.ts)"]
    Transfer["Export / import<br/>(src/lib/transfer.ts)"]
    Turns["Multiplayer turns<br/>(src/lib/turns.ts)"]
    DB["IndexedDB layer<br/>(src/lib/db.ts)"]
    IDB[("IndexedDB<br/>users · stats · playDays")]
    Speech["Web Speech API"]
    Audio["Web Audio API"]
    SW["Service worker<br/>(Workbox precache)"]
  end
  Assets["Static files<br/>index.html · JS · CSS<br/>234 flag SVGs · fonts"]

  UI <--> State
  State --> Select
  State --> Dates
  State --> Transfer
  State --> Turns
  State <--> DB <--> IDB
  UI --> Speech
  State --> Audio
  SW -. caches .-> Assets
  UI -. loads .-> Assets
```

**Data model** (IndexedDB database `flag-quiz`):

| Store | Key | Value |
| --- | --- | --- |
| `users` | `id` (auto) | name, custom flag, difficulty, theme, countries filter, adaptive exponent per game, current/best rounds without mistakes |
| `stats` | `[userId, game, code]` | difficulty score `s`, and `c` (correct) and `d` (incorrect) counts |
| `playDays` | `[userId, date]` | local dates (`YYYY-MM-DD`) on which the player played |

**Difficulty score**: every country starts at `s = 0.5` for each player and game. After each guess, `s' = 0.9·s + 0.1·z`, where `z = 1` if the guess was incorrect and `z = 0` if it was correct. A country is *mastered* when `s < 0.2` (at least 9 correct guesses in a row from the start).

**Guesses**: in a round, the target counts as correctly guessed if it was found with no mistakes. Otherwise it counts as incorrectly guessed (once per round), and every wrongly picked option also counts as incorrectly guessed.

**Countries filter**: only countries on the selected continents can be asked, restricted to the N most populous among them. When the filter leaves fewer countries than options, the remaining options come from the rest of the world.

**Adaptive selection**: each round, the target and the other options are drawn from the filtered countries with weight `s^k`. The exponent `k` (from −3 to 4, starting at 1, kept per player and game) goes up by 0.5 after a round without mistakes and down by 0.5 for each mistake, so harder or easier flags come up more often. Recent targets are not repeated (the last 15, or fewer when the filter leaves few countries).

**Multiplayer**: the players of a session are ordered by their best number of rounds without mistakes (lowest first, ties in selection order) and play in round-robin. A correct answer keeps the turn. A mistake reveals the right answer for 1.5 s, then a banner shows and says the next player's name, and a new round starts with that player's difficulty, countries filter and statistics. Light/dark mode applies to everyone.

**Export format**: a JSON file `{ format: "flag-quiz-player", version: 1, player, stats, playDays }`. Imported files are validated before anything is saved, and an import always creates a new player.

---

## 🔄 User Flow

```mermaid
flowchart TD
  Start([Open the app]) --> Users{Saved players?}
  Users -- no --> New[Create player:<br/>name + 3 colours + pattern]
  Users -- yes --> Pick[Pick a player or ➕<br/>👤 one player / 👥 several players]
  Pick -- ➕ --> New
  Pick --> Game
  New --> Game[Choose a game]
  Game --> GF[Guess the Flag]
  Game --> GC[Guess the Country]
  GF --> Round[Round: pick an option]
  GC --> Round
  Round -- wrong --> Feedback[Red feedback,<br/>name / flag revealed] --> Round
  Round -- correct --> Next[✓ + chime, 1 s] --> Round
  Round -- "wrong (multiplayer)" --> Turn[Right answer shown,<br/>next player's turn] --> Round
  Round -. profile button .-> Menu[Menu: 🌙 theme · ✏️ edit · difficulty · 🌍 countries ·<br/>📊 statistics · 🔗 share · ⬇️ save data · 🎮 change game · 👥 switch player]
  Pick -- ⬆️ --> Import[Load a player<br/>from a JSON file] --> Pick
```

### Key User Journeys

1. **First time**:
   - The app opens the "new player" dialog.
   - The child types a name, picks 3 colours and a pattern, and taps ✓.
   - The child picks a game, which starts right away.

2. **Playing Guess the Flag**:
   - A country name is shown and read aloud (tap or hover over it to hear it again).
   - The child taps a flag. A wrong flag gets a red border, and its country's name is shown below it and read aloud.
   - The correct flag gets a green check and a chime. A new round starts 1 s later.

3. **Playing Guess the Country**:
   - A flag is shown, with 3, 6 or 9 country names below it (hover, or tap 🔊 on touch screens, to hear a name).
   - A wrong name turns red, and its flag appears below it.
   - The correct name turns green, and a new round starts 1 s later. The name under a mouse that hasn't moved is not read aloud until the mouse leaves it and comes back.

4. **Checking progress / settings**:
   - The 🔥 days-in-a-row streak and the ⭐ rounds-without-mistakes streak are always shown at the top left.
   - Tapping the profile flag (top right) opens the menu: theme, edit player, difficulty (tap to cycle 3 → 6 → 9 options), countries (continents and top N by population), statistics, share, save data, change game, switch player.

5. **Playing together**:
   - In the "Who is playing?" dialog, switch from 👤 to 👥 and tap the players who will play (each gets a ✓), then ▶.
   - The player with the lowest best run starts. Their name and flag are shown top right, with the next players' flags below.
   - After a mistake, the right answer is shown, then the next player's flag and name appear (and the name is said aloud).

6. **Moving to another device**:
   - In the menu, ⬇️ saves the player's data as a JSON file.
   - On the other device, the ⬆️ button in the "Who is playing?" dialog loads that file as a new player.

---

## 🍀 Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) 20 or newer (with npm)
- Git
- A modern browser (Chrome, Edge, Firefox or Safari)

No accounts, API keys or environment variables are needed.

### Installation

#### 1. Clone the Repository

```bash
git clone https://github.com/AOSSIE-Org/FlagQuiz.git
cd FlagQuiz
```

#### 2. Install Dependencies

```bash
npm install
```

#### 3. Run the Development Server

```bash
npm run dev
```

#### 4. Open your Browser

Navigate to [http://localhost:5173](http://localhost:5173) to see the application.

### Other Commands

| Command | Description |
| --- | --- |
| `npm run build` | Production build in `dist/` (static files + service worker) |
| `npm run preview` | Serve the production build locally (to test PWA/offline) |
| `npm run check` | Type-check Svelte and TypeScript |
| `npm test` | Run the unit tests |
| `npm run fetch-countries` | Download the flags, populations and continents again and regenerate `src/data/countries.ts` |

### Deployment

Every push to `main` is built, tested and deployed to [flagquiz.aossie.org](https://flagquiz.aossie.org/) by the [Deploy to GitHub Pages](.github/workflows/deploy.yml) workflow (the repository's Pages source must be set to "GitHub Actions").

`npm run build` produces a fully static site in `dist/` with relative paths, so it can be served from any static host and any sub-folder (GitHub Pages, Netlify, nginx, …).

- Over **HTTPS** (or on `localhost`), the service worker is registered: the app works offline and can be installed.
- Over plain HTTP, the app still works as a normal website.
- The social media metadata in `index.html` points to `https://flagquiz.aossie.org/` and `https://flagquiz.aossie.org/og-image.png`. Update these if the app is deployed elsewhere.

---

## 📱 App Screenshots

| | | |
|---|---|---|
| ![New player](docs/screenshots/new-player.png) | ![Choose a game](docs/screenshots/choose-game.png) | ![Guess the Flag](docs/screenshots/guess-the-flag.png) |
| New player | Choose a game | Guess the Flag |
| ![Guess the Country](docs/screenshots/guess-the-country.png) | ![Menu](docs/screenshots/menu.png) | ![Statistics](docs/screenshots/statistics.png) |
| Guess the Country (dark mode, hard) | Menu | Statistics |
| ![Countries](docs/screenshots/countries.png) | ![Multiplayer: choose players](docs/screenshots/multiplayer-players.png) | ![Multiplayer: next player](docs/screenshots/multiplayer-turn.png) |
| Choose continents and top N by population | Multiplayer: choose players | Multiplayer: next player's turn |

---

## 🙌 Contributing

⭐ Don't forget to star this repository if you find it useful! ⭐

Thank you for considering contributing to this project! Contributions are highly appreciated and welcomed. To ensure smooth collaboration, please refer to our [Contribution Guidelines](./CONTRIBUTING.md).

---

## ✨ Maintainers

See [MAINTAINERS.md](./MAINTAINERS.md) for maintainers, mentors, and ideators.

---

## 📍 License

This project is licensed under the GNU General Public License v3.0.
See the [LICENSE](LICENSE) file for details.

The flag images are in the public domain (see [hampusborgos/country-flags](https://github.com/hampusborgos/country-flags)). Population and continent data © [GeoNames](https://www.geonames.org/), licensed under [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/).

---

## 💪 Thanks To All Contributors

Thanks a lot for spending your time helping Flag Quiz grow. Keep rocking 🥂

[![Contributors](https://contrib.rocks/image?repo=AOSSIE-Org/FlagQuiz)](https://github.com/AOSSIE-Org/FlagQuiz/graphs/contributors)

© 2026 AOSSIE
