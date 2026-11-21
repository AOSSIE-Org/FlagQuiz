<script lang="ts">
  import { CircleCheck, Flame, Star } from '@lucide/svelte';
  import { app } from '../lib/app.svelte';
</script>

{#if app.user}
  <div class="streaks">
    <span class="chip" title="Days in a row" aria-label="{app.dayStreak.current} days in a row">
      <Flame class="flame" aria-hidden="true" />{app.dayStreak.current}
    </span>
    <span class="chip" title="Rounds without mistakes" aria-label="{app.user.perfectRun} rounds without mistakes">
      <Star class="star" aria-hidden="true" />{app.user.perfectRun}
    </span>
    <span class="chip" title="Correct answers" aria-label="{app.user.correctCount} correct answers">
      <CircleCheck class="check" aria-hidden="true" />{app.user.correctCount}
    </span>
  </div>
{/if}

<style>
  .streaks {
    display: flex;
    align-items: center;
    gap: clamp(10px, 2.5vmin, 22px);
  }
  .chip {
    display: inline-flex;
    align-items: center;
    gap: 0.2em;
    font-weight: 900;
    font-size: clamp(22px, 5.5vmin, 38px);
    line-height: 1;
    font-variant-numeric: tabular-nums;
  }
  .chip :global(svg) {
    width: 1em;
    height: 1em;
  }
  .chip :global(.flame) {
    color: #ff8200;
    fill: var(--gold);
  }
  .chip :global(.check) {
    color: var(--green);
  }
  .chip :global(.star) {
    color: var(--gold);
    fill: var(--gold);
  }
</style>
