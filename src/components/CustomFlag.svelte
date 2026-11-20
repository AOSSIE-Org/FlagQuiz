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
  {:else}
    <rect width="30" height="20" fill={a} />
    <circle cx="15" cy="10" r="6.5" fill={b} />
    <circle cx="15" cy="10" r="3" fill={c} />
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
