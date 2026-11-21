<script lang="ts">
  import { CircleCheck, Flame, Star } from '@lucide/svelte';
  import { app } from '../lib/app.svelte';
  import { num, t, type MessageKey } from '../lib/i18n.svelte';

  /** The scores of the current game (the last game played, while choosing one). */
  let score = $derived(app.user?.scores[app.game]);
</script>

{#snippet chip(label: MessageKey, value: number, cls: string, Icon: typeof Star)}
  <span class="chip {cls}" title={t(label)} aria-label={t('scoreValue', { label: t(label), value })}>
    <Icon aria-hidden="true" />{num(value)}
  </span>
{/snippet}

{#if app.user && score}
  <div class="streaks">
    {@render chip('daysInARow', app.dayStreak.current, 'flame', Flame)}
    {@render chip('goldStars', score.gold, 'gold-star', Star)}
    {@render chip('silverStars', score.silver, 'silver-star', Star)}
    {@render chip('correctInGame', score.correct, 'gold-check', CircleCheck)}
    {@render chip('correctInAllGames', app.user.correctCount, 'check', CircleCheck)}
  </div>
{/if}

<style>
  .streaks {
    display: flex;
    align-items: center;
    gap: clamp(8px, 2vmin, 20px);
    min-width: 0;
  }
  .chip {
    display: inline-flex;
    align-items: center;
    gap: 0.15em;
    font-weight: 900;
    font-size: clamp(20px, 5vmin, 36px);
    line-height: 1;
    font-variant-numeric: tabular-nums;
  }
  .chip :global(svg) {
    width: 1em;
    height: 1em;
    flex-shrink: 0;
  }
  .flame :global(svg) {
    color: #ff8200;
    fill: var(--gold);
  }
  .gold-star :global(svg) {
    color: var(--gold);
    fill: var(--gold);
  }
  .silver-star :global(svg) {
    color: var(--silver-edge);
    fill: var(--silver);
  }
  .gold-check :global(svg) {
    color: var(--gold-edge);
    fill: var(--gold);
  }
  .check :global(svg) {
    color: var(--green);
  }
</style>
