<script lang="ts">
  import { Check, Volume2 } from '@lucide/svelte';
  import { app } from '../lib/app.svelte';
  import { speak } from '../lib/speech';
  import type { Country } from '../data/countries';
  import Flag from './Flag.svelte';

  function choose(country: Country) {
    if (app.answer(country.code) === 'wrong') speak(country.name);
  }

  // Last known mouse position, to know what is under a stationary mouse.
  let mouse: { x: number; y: number } | null = null;
  /**
   * When a new round appears, the name under the (unmoved) mouse is muted
   * until the mouse leaves it: only a deliberate hover is spoken.
   */
  let muted: string | null = null;

  $effect(() => {
    app.round?.id; // runs after each new round is rendered
    muted = null;
    if (!mouse) return;
    const el = document.elementFromPoint(mouse.x, mouse.y)?.closest<HTMLElement>('[data-code]');
    muted = el?.dataset.code ?? null;
  });

  function trackMouse(e: PointerEvent) {
    if (e.pointerType === 'mouse') mouse = { x: e.clientX, y: e.clientY };
  }

  function hover(e: PointerEvent, country: Country) {
    if (e.pointerType !== 'mouse' || muted === country.code) return;
    speak(country.name);
  }

  function leave(country: Country) {
    if (muted === country.code) muted = null;
  }
</script>

<svelte:window onpointermove={trackMouse} onpointerdown={trackMouse} />

{#if app.round}
  {@const round = app.round}
  <section class="game" aria-label="Guess the Country">
    <div class="prompt-row">
      <div class="prompt-box">
        {#key round.id}
          <Flag country={round.target} decorative class="prompt-flag" />
        {/key}
      </div>
    </div>

    {#key round.id}
      <ul class="grid" style:--rows={Math.ceil(round.options.length / 3)}>
        {#each round.options as country (country.code)}
          {@const wrong = round.wrong.includes(country.code)}
          {@const correct = round.solved && country.code === round.target.code}
          <li class="cell" class:wrong class:correct>
            <button
              class="name"
              data-code={country.code}
              aria-disabled={wrong || round.solved}
              onclick={() => choose(country)}
              onpointerenter={(e) => hover(e, country)}
              onpointerleave={() => leave(country)}
            >
              <span>{country.name}</span>
              {#if correct}
                <span class="badge" aria-hidden="true"><Check size="70%" strokeWidth={4} /></span>
              {/if}
            </button>
            <!-- Touch screens have no hover: offer an explicit "listen" button. -->
            <button class="listen" onclick={() => speak(country.name)} aria-label="{country.name}: listen">
              <Volume2 size="100%" aria-hidden="true" />
            </button>
            <span class="reveal">
              {#if wrong}
                <Flag {country} />
              {/if}
            </span>
          </li>
        {/each}
      </ul>
    {/key}
  </section>
{/if}

<style>
  .game {
    height: 100%;
    display: grid;
    grid-template-rows: auto minmax(0, 1fr);
    gap: clamp(6px, 2vmin, 16px);
  }
  .prompt-row {
    display: flex;
    justify-content: center;
    padding-inline: var(--side-reserve);
  }
  .prompt-box {
    container-type: size;
    width: 100%;
    height: clamp(70px, 26dvh, 260px);
    display: grid;
    place-items: center;
  }
  .prompt-box :global(.prompt-flag) {
    box-shadow:
      0 0 0 1px rgb(0 0 0 / 0.12),
      var(--shadow);
    animation: appear 0.25s ease;
  }
  .grid {
    list-style: none;
    margin: 0;
    padding: 0;
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    grid-template-rows: repeat(var(--rows), minmax(0, 1fr));
    gap: clamp(6px, 1.6vmin, 14px);
    min-height: 0;
  }
  .cell {
    position: relative;
    min-height: 0;
    display: grid;
    grid-template-rows: minmax(0, 1fr) minmax(0, 0.9fr);
    gap: clamp(3px, 0.8vmin, 6px);
  }
  .name {
    position: relative;
    container-type: size;
    min-height: 0;
    display: grid;
    place-items: center;
    padding: 0 clamp(8px, 2vmin, 16px);
    border-radius: var(--radius);
    background: var(--surface);
    border: 3px solid transparent;
    transition:
      transform 0.12s ease,
      border-color 0.12s ease;
  }
  .name span:first-child {
    font-size: clamp(12px, min(8cqw, 40cqh), 30px);
    font-weight: 700;
    line-height: 1.15;
    text-align: center;
    text-wrap: balance;
    overflow: hidden;
  }
  .name:hover:not([aria-disabled='true']) {
    border-color: var(--gold);
    transform: translateY(-2px);
  }
  .name[aria-disabled='true'] {
    cursor: default;
  }
  .wrong .name {
    color: var(--bad);
    border-color: var(--bad);
    animation: shake 0.35s ease;
  }
  .correct .name {
    background: var(--ok);
    color: #fff;
    animation: pop 0.35s ease;
  }
  .badge {
    position: absolute;
    right: 6px;
    top: 50%;
    translate: 0 -50%;
    display: grid;
    place-items: center;
    width: clamp(22px, 60cqh, 44px);
    aspect-ratio: 1;
    border-radius: 50%;
    background: #fff;
    color: var(--ok);
  }
  .listen {
    display: none;
    position: absolute;
    top: 4px;
    right: 4px;
    width: clamp(26px, 6vmin, 40px);
    height: clamp(26px, 6vmin, 40px);
    padding: 5px;
    border-radius: 50%;
    background: var(--bg);
    color: var(--green);
    box-shadow: 0 1px 4px rgb(0 0 0 / 0.2);
  }
  @media (hover: none) {
    .listen {
      display: block;
    }
    .name {
      padding-right: clamp(30px, 7vmin, 46px);
    }
  }
  .reveal {
    container-type: size;
    min-height: 0;
    display: grid;
    place-items: center;
  }
  .reveal :global(.flag) {
    animation: appear 0.25s ease;
  }
  @keyframes appear {
    from {
      opacity: 0;
      transform: scale(0.9);
    }
  }
  @keyframes shake {
    20%,
    60% {
      transform: translateX(-5px);
    }
    40%,
    80% {
      transform: translateX(5px);
    }
  }
  @keyframes pop {
    0% {
      transform: scale(0.92);
    }
    60% {
      transform: scale(1.05);
    }
  }
</style>
