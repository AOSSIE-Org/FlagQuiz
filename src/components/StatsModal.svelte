<script lang="ts">
  import { CircleCheck, Flame, Star, Trophy, X } from '@lucide/svelte';
  import { untrack } from 'svelte';
  import { app } from '../lib/app.svelte';
  import { COUNTRIES, type Country } from '../data/countries';
  import { dayKey, lastDays } from '../lib/dates';
  import { isMastered } from '../lib/select';
  import { availableIn } from '../lib/app.svelte';
  import { GAME_NAMES, GAMES, type GameId } from '../lib/types';
  import GameIcon from './GameIcon.svelte';
  import Modal from './Modal.svelte';

  /** Largest and smallest height of a mastered flag, and the gap between flags (px). */
  const MAX_FLAG_H = 40;
  const MIN_FLAG_H = 6;
  const GAP = 4;

  const today = dayKey();
  let played = $derived(new Set(app.playDays));
  let days = $derived(lastDays(28, today));

  function summary(game: GameId) {
    const stats = app.statsFor(game);
    let c = 0;
    let d = 0;
    for (const counts of stats.values()) {
      c += counts.c;
      d += counts.d;
    }
    const items = COUNTRIES.filter(availableIn(game));
    const mastered = items.filter((country) => isMastered(stats.get(country.code))).sort((a, b) =>
      a.name.localeCompare(b.name),
    );
    return { accuracy: c + d ? Math.round((100 * c) / (c + d)) : null, mastered, total: items.length };
  }

  const games = GAMES.map((game) => ({ game, ...summary(game) }));
  const R = 15.9155; // circumference = 100

  let content = $state<HTMLDivElement>();
  let flagH = $state(MAX_FLAG_H);

  /** Number of rows that flex-wrap needs for `flags` of height `h` in width `width`. */
  function rowsNeeded(flags: readonly Country[], h: number, width: number): number {
    let rows = 1;
    let x = 0;
    for (const f of flags) {
      const w = h * f.ratio;
      if (x > 0 && x + GAP + w > width) {
        rows++;
        x = w;
      } else {
        x += (x > 0 ? GAP : 0) + w;
      }
    }
    return rows;
  }

  /**
   * Picks the largest flag height such that all mastered flags fit in the
   * space left on screen, so the modal grows with them but never overflows.
   */
  function fit() {
    if (!content) return;
    const areas = [...content.querySelectorAll<HTMLElement>('.mastered-flags')];
    if (areas.length === 0) return;
    const panel = content.closest<HTMLElement>('[role="dialog"]')!;
    const scrim = panel.parentElement!;
    const ps = getComputedStyle(panel);
    const ss = getComputedStyle(scrim);
    const maxPanel = scrim.clientHeight - parseFloat(ss.paddingTop) - parseFloat(ss.paddingBottom);
    const fixed = content.offsetHeight - areas.reduce((sum, a) => sum + a.offsetHeight, 0);
    const avail = maxPanel - parseFloat(ps.paddingTop) - parseFloat(ps.paddingBottom) - fixed;
    const width = areas[0].clientWidth - 1;
    const lists = games.map((g) => g.mastered).filter((l) => l.length > 0);
    for (let h = MAX_FLAG_H; h >= MIN_FLAG_H; h--) {
      const total = lists.reduce((sum, l) => sum + rowsNeeded(l, h, width) * (h + GAP) - GAP, 0);
      if (total <= avail) {
        flagH = h;
        return;
      }
    }
    flagH = MIN_FLAG_H;
  }

  $effect(() => {
    if (content) untrack(fit);
  });
</script>

<svelte:window onresize={fit} />

<Modal label="Statistics" onclose={() => (app.statsOpen = false)} wide>
  {#if app.user}
    <div class="stats" bind:this={content} style:--flag-h="{flagH}px" style:--gap="{GAP}px">
      <div class="cards">
        <div class="card" title="Days in a row">
          <Flame class="flame" size="1.6em" aria-hidden="true" />
          <span class="big">{app.dayStreak.current}</span>
          <span class="best" title="Best"><Trophy size="1em" aria-label="Best" />{app.dayStreak.best}</span>
        </div>
        <div class="card" title="Correct answers">
          <CircleCheck class="check" size="1.6em" aria-hidden="true" />
          <span class="big">{app.user.correctCount}</span>
        </div>
        <div class="card" title="Rounds without mistakes">
          <Star class="star" size="1.6em" aria-hidden="true" />
          <span class="big">{app.user.perfectRun}</span>
          <span class="best" title="Best"><Trophy size="1em" aria-label="Best" />{app.user.bestPerfectRun}</span>
        </div>
      </div>

      <div class="calendar" aria-label="Days played in the last 4 weeks">
        {#each days as day (day)}
          <span class="day" class:on={played.has(day)} class:today={day === today} title={day}></span>
        {/each}
      </div>

      {#each games as g (g.game)}
        <section class="game" aria-label={GAME_NAMES[g.game]}>
          <div class="summary">
            <span class="game-icon" title={GAME_NAMES[g.game]}>
              <GameIcon game={g.game} />
            </span>
            <svg class="ring" viewBox="0 0 36 36" aria-label="Correct: {g.accuracy ?? 0}%">
              <circle cx="18" cy="18" r={R} class="track" />
              {#if g.accuracy}
                <circle cx="18" cy="18" r={R} class="value" stroke-dasharray="{g.accuracy} 100" />
              {/if}
              <text x="18" y="21.5" text-anchor="middle">{g.accuracy === null ? '–' : `${g.accuracy}%`}</text>
            </svg>
            <span class="mastered" title="Mastered">
              <CircleCheck size="1.2em" aria-hidden="true" />{g.mastered.length}<small>/{g.total}</small>
            </span>
          </div>
          {#if g.mastered.length}
            <div class="mastered-flags">
              {#each g.mastered as country (country.code)}
                <img
                  src="./flags/{country.code.toLowerCase()}.svg"
                  alt={country.name}
                  title={country.name}
                  style:aspect-ratio={country.ratio}
                />
              {/each}
            </div>
          {/if}
        </section>
      {/each}

      <button class="icon-btn close" onclick={() => (app.statsOpen = false)} aria-label="Close" title="Close">
        <X size={26} />
      </button>
    </div>
  {/if}
</Modal>

<style>
  .stats {
    display: grid;
    gap: clamp(8px, 2vmin, 16px);
    width: min(900px, 90vw);
  }
  .cards {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: clamp(8px, 2vmin, 16px);
  }
  .card {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 12px;
    padding: clamp(4px, 1.4vmin, 12px);
    border-radius: var(--radius);
    background: var(--surface);
    font-size: clamp(14px, 3.2vmin, 22px);
  }
  .card :global(.flame) {
    color: #ff8200;
    fill: var(--gold);
  }
  .card :global(.check) {
    color: var(--green);
  }
  .card :global(.star) {
    color: var(--gold);
    fill: var(--gold);
  }
  .big {
    font-size: 1.8em;
    font-weight: 900;
    font-variant-numeric: tabular-nums;
  }
  .best {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    color: var(--muted);
    font-weight: 700;
  }
  .calendar {
    display: grid;
    grid-template-columns: repeat(28, 1fr);
    gap: clamp(2px, 0.6vmin, 5px);
  }
  .day {
    aspect-ratio: 1;
    max-height: 18px;
    border-radius: 4px;
    background: var(--surface-2);
  }
  .day.on {
    background: var(--green);
  }
  .day.today {
    outline: 2px solid var(--gold);
    outline-offset: 1px;
  }
  .game {
    display: grid;
    gap: 8px;
    padding: clamp(6px, 1.4vmin, 12px) clamp(10px, 2.4vmin, 18px);
    border-radius: var(--radius);
    background: var(--surface);
  }
  .summary {
    display: flex;
    align-items: center;
    gap: clamp(10px, 3vmin, 24px);
  }
  .game-icon {
    color: var(--green);
    display: grid;
  }
  .ring {
    width: clamp(36px, 8vmin, 56px);
    height: clamp(36px, 8vmin, 56px);
  }
  .ring circle {
    fill: none;
    stroke-width: 3.6;
  }
  .ring .track {
    stroke: var(--surface-2);
  }
  .ring .value {
    stroke: var(--green);
    stroke-linecap: round;
    transform: rotate(-90deg);
    transform-origin: 50% 50%;
  }
  .ring text {
    fill: var(--text);
    font-size: 9px;
    font-weight: 800;
  }
  .mastered {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    font-weight: 800;
    font-size: clamp(14px, 3vmin, 20px);
    color: var(--green);
  }
  .mastered small {
    color: var(--muted);
    font-weight: 600;
    font-size: 0.7em;
  }
  .mastered-flags {
    display: flex;
    flex-wrap: wrap;
    gap: var(--gap);
  }
  .mastered-flags img {
    height: var(--flag-h);
    width: auto;
    border-radius: 2px;
    box-shadow: 0 0 0 1px rgb(0 0 0 / 0.12);
  }
  .close {
    justify-self: end;
  }
</style>
