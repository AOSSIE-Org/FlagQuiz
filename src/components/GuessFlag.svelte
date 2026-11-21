<script lang="ts">
  import { Check, Volume2 } from '@lucide/svelte';
  import { untrack } from 'svelte';
  import { app } from '../lib/app.svelte';
  import { speak } from '../lib/speech';
  import { hoverSpeech } from '../lib/hoverSpeech.svelte';
  import { countryName, t } from '../lib/i18n.svelte';
  import type { Country } from '../data/countries';
  import Flag from './Flag.svelte';

  const hover = hoverSpeech(() => app.round?.id);

  // Speak the country name whenever a new round starts (or the language changes).
  $effect(() => {
    app.round?.id;
    const name = app.round && countryName(app.round.target.code);
    untrack(() => name && speak(name));
  });

  function choose(country: Country) {
    if (app.answer(country.code) === 'wrong') speak(countryName(country.code));
  }
</script>

{#if app.round}
  {@const round = app.round}
  {@const target = countryName(round.target.code)}
  <section class="game" aria-label={t('game.flag')}>
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
    </div>

    {#key round.id}
      <ul class="grid" style:--rows={Math.ceil(round.options.length / 3)}>
        {#each round.options as country, i (country.code)}
          {@const wrong = round.wrong.includes(country.code)}
          {@const correct = round.solved && country.code === round.target.code}
          <li>
            <button
              class="cell"
              class:wrong
              class:correct
              aria-label={wrong || correct ? countryName(country.code) : t('flagNumber', { n: i + 1 })}
              aria-disabled={wrong || round.solved}
              onclick={() => choose(country)}
            >
              <span class="flag-box">
                <Flag {country} decorative />
                {#if correct}
                  <span class="badge" aria-hidden="true"><Check size="70%" strokeWidth={4} /></span>
                {/if}
              </span>
              <span class="label">{wrong || correct ? countryName(country.code) : ''}</span>
            </button>
          </li>
        {/each}
      </ul>
    {/key}
  </section>
{/if}

<style>
  .game {
    --g: clamp(6px, 2vmin, 18px);
    height: 100%;
    container-type: size;
    display: grid;
    grid-template-rows: auto minmax(0, 1fr);
    gap: clamp(6px, 2vmin, 16px);
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
    padding: 0.15em 0.6em;
    border-radius: var(--radius);
    font-size: clamp(20px, 6vmin, 52px);
    font-weight: 800;
    line-height: 1.1;
    transition: background 0.12s ease;
  }
  .prompt:hover {
    background: var(--surface);
  }
  .prompt :global(.speaker) {
    flex-shrink: 0;
    width: 0.8em;
    height: 0.8em;
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
    gap: var(--g);
    min-height: 0;
    /* Cells no taller than a ~3:2 flag plus its label, so labels hug their flags. */
    align-self: center;
    height: 100%;
    max-height: calc(var(--rows) * ((100cqw - 2 * var(--g)) / 4.6 + 56px) + (var(--rows) - 1) * var(--g));
  }
  li {
    min-height: 0;
    display: grid;
  }
  .cell {
    min-height: 0;
    display: grid;
    grid-template-rows: minmax(0, 1fr) auto;
    gap: 4px;
    padding: clamp(4px, 1.2vmin, 10px);
    border-radius: var(--radius);
    transition: background 0.12s ease;
  }
  .cell:hover:not([aria-disabled='true']) {
    background: var(--surface);
  }
  .cell[aria-disabled='true'] {
    cursor: default;
  }
  .flag-box {
    position: relative;
    container-type: size;
    min-height: 0;
    display: grid;
    place-items: end center;
  }
  .flag-box :global(.flag) {
    transition: transform 0.15s ease;
  }
  .cell:hover:not([aria-disabled='true']) .flag-box :global(.flag) {
    transform: scale(1.03);
  }
  .wrong .flag-box :global(.flag) {
    outline: clamp(3px, 0.8vmin, 6px) solid var(--bad);
    outline-offset: 2px;
    animation: shake 0.35s ease;
  }
  .correct .flag-box :global(.flag) {
    outline: clamp(3px, 0.8vmin, 6px) solid var(--ok);
    outline-offset: 2px;
    animation: pop 0.35s ease;
  }
  .badge {
    position: absolute;
    display: grid;
    place-items: center;
    width: clamp(28px, 30cqh, 72px);
    aspect-ratio: 1;
    border-radius: 50%;
    background: var(--ok);
    color: #fff;
    box-shadow: var(--shadow);
    animation: pop 0.3s ease;
  }
  .label {
    min-height: 1.25em;
    font-size: clamp(12px, 2.8vmin, 22px);
    font-weight: 700;
    line-height: 1.25;
    text-align: center;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .wrong .label {
    color: var(--bad);
  }
  .correct .label {
    color: var(--ok);
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
      transform: scale(0.85);
    }
    60% {
      transform: scale(1.08);
    }
  }
</style>
