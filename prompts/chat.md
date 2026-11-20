# Chat history: building Flag Quiz

This is the conversation in which Flag Quiz was planned and built with Claude Code.
The user's prompts are reproduced verbatim. The assistant's replies are its final
messages for each turn; the intermediate tool calls (file edits, shell commands,
browser screenshots) are not included.

---

## 1. User

> Build a simple purely local web app for children to learn flags.
>
> Keep in mind and seek to satisfy the following requirements:
> * Use Svelte.
> * Use IndexedDB to store data.
> * Initialize the repo according to this template repo (https://github.com/AOSSIE-Org/Template-Repo).
> * In the end, remember to fill all the TODOs in the files of the template repo.
> * The whole game should fit in a single web page that does not require scrolling and that should display well in desktop browsers or in mobile browsers in landscape mode.
> * Use AOSSIE's branding, as described here (https://github.com/AOSSIE-Org/Info/blob/main/Brand/Brand-Kit-Guidelines.pdf)
> * The page should have no footer and no navigation bar. The page should be minimalistic with as little text as possible. Prefer intuitive icons instead of text, to make the app accessible to young children.
> * AOSSIE's secondary logo should appear in the top-left corner.
>
> Find and download the flags of all the countries of the world.
>
> When the page is loaded, a modal should appear. This modal should allow the user to either choose an existing saved user or to create a new user. When creating a new user, the user should be asked to type a name and select 3 colors for a custom flag. Created users should be stored in IndexedDB.
>
> After a user is chosen or created, a profile button should appear in the top right corner. This profile button should look like the custom flag of the user. Clicking on the profile button should open a menu. One of the items in the menu should be a toggle to switch between light and dark mode. Another button should be to edit the current user profile. Clicking on this button should open a modal for the user to edit his/her flag and name. Another button should be a difficulty selector (easy, medium, hard). Another button should show a modal with statistics for the user's performance.
>
> After a user is chosen or created, the modal should ask the user to select one of two games:
> * Guess the Country
> * Guess the Flag
>
> Once the user chooses one of these two games, the modal disappears and the chosen game begins.
>
> In the "Guess the Flag" game, a country name should be shown in the top and a grid of 3 (easy), 6 (medium) or 9 (hard) random flags should be shown below. The name of the country should be spoken aloud. Whenever the user hovers over the country name or clicks on it, the name of the country should be spoken aloud. If the user selects the correct flag, feedback should be given to the user that his/her answer was correct and, after 0.5 seconds, a new random country name and a new grid of random flags should be shown. If the user selects a wrong flag, the name of that flag's country should be shown below that flag and it should be spoken aloud. The flag should be surrounded by a red border, as feedback that it was a wrong choice.
>
> In the "Guess the Country" game, a flag should be shown in the top and a grid of 3, 6 or 9 (depending on difficulty level) country names should be shown below for the user to select. When the user hovers over the country names, the country names should be spoken aloud. If the user selects the correct country, feedback should be given to the user that his/her answer was correct and, after 0.5 seconds, a new random flag and a new grid of random country names should be shown. If the user selects a wrong country name, the flag of that country should be shown below that country name and the country name's color should change to red, as feedback that it was a wrong choice.
>
> Each game should keep a counter of how many times each flag or country was guessed correctly or incorrectly by each user. The `difficulty score` of a flag or country for a given user is `(d+1)/(c+d+2)`, where `c` is the number of times it was guessed correctly and `d` is the number of times it was guessed incorrectly by the user. The random selections should take the difficulty score into account. When the user guesses correctly with no mistakes, the next random selections should choose flags/countries that are more difficult. When the user makes many mistakes, the next random selections should choose flags/countries that are easier.
>
> Moreover, the app as a whole should store the dates when the user played any of the two games. The user's streak should be shown next to the user's icon.
>
> Considering all of the above, make an implementation plan. If anything is unclear, propose 2 or 3 options and let me choose.

## 1. Assistant

Here's the plan. I checked the template repo, AOSSIE's brand guide and two candidate flag sources first, so the details below come from what's actually there. The local repo is empty (no commits yet).

### What I found

- **Template repo:** It has community files (README, CONTRIBUTING, PRIVACY, MAINTAINERS), `.github/` workflows and issue templates, `public/aossie-logo.svg`, and more. There are about 45 TODOs, mostly in README.md, CONTRIBUTING.md, PRIVACY.md, MAINTAINERS.md and `good_first_issue.yml`.
- **Brand:** Colours: Golden Wallet `#FFCD00` (primary), Baggy Green `#00843D` (secondary), `#121212` for dark backgrounds, `#FFFFFF`, and `#7A7A7A` for muted text. Font: Inter. The secondary logo (`a{}ssie.`) comes in light and dark versions. Logos must never be smaller than 24px.
- **Flag sources:** `hampusborgos/country-flags`: 255 SVGs at each flag's real proportions, public domain (taken from Wikimedia). `lipis/flag-icons`: MIT licence, but every flag is forced to 4:3, which distorts flags like Nepal, Qatar and Switzerland.

### Architecture

- **Stack:** Svelte 5 + Vite + TypeScript as a single-page app, plus `idb` for IndexedDB, `lucide-svelte` for icons, Inter served locally, and Vitest for tests.
- **No network calls at runtime:** flags, logos and fonts are all bundled.
- **Speech:** the browser's built-in speech (`speechSynthesis`); sentences still playing are cancelled, repeated hovers are throttled.
- **Sound:** short correct/wrong sounds generated in the browser (Web Audio).

IndexedDB stores: `users`, `stats` (`[userId, game, code]` → `{c, d}`), `playDays` (`[userId, date]`), `adaptive` (`[userId, game]` → `{k}`).

Layout: one CSS grid at `100dvh` with `overflow: hidden`; top bar with the logo on the left, the prompt in the centre, and the 🔥 streak next to the profile flag on the right; answer grid of 3 / 3×2 / 3×3; a "rotate your phone" overlay on phones held upright.

Screens: user picker, flag editor, game picker, profile menu (theme, edit, difficulty, statistics, change game, switch user), statistics modal.

Game rules: correct → green glow, ✓ and chime, next round after 0.5 s; wrong in Guess the Flag → red border, name shown and spoken; wrong in Guess the Country → name turns red, its flag appears below.

Adaptive selection: target picked with weight `s^k`, where k (per user and game, from −3 to 4, starting at 1) goes up by 0.5 after a perfect round and down by 0.5 per mistake; the last 10 targets aren't repeated; wrong options drawn with the same weights.

Streak: consecutive days played, in local time, alive until the end of today.

### Steps

1. Copy the template files, merge `.gitignore`, keep all workflows.
2. Set up Vite + Svelte.
3. Download the flags with a script, optimise with SVGO, write the country list.
4. Brand tokens, logos, fonts.
5. Database layer, user picker, flag editor, game picker, profile menu.
6. Selection logic and tests, both games, speech and feedback.
7. Statistics modal and streak.
8. CI workflow, screenshots, fill every TODO.
9. Check that nothing scrolls at 1280×720, 1920×1080 and 844×390.

### Decisions for you (first option recommended)

1. Which countries? a) 195 UN members + observers; b) (a) + Kosovo and Taiwan; c) everything in the ISO list, including territories (~250).
2. Flag source? a) `hampusborgos/country-flags`; b) `lipis/flag-icons`; c) Wikimedia Commons directly.
3. Custom flag shape? a) 3 stripes, horizontal or vertical; b) always 3 vertical stripes; c) 3 colours plus 4–5 patterns.
4. Hearing names on touch screens? a) a 🔊 button on each name (touch screens only); b) first tap speaks, second tap answers; c) press and hold.
5. What counts as a mistake? a) target gets one mistake per round, and every wrong option picked gets one; b) target gets one per wrong tap; c) only the target, once per round.
6. Language? a) English only, curated names; b) names and speech follow the device's language.
7. Work offline? a) yes, installable PWA; b) plain static website.
8. Details for the TODOs: display name, deployed address, maintainers.

---

## 2. User

> Choose the following options:
> 1 - c
> 2 - a
> 3 - c
> 4 - a
> 5 - a
> 6 - a
> 7 - a (it should work both as a plain static website and as installable pwa)
> 8 - Flag Quiz, flagquiz.aossie.org, @Zahnentferner, @b.wp
>
> Also, let's keep track of the number of rounds without mistakes. Let's show this next to the played days streak. Let's store the user's best number of rounds without mistakes ever and show that as a statistics.
>
> Then start!

## 2. Assistant

Flag Quiz is built and working, with all template TODOs filled. Type checks are clean, the 21 unit tests pass, and the production build succeeds. I clicked through both games in Chrome at 1280×720 and at 844×390 (a phone held sideways), in light and dark mode, at easy, medium and hard. There were no errors and the page never scrolls. I also checked that it reloads with no network after the first visit. Nothing is committed yet.

**What's in place**
- **Flags:** 234 SVGs at their real proportions in `public/flags/`, made by `scripts/fetch-flags.mjs` (pinned to one source version). I left out 15 territories whose flag is identical to another country's (e.g. Réunion uses France's, Bouvet Island uses Norway's), because those questions would have two right answers. Kosovo and England/Scotland/Wales aren't in the ISO list, so they're out.
- **Players:** name, 3 colours and 6 patterns, stored in IndexedDB with per-flag counts and play dates.
- **Top bar:** AOSSIE's secondary logo on the left; 🔥 days in a row and ⭐ rounds without mistakes on the right, next to the player's flag.
- **Menu:** light/dark, edit player, difficulty, statistics, plus "change game" and "switch player".
- **Statistics:** day streak and best, current and best rounds without mistakes, a 4-week calendar, and for each game: accuracy, flags learned, and the 5 flags to practise.
- **Adaptive selection** weighted by `score^k`.
- **Touch screens:** 🔊 button on names; "rotate your phone" overlay in portrait.
- **Offline:** installs as an app and works offline over HTTPS; works as a plain static site over HTTP.
- **Repo:** template files with README (features, Mermaid diagrams, screenshots), CONTRIBUTING, PRIVACY and MAINTAINERS filled in, a CI workflow, and `dependabot.yml` trimmed to npm and GitHub Actions.

**Decisions to check**
- Repo name assumed to be `AOSSIE-Org/LearnGeography`.
- MAINTAINERS.md Name column says "Zahnentferner"; GitHub @Zahnentferner, Discord @b.wp.
- Speech prefers on-device voices; online voices may send the country name to the browser's speech service (stated in PRIVACY.md).

**Not covered:** I couldn't listen to the speech or sounds, haven't tested on a real phone or in Safari, and there's no in-app way to delete a player.

---

## 3. User

> * Remove the aossie logo.
> * Move the streak and number of rounds without mistakes to the top left corner. Make them bigger. Position them side to side instead of one on top of the other. Streak should be on the left of the number of rounds without mistakes.
> * In the guess the country game, when the user clicks on the correct country and a new random selection is shown, the user's mouse is still hovering a newly randomly selected country name and that name is being spoken. This is confusing. It should not be spoken. It should only be spoken if the user unhovers and then hovers again.
> * Increase the time between rounds from 0.5s to 1s.
> * Add a share button to the menu.
> * Ensure that, when the app is shared in social media, it is displayed nicely with good metadata.
> * Add a button to the menu to export the user's data as a json file.
> * In the modal to choose or create a user, add a button to import a user from a json file.
> * Change the difficulty score computation formula. All difficulty scores are initialized to `0.5`. When the user makes a guess, the new score is `s' = s * 0.9 + 0.1 * z` where `z = 1` if the guess was incorrect and `z = 0` if the guess was correct.
> * In the statistics modal, do not show the flags to learn. Instead, show the mastered flags. A flag should be considered mastered if its difficulty score is below 0.2. Make the modal increase in size so that all mastered flags can fit. Make sure the modal does not overflow out of the screen even if all flags have been mastered.
> * In the modal to choose a game, show the flags of brazil, italy and russia instead of brazil, japan and canada in the guess the flag button. And show the flag of australia in the guess the country button. Write "Aa", "Ee", "Oo" instead of three "Aa" in the guess the country button.
> * In the menu, the button to toggle the difficulty grid level is wider than the other buttons and this is ugly. Find and implement a more elegant solution.
> * Research, download and store the populations and continents of all countries. Allow the users to restrict the random selection only to selected continents and only to the top N countries by population. By default, all continents should be selected and N should be equal to 100.

## 3. Assistant

All 13 changes are done. Type checks are clean, all 35 unit tests pass, and the build succeeds. I tested the new behaviour in Chrome at desktop size and at phone-landscape size (844×390) with no errors. Nothing is committed yet.

**Layout and timing**
- The AOSSIE logo is gone. The 🔥 days streak and ⭐ rounds-without-mistakes count now sit side by side in the top-left corner, about twice as big, with 🔥 on the left.
- Rounds now advance after 1 s.
- In Guess the Country, the name under a mouse that hasn't moved is no longer spoken when a new round appears; it is spoken once the mouse leaves and comes back (verified by recording speech calls).

**Menu**
- **Difficulty:** one button, the same size as the others, showing the current 3/6/9 grid; tapping cycles easy → medium → hard.
- **Share:** opens the device's share sheet, or copies the link and briefly shows ✓.
- **Export:** downloads the player as `flag-quiz-<name>.json`.
- **Import:** a ⬆️ button in the "Who is playing?" dialog loads such a file as a new player; files are validated and bad files show an error.

**Scoring and statistics**
- **New score:** starts at 0.5 and becomes `0.9·s + 0.1·z` after each guess, so mastering a flag takes 9 correct guesses in a row. Scores already saved are converted from the old formula.
- **Mastered flags:** the statistics modal shows mastered flags; it grows as more are mastered and the flags shrink once it reaches the screen height. With all 468 flags mastered (both games) it still fits without scrolling (about 13px flags on a laptop, 7px on a phone).

**Game picker:** Brazil, Italy and Russia on Guess the Flag; Australia with "Aa Ee Oo" on Guess the Country.

**Social sharing:** a 1200×630 preview image (`public/og-image.png`) plus Open Graph, X/Twitter and structured-data tags pointing to `https://flagquiz.aossie.org/`.

**Populations and continents**
- REST Countries has retired its API, so I used GeoNames (CC BY 4.0). Its populations agree within 10% with the World Bank's 2024 figures for all 216 shared countries.
- Russia, Türkiye, Kazakhstan, Egypt, Azerbaijan and Georgia are listed under both of their continents.
- The data script is now `npm run fetch-countries`.
- A 🌍 menu button opens a screen where each continent is shown with the flags of its three most populous countries, plus a slider for N and a live count. Defaults: all continents, N = 100.

**Decisions to check**
- "Top N" means the N most populous countries within the selected continents.
- If the filter leaves fewer countries than a round needs, extra wrong options come from the rest of the world.
- Removing the logo departs from the original brief; the brand colours and font are still used.

---

## 4. User

> * Export our chat history as "prompts/chat.md".
>
> * Commit everything.
