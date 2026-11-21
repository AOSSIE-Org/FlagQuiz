<script lang="ts">
  import type { Pattern, UserFlag } from '../lib/types';

  interface Props {
    flag: UserFlag;
    /** Pattern override, used to preview patterns with the same colours. */
    pattern?: Pattern;
    class?: string;
  }

  let { flag, pattern, class: className = '' }: Props = $props();
  let p = $derived(pattern ?? flag.pattern);
  let [a, b, c] = $derived(flag.colors);

  /** Points of a five-pointed star centred at (cx, cy) with outer radius r. */
  function star(cx: number, cy: number, r: number): string {
    const pts: string[] = [];
    for (let i = 0; i < 10; i++) {
      const radius = i % 2 === 0 ? r : r * 0.382;
      const angle = -Math.PI / 2 + (i * Math.PI) / 5;
      pts.push(`${(cx + radius * Math.cos(angle)).toFixed(2)},${(cy + radius * Math.sin(angle)).toFixed(2)}`);
    }
    return pts.join(' ');
  }
</script>

<svg class="custom-flag {className}" viewBox="0 0 30 20" aria-hidden="true">
  {#if p === 'vbands'}
    <rect width="10" height="20" fill={a} />
    <rect x="10" width="10" height="20" fill={b} />
    <rect x="20" width="10" height="20" fill={c} />
  {:else if p === 'hbands'}
    <rect width="30" height="6.67" fill={a} />
    <rect y="6.67" width="30" height="6.67" fill={b} />
    <rect y="13.33" width="30" height="6.67" fill={c} />
  {:else if p === 'nordic'}
    <rect width="30" height="20" fill={a} />
    <rect x="8" width="6" height="20" fill={b} />
    <rect y="7" width="30" height="6" fill={b} />
    <rect x="9.75" width="2.5" height="20" fill={c} />
    <rect y="8.75" width="30" height="2.5" fill={c} />
  {:else if p === 'diagonal'}
    <polygon points="0,0 30,0 0,20" fill={a} />
    <polygon points="30,0 30,20 0,20" fill={c} />
    <line x1="-1" y1="20.67" x2="31" y2="-0.67" stroke={b} stroke-width="6" />
  {:else if p === 'hoist'}
    <rect width="30" height="10" fill={a} />
    <rect y="10" width="30" height="10" fill={b} />
    <polygon points="0,0 14,10 0,20" fill={c} />
  {:else if p === 'disc'}
    <rect width="30" height="20" fill={a} />
    <circle cx="15" cy="10" r="6.5" fill={b} />
    <circle cx="15" cy="10" r="3" fill={c} />
  {:else if p === 'rhombus'}
    <!-- Like Brazil: a rhombus with a circle inside. -->
    <rect width="30" height="20" fill={a} />
    <polygon points="15,2 28,10 15,18 2,10" fill={b} />
    <circle cx="15" cy="10" r="4.2" fill={c} />
  {:else if p === 'cross'}
    <!-- Like Switzerland: a centred cross. -->
    <rect width="30" height="20" fill={a} />
    <rect x="12.5" y="3" width="5" height="14" fill={b} />
    <rect x="8" y="7.5" width="14" height="5" fill={b} />
    <circle cx="15" cy="10" r="1.6" fill={c} />
  {:else if p === 'starDisc'}
    <!-- A star inside a circle. -->
    <rect width="30" height="20" fill={a} />
    <circle cx="15" cy="10" r="7" fill={c} />
    <polygon points={star(15, 10.4, 5.6)} fill={b} />
  {:else if p === 'crescent'}
    <!-- A crescent moon and a star. -->
    <rect width="30" height="20" fill={a} />
    <circle cx="12.5" cy="10" r="5.5" fill={b} />
    <circle cx="14" cy="10" r="4.4" fill={a} />
    <polygon points={star(19.2, 10, 2.6)} fill={c} />
  {:else if p === 'canton'}
    <!-- Like Chile: two bands and a canton with a star. -->
    <rect width="30" height="10" fill={a} />
    <rect y="10" width="30" height="10" fill={c} />
    <rect width="10" height="10" fill={b} />
    <polygon points={star(5, 5.3, 3.3)} fill={a} />
  {:else}
    <!-- Three stars on a central band. -->
    <rect width="30" height="20" fill={a} />
    <rect y="5" width="30" height="10" fill={b} />
    <polygon points={star(8, 10.3, 3.2)} fill={c} />
    <polygon points={star(15, 10.3, 3.2)} fill={c} />
    <polygon points={star(22, 10.3, 3.2)} fill={c} />
  {/if}
</svg>

<style>
  .custom-flag {
    display: block;
    aspect-ratio: 3 / 2;
    border-radius: 4px;
    box-shadow: 0 0 0 1px rgb(0 0 0 / 0.15);
  }
</style>
