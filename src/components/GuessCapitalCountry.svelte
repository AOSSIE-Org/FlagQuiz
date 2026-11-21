<script lang="ts">
  import { Check, Volume2 } from '@lucide/svelte';
  import { untrack } from 'svelte';
  import { CAPITALS } from '../data/capitals';
  import type { Country } from '../data/countries';
  import { app } from '../lib/app.svelte';
  import { speak } from '../lib/speech';
  import { hoverSpeech } from '../lib/hoverSpeech.svelte';
  import { capitalName, countryName, t } from '../lib/i18n.svelte';
  import CapitalPhotos from './CapitalPhotos.svelte';
  import Flag from './Flag.svelte';

  const capitalOf = new Map(CAPITALS.map((c) => [c.code, c]));
  const hover = hoverSpeech(() => app.round?.id);

  // Say the capital's name whenever a new round starts (or the language changes).
  $effect(() => {
    app.round?.id;
    const name = app.round && capitalName(app.round.target.code);
    untrack(() => name && speak(name));
  });

  function choose(country: Country) {
    if (app.answer(country.code) === 'wrong') speak(`${countryName(country.code)}, ${capitalName(country.code)}`);
  }
</script>

{#if app.round}
  {@const round = app.round}
  {@const capital = capitalOf.get(round.target.code)!}
  {@const target = capitalName(round.target.code)}
  <section class="game" aria-label={t('game.capitalCountry')}>
    <div class="prompt-row">
      <button
        class="prompt"
        data-hover-speech
        onclick={() => speak(target)}
        onpointerenter={(e) => hover.enter(e, target)}
        onpointerleave={hover.leave}
        aria-label={t('listen', { name: target })}
      >
        <Volume2 class="speaker" aria-hidden="true" />
        <span class="name">{target}</span>
      </button>
      {#key round.id}
        <CapitalPhotos {capital} class="prompt-photos" />
      {/key}
    </div>

    {#key round.id}
      <ul class="grid" style:--rows={Math.ceil(round.options.length / 3)}>
        {#each round.options as country (country.code)}
          {@const name = countryName(country.code)}
          {@const wrong = round.wrong.includes(country.code)}
          {@const correct = round.solved && country.code === round.target.code}
          <li>
            <button
              class="cell"
              class:wrong
              class:correct
              data-hover-speech
              aria-disabled={wrong || round.solved}
              onclick={() => choose(country)}
              onpointerenter={(e) => hover.enter(e, name)}
              onpointerleave={hover.leave}
            >
              <span class="flag-box"><Flag {country} decorative /></span>
              <span class="country-name">{name}</span>
              {#if wrong || correct}
                <!-- The capital of the chosen country. -->
                <span class="its-capital">{capitalName(country.code)}</span>
              {/if}
              {#if correct}
                <span class="badge" aria-hidden="true"><Check size="70%" strokeWidth={4} /></span>
              {/if}
            </button>
            <button class="listen" onclick={() => speak(name)} aria-label={t('listen', { name })}>
              <Volume2 size="100%" aria-hidden="true" />
            </button>
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
    gap: clamp(6px, 1.6vmin, 14px);
  }
  .prompt-row {
    display: grid;
    justify-items: center;
    gap: 4px;
    padding-inline: var(--side-reserve);
  }
  .prompt {
    display: inline-flex;
    align-items: center;
    gap: 0.35em;
    max-width: 100%;
    padding: 0.1em 0.5em;
    border-radius: var(--radius);
    font-size: clamp(18px, 5vmin, 40px);
    font-weight: 800;
    line-height: 1.1;
  }
  .prompt:hover {
    background: var(--surface);
  }
  .prompt :global(.speaker) {
    flex-shrink: 0;
    width: 0.75em;
    height: 0.75em;
    color: var(--green);
  }
  .name {
    text-align: center;
  }
  .prompt-row :global(.prompt-photos) {
    width: 100%;
    height: clamp(56px, 22dvh, 200px);
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
  li {
    position: relative;
    min-height: 0;
    display: grid;
  }
  .cell {
    position: relative;
    min-height: 0;
    display: grid;
    grid-template-columns: minmax(0, 0.9fr) minmax(0, 1.3fr);
    grid-template-rows: minmax(0, 1fr) auto;
    align-items: center;
    column-gap: clamp(6px, 1.6vmin, 14px);
    padding: clamp(4px, 1.2vmin, 10px) clamp(6px, 1.6vmin, 14px);
    border-radius: var(--radius);
    background: var(--surface);
    border: 3px solid transparent;
    text-align: left;
    transition:
      transform 0.12s ease,
      border-color 0.12s ease;
  }
  .cell:hover:not([aria-disabled='true']) {
    border-color: var(--gold);
    transform: translateY(-2px);
  }
  .cell[aria-disabled='true'] {
    cursor: default;
  }
  .flag-box {
    grid-row: 1 / 3;
    container-type: size;
    display: grid;
    place-items: center;
    height: 100%;
    min-height: 0;
  }
  .country-name {
    font-weight: 800;
    font-size: clamp(13px, 2.8vmin, 24px);
    line-height: 1.15;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .its-capital {
    font-weight: 700;
    font-size: clamp(11px, 2.2vmin, 17px);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .wrong {
    border-color: var(--bad);
    animation: shake 0.35s ease;
  }
  .wrong .country-name,
  .wrong .its-capital {
    color: var(--bad);
  }
  .correct {
    border-color: var(--ok);
    animation: pop 0.35s ease;
  }
  .correct .country-name,
  .correct .its-capital {
    color: var(--ok);
  }
  .badge {
    position: absolute;
    bottom: 6px;
    inset-inline-end: 6px;
    display: grid;
    place-items: center;
    width: clamp(22px, 5.5vmin, 36px);
    aspect-ratio: 1;
    border-radius: 50%;
    background: var(--ok);
    color: #fff;
    animation: pop 0.3s ease;
  }
  .listen {
    display: none;
    position: absolute;
    top: 4px;
    inset-inline-end: 4px;
    width: clamp(26px, 6vmin, 36px);
    height: clamp(26px, 6vmin, 36px);
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
    .cell {
      padding-inline-end: clamp(30px, 7vmin, 44px);
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
      transform: scale(0.9);
    }
    60% {
      transform: scale(1.04);
    }
  }
</style>
