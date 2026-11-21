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

  // Say the country's name whenever a new round starts (or the language changes).
  $effect(() => {
    app.round?.id;
    const name = app.round && countryName(app.round.target.code);
    untrack(() => name && speak(name));
  });

  function choose(country: Country) {
    if (app.answer(country.code) === 'wrong') speak(`${capitalName(country.code)}, ${countryName(country.code)}`);
  }
</script>

{#if app.round}
  {@const round = app.round}
  {@const target = countryName(round.target.code)}
  <section class="game" aria-label={t('game.capital')}>
    <div class="prompt-row">
      <button
        class="prompt"
        data-hover-speech
        onclick={() => speak(target)}
        onpointerenter={(e) => hover.enter(e, target)}
        onpointerleave={hover.leave}
        aria-label={t('listen', { name: target })}
      >
        <span class="prompt-flag"><Flag country={round.target} decorative /></span>
        <span class="name">{target}</span>
        <Volume2 class="speaker" aria-hidden="true" />
      </button>
    </div>

    {#key round.id}
      <ul class="grid" style:--rows={Math.ceil(round.options.length / 3)}>
        {#each round.options as country (country.code)}
          {@const capital = capitalOf.get(country.code)!}
          {@const name = capitalName(country.code)}
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
              <span class="capital-name">{name}</span>
              <CapitalPhotos {capital} class="cell-photos" />
              {#if wrong || correct}
                <!-- Whose capital it is. -->
                <span class="owner">
                  <span class="owner-flag"><Flag {country} decorative /></span>
                  {countryName(country.code)}
                </span>
              {/if}
              {#if correct}
                <span class="badge" aria-hidden="true"><Check size="70%" strokeWidth={4} /></span>
              {/if}
            </button>
            <!-- Touch screens have no hover: offer an explicit "listen" button. -->
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
    display: flex;
    justify-content: center;
    padding-inline: var(--side-reserve);
    min-height: var(--header-h);
    align-items: center;
  }
  .prompt {
    display: inline-flex;
    align-items: center;
    gap: 0.4em;
    max-width: 100%;
    padding: 0.15em 0.5em;
    border-radius: var(--radius);
    font-size: clamp(20px, 5.5vmin, 46px);
    font-weight: 800;
    line-height: 1.1;
  }
  .prompt:hover {
    background: var(--surface);
  }
  .prompt-flag {
    container-type: size;
    display: grid;
    place-items: center;
    width: 1.6em;
    height: 1.1em;
    flex-shrink: 0;
  }
  .prompt :global(.speaker) {
    flex-shrink: 0;
    width: 0.7em;
    height: 0.7em;
    color: var(--green);
  }
  .name {
    text-wrap: balance;
    text-align: center;
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
    .capital-name {
      padding-inline-end: clamp(28px, 6.5vmin, 40px);
    }
    .badge {
      top: auto;
      bottom: 6px;
    }
  }
  .cell {
    position: relative;
    min-height: 0;
    display: grid;
    grid-template-rows: auto minmax(0, 1fr);
    gap: clamp(2px, 0.8vmin, 8px);
    padding: clamp(4px, 1.2vmin, 10px);
    border-radius: var(--radius);
    background: var(--surface);
    border: 3px solid transparent;
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
  .capital-name {
    font-weight: 800;
    font-size: clamp(13px, 3vmin, 24px);
    line-height: 1.15;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .cell :global(.cell-photos) {
    width: 100%;
    height: 100%;
  }
  .wrong {
    border-color: var(--bad);
    animation: shake 0.35s ease;
  }
  .wrong .capital-name {
    color: var(--bad);
  }
  .correct {
    border-color: var(--ok);
    animation: pop 0.35s ease;
  }
  .correct .capital-name {
    color: var(--ok);
  }
  .owner {
    position: absolute;
    left: 50%;
    bottom: clamp(6px, 1.6vmin, 14px);
    translate: -50% 0;
    display: inline-flex;
    align-items: center;
    gap: 6px;
    max-width: 92%;
    padding: 3px 10px 3px 4px;
    border-radius: 999px;
    background: var(--bg);
    box-shadow: var(--shadow);
    font-weight: 800;
    font-size: clamp(11px, 2.4vmin, 17px);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    animation: pop 0.3s ease;
  }
  .wrong .owner {
    color: var(--bad);
  }
  .correct .owner {
    color: var(--ok);
  }
  .owner-flag {
    container-type: size;
    display: grid;
    place-items: center;
    width: 2em;
    height: 1.4em;
    flex-shrink: 0;
  }
  .badge {
    position: absolute;
    top: 6px;
    inset-inline-end: 6px;
    display: grid;
    place-items: center;
    width: clamp(24px, 6vmin, 40px);
    aspect-ratio: 1;
    border-radius: 50%;
    background: var(--ok);
    color: #fff;
    animation: pop 0.3s ease;
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
