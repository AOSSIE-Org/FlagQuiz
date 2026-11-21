<script lang="ts">
  import { ArrowDown, Earth, MapPin, Volume2 } from '@lucide/svelte';
  import { CAPITALS } from '../data/capitals';
  import { app } from '../lib/app.svelte';
  import { GAME_NAMES, type GameId } from '../lib/types';
  import Modal from './Modal.svelte';

  const paris = CAPITALS.find((c) => c.code === 'FR') ?? CAPITALS[0];
  const london = CAPITALS.find((c) => c.code === 'GB') ?? CAPITALS[1] ?? CAPITALS[0];

  const start = (game: GameId) => app.startGame(game);
</script>

<Modal label="Choose a game" onclose={app.round ? () => (app.phase = 'playing') : undefined} wide>
  <div class="games">
    <button class="game" onclick={() => start('flag')} aria-label={GAME_NAMES.flag} title={GAME_NAMES.flag}>
      <span class="art">
        <span class="word"><Volume2 size="1em" aria-hidden="true" /> Aa</span>
        <span class="row">
          {#each ['br', 'it', 'ru'] as code (code)}<img class="mini-flag" src="./flags/{code}.svg" alt="" />{/each}
        </span>
      </span>
      <span class="caption">{GAME_NAMES.flag}</span>
    </button>

    <button class="game" onclick={() => start('country')} aria-label={GAME_NAMES.country} title={GAME_NAMES.country}>
      <span class="art">
        <img class="big-flag" src="./flags/au.svg" alt="" />
        <span class="row">
          {#each ['Aa', 'Ee', 'Oo'] as w (w)}<span class="chip">{w}</span>{/each}
        </span>
      </span>
      <span class="caption">{GAME_NAMES.country}</span>
    </button>

    <button class="game" onclick={() => start('location')} aria-label={GAME_NAMES.location} title={GAME_NAMES.location}>
      <span class="art">
        <img class="big-flag" src="./flags/jp.svg" alt="" />
        <span class="globe">
          <Earth size="100%" strokeWidth={1.5} aria-hidden="true" />
          <span class="pin"><MapPin size="100%" fill="currentColor" stroke="var(--bg)" aria-hidden="true" /></span>
        </span>
      </span>
      <span class="caption">{GAME_NAMES.location}</span>
    </button>

    {#if paris}
      <button class="game" onclick={() => start('capital')} aria-label={GAME_NAMES.capital} title={GAME_NAMES.capital}>
        <span class="art">
          <img class="big-flag" src="./flags/fr.svg" alt="" />
          <span class="photos">
            {#each paris.photos as p (p.src)}<img src="./{p.src}" alt="" />{/each}
          </span>
        </span>
        <span class="caption">{GAME_NAMES.capital}</span>
      </button>
    {/if}

    {#if london}
      <button
        class="game"
        onclick={() => start('capitalCountry')}
        aria-label={GAME_NAMES.capitalCountry}
        title={GAME_NAMES.capitalCountry}
      >
        <span class="art">
          <span class="photos">
            {#each london.photos as p (p.src)}<img src="./{p.src}" alt="" />{/each}
          </span>
          <ArrowDown class="arrow" aria-hidden="true" />
          <span class="row">
            {#each ['gb', 'ie', 'ca'] as code (code)}<img class="mini-flag" src="./flags/{code}.svg" alt="" />{/each}
          </span>
        </span>
        <span class="caption">{GAME_NAMES.capitalCountry}</span>
      </button>
    {/if}
  </div>
</Modal>

<style>
  .games {
    display: grid;
    grid-template-columns: repeat(6, 1fr);
    gap: clamp(8px, 2vmin, 18px);
    width: min(900px, 88vw);
  }
  /* 3 games on the first row, 2 centred on the second. */
  .game {
    grid-column: span 2;
    display: grid;
    grid-template-rows: 1fr auto;
    justify-items: center;
    align-items: center;
    gap: clamp(4px, 1.2vmin, 10px);
    padding: clamp(8px, 2vmin, 18px);
    border-radius: var(--radius);
    background: var(--surface);
    border: 3px solid transparent;
    transition:
      transform 0.12s ease,
      border-color 0.12s ease;
  }
  .game:nth-child(4) {
    grid-column: 2 / span 2;
  }
  .game:hover {
    transform: translateY(-3px);
    border-color: var(--gold);
  }
  .art {
    display: grid;
    justify-items: center;
    align-content: center;
    gap: clamp(4px, 1.2vmin, 10px);
    min-height: clamp(70px, 19dvh, 150px);
  }
  .word {
    display: inline-flex;
    align-items: center;
    gap: 0.25em;
    font-size: clamp(20px, 5vmin, 36px);
    font-weight: 800;
    color: var(--green);
  }
  .row {
    display: flex;
    gap: clamp(3px, 1vmin, 8px);
  }
  .mini-flag {
    height: clamp(18px, 5vmin, 34px);
    border-radius: 3px;
    box-shadow: 0 0 0 1px rgb(0 0 0 / 0.12);
  }
  .big-flag {
    height: clamp(28px, 8vmin, 54px);
    border-radius: 3px;
    box-shadow: 0 0 0 1px rgb(0 0 0 / 0.12);
  }
  .chip {
    display: grid;
    place-items: center;
    height: clamp(18px, 5vmin, 34px);
    padding: 0 0.55em;
    border-radius: 6px;
    background: var(--bg);
    font-weight: 700;
    font-size: clamp(11px, 2.6vmin, 18px);
  }
  .globe {
    position: relative;
    width: clamp(34px, 9vmin, 60px);
    height: clamp(34px, 9vmin, 60px);
    color: var(--muted);
  }
  .pin {
    position: absolute;
    width: 55%;
    height: 55%;
    left: 40%;
    top: -12%;
    color: var(--bad);
  }
  .photos {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 2px;
    width: clamp(60px, 16vmin, 112px);
  }
  .photos img {
    width: 100%;
    aspect-ratio: 3 / 2;
    object-fit: cover;
    border-radius: 3px;
  }
  .art :global(.arrow) {
    width: clamp(14px, 3.5vmin, 22px);
    height: clamp(14px, 3.5vmin, 22px);
    color: var(--muted);
  }
  .caption {
    font-size: clamp(11px, 2.2vmin, 15px);
    font-weight: 600;
    color: var(--muted);
    text-align: center;
  }
</style>
