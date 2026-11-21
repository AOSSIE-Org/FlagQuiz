<script lang="ts">
  import type { Capital } from '../data/capitals';

  /** The four photos of a capital: a 2×2 grid, or a single row in wide, short spaces. */
  let { capital, class: className = '' }: { capital: Capital; class?: string } = $props();
</script>

<span class="photos-box {className}">
  <span class="photos">
    {#each capital.photos as photo (photo.src)}
      <img
        src="./{photo.src}"
        alt={photo.title}
        title="{photo.title} — © {photo.author}, {photo.license}"
        loading="lazy"
        draggable="false"
      />
    {/each}
  </span>
</span>

<style>
  .photos-box {
    container-type: size;
    display: grid;
    place-items: center;
    min-height: 0;
    min-width: 0;
  }
  /* 2×2 by default; photos are 3:2. */
  .photos {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 3px;
    aspect-ratio: 3 / 2;
    width: min(100cqw, 100cqh * 1.5);
  }
  /* Wide and short: one row of four. */
  @container (min-aspect-ratio: 4.2 / 1) {
    .photos {
      grid-template-columns: repeat(4, 1fr);
      aspect-ratio: 6 / 1;
      width: min(100cqw, 100cqh * 6);
    }
  }
  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    border-radius: 4px;
    background: var(--surface-2);
  }
</style>
