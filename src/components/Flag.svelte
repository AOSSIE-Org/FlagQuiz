<script lang="ts">
  import type { Country } from '../data/countries';

  interface Props {
    country: Country;
    /** Whether the image is decorative (the name is given elsewhere). */
    decorative?: boolean;
    class?: string;
  }

  let { country, decorative = false, class: className = '' }: Props = $props();
</script>

<!--
  Fits the flag inside its container (which must establish a size container)
  while keeping the real proportions of the flag.
-->
<img
  class="flag {className}"
  src="./flags/{country.code.toLowerCase()}.svg"
  alt={decorative ? '' : country.name}
  draggable="false"
  style:--ratio={country.ratio}
/>

<style>
  .flag {
    aspect-ratio: var(--ratio);
    width: min(100cqw, 100cqh * var(--ratio));
    height: auto;
    max-width: 100%;
    border-radius: 4px;
    box-shadow: 0 0 0 1px rgb(0 0 0 / 0.12);
    background: var(--surface);
  }
</style>
