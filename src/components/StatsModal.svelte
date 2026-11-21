<script lang="ts">
  import { CircleCheck, Flame, Star, Trophy, X } from '@lucide/svelte';
  import { untrack } from 'svelte';
  import { app, availableIn } from '../lib/app.svelte';
  import { COUNTRIES, type Country } from '../data/countries';
  import { dayKey, lastDays } from '../lib/dates';
  import { countryName, i18n, num, t } from '../lib/i18n.svelte';
  import { isMastered } from '../lib/select';
  import { GAMES, type GameId } from '../lib/types';
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
    const items = COUNTRIES.filter(availableIn(game));
    const mastered = items
      .filter((country) => isMastered(stats.get(country.code)))
      .sort((a, b) => i18n.collator.compare(countryName(a.code), countryName(b.code)));
    return { game, mastered, total: items.length, score: app.user!.scores[game] };
  }

  let games = $derived(app.user ? GAMES.map(summary) : []);

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

<Modal label={t('statistics')} onclose={() => (app.statsOpen = false)} wide>
  {#if app.user}
    <div class="stats" bind:this={content} style:--flag-h="{flagH}px" style:--gap="{GAP}px">
      <div class="top">
        <div class="streak" title={t('daysInARow')}>
          <Flame class="flame" size="1.6em" aria-hidden="true" />
          <span class="big" aria-label={t('scoreValue', { label: t('daysInARow'), value: app.dayStreak.current })}>
            {num(app.dayStreak.current)}
          </span>
          <span class="best" title={t('best')}>
            <Trophy size="1em" aria-label={t('best')} />{num(app.dayStreak.best)}
          </span>
        </div>
        <div class="calendar" role="img" aria-label={t('daysPlayed')} title={t('daysPlayed')}>
          {#each days as day (day)}
            <span class="day" class:on={played.has(day)} class:today={day === today} title={day}></span>
          {/each}
        </div>
      </div>

      <table>
        <colgroup>
          <col class="c-game" />
          <col class="c-num" />
          <col class="c-num" />
          <col />
        </colgroup>
        <thead>
          <tr>
            <th scope="col"><span class="visually-hidden">{t('game')}</span></th>
            <th scope="col" title={t('bestSilverStars')}>
              <span class="head"><Star class="silver-star" aria-hidden="true" /><Trophy class="trophy" aria-hidden="true" /></span>
              <span class="visually-hidden">{t('bestSilverStars')}</span>
            </th>
            <th scope="col" title={t('bestGoldStars')}>
              <span class="head"><Star class="gold-star" aria-hidden="true" /><Trophy class="trophy" aria-hidden="true" /></span>
              <span class="visually-hidden">{t('bestGoldStars')}</span>
            </th>
            <th scope="col" title={t('mastered')}>
              <span class="head start"><CircleCheck class="check" aria-hidden="true" /></span>
              <span class="visually-hidden">{t('mastered')}</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {#each games as g (g.game)}
            <tr>
              <th scope="row" class="game-icon" title={t(`game.${g.game}`)}>
                <GameIcon game={g.game} />
                <span class="visually-hidden">{t(`game.${g.game}`)}</span>
              </th>
              <td class="num">{num(g.score.bestSilver)}</td>
              <td class="num">{num(g.score.bestGold)}</td>
              <td class="mastered-cell">
                <span class="count" aria-label={t('masteredCount', { n: g.mastered.length, total: g.total })}>
                  {num(g.mastered.length)}<small>/{num(g.total)}</small>
                </span>
                {#if g.mastered.length}
                  <div class="mastered-flags">
                    {#each g.mastered as country (country.code)}
                      <img
                        src="./flags/{country.code.toLowerCase()}.svg"
                        alt={countryName(country.code)}
                        title={countryName(country.code)}
                        style:aspect-ratio={country.ratio}
                      />
                    {/each}
                  </div>
                {/if}
              </td>
            </tr>
          {/each}
        </tbody>
      </table>

      <button class="icon-btn close" onclick={() => (app.statsOpen = false)} aria-label={t('close')} title={t('close')}>
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
  .top {
    display: grid;
    grid-template-columns: auto minmax(0, 1fr);
    align-items: center;
    gap: clamp(10px, 3vmin, 24px);
    padding: clamp(6px, 1.4vmin, 12px) clamp(10px, 2.4vmin, 18px);
    border-radius: var(--radius);
    background: var(--surface);
  }
  .streak {
    display: flex;
    align-items: center;
    gap: 10px;
    font-size: clamp(14px, 3.2vmin, 22px);
  }
  .streak :global(.flame) {
    color: #ff8200;
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
    grid-template-columns: repeat(14, 1fr);
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
  table {
    width: 100%;
    table-layout: fixed;
    border-collapse: separate;
    border-spacing: 0 clamp(4px, 1vmin, 8px);
    margin-block: calc(-1 * clamp(4px, 1vmin, 8px));
  }
  .c-game {
    width: clamp(44px, 9vmin, 64px);
  }
  .c-num {
    width: clamp(64px, 13vmin, 96px);
  }
  th,
  td {
    padding: clamp(4px, 1vmin, 8px) clamp(6px, 1.4vmin, 12px);
    vertical-align: middle;
    text-align: center;
  }
  thead th {
    padding-block: 0;
  }
  tbody th,
  tbody td {
    background: var(--surface);
  }
  tbody th {
    border-start-start-radius: var(--radius);
    border-end-start-radius: var(--radius);
  }
  tbody td:last-child {
    border-start-end-radius: var(--radius);
    border-end-end-radius: var(--radius);
  }
  .head {
    display: inline-flex;
    align-items: center;
    gap: 2px;
  }
  .head :global(svg) {
    width: clamp(20px, 4.4vmin, 28px);
    height: clamp(20px, 4.4vmin, 28px);
  }
  .head :global(.trophy) {
    width: clamp(13px, 2.8vmin, 18px);
    height: clamp(13px, 2.8vmin, 18px);
    color: var(--muted);
  }
  .head.start {
    display: flex;
    justify-content: flex-start;
  }
  .head :global(.silver-star) {
    color: var(--silver-edge);
    fill: var(--silver);
  }
  .head :global(.gold-star) {
    color: var(--gold);
    fill: var(--gold);
  }
  .head :global(.check) {
    color: var(--green);
  }
  .game-icon {
    color: var(--green);
  }
  .game-icon :global(svg) {
    display: block;
    margin-inline: auto;
  }
  .num {
    font-weight: 900;
    font-size: clamp(16px, 3.6vmin, 26px);
    font-variant-numeric: tabular-nums;
  }
  .mastered-cell {
    text-align: start;
  }
  .count {
    display: block;
    font-weight: 800;
    font-size: clamp(13px, 2.8vmin, 18px);
    color: var(--green);
  }
  .count small {
    color: var(--muted);
    font-weight: 600;
    font-size: 0.8em;
  }
  .mastered-flags {
    display: flex;
    flex-wrap: wrap;
    gap: var(--gap);
    margin-top: 4px;
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
