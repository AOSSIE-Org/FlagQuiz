<script lang="ts">
  import { OPTION_COUNT, type Difficulty } from '../lib/types';

  let { difficulty }: { difficulty: Difficulty } = $props();
  let cells = $derived(
    Array.from({ length: OPTION_COUNT[difficulty] }, (_, i) => ({ x: (i % 3) * 8, y: Math.floor(i / 3) * 8 })),
  );
</script>

<!-- A mini grid with as many cells as options in a round (3, 6 or 9). -->
<svg viewBox="0 0 22 22" width="1em" height="1em" aria-hidden="true">
  {#each cells as cell, i (i)}
    <rect x={cell.x} y={cell.y + (3 - Math.ceil(cells.length / 3)) * 4} width="6" height="6" rx="1.5" fill="currentColor" />
  {/each}
</svg>
