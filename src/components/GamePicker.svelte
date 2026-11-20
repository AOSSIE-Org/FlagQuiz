<script lang="ts">
  import { Volume2 } from '@lucide/svelte';
  import { app } from '../lib/app.svelte';
  import Modal from './Modal.svelte';

  const sample = ['br', 'it', 'ru'];
  const words = ['Aa', 'Ee', 'Oo'];
</script>

<Modal label="Choose a game" onclose={app.round ? () => (app.phase = 'playing') : undefined}>
  <div class="games">
    <button class="game" onclick={() => app.startGame('flag')} aria-label="Guess the Flag" title="Guess the Flag">
      <span class="prompt-word"><Volume2 size="1.1em" aria-hidden="true" /> Aa</span>
      <span class="row">
        {#each sample as code (code)}
          <img src="./flags/{code}.svg" alt="" />
        {/each}
      </span>
      <span class="caption">Guess the Flag</span>
    </button>

    <button
      class="game"
      onclick={() => app.startGame('country')}
      aria-label="Guess the Country"
      title="Guess the Country"
    >
      <img class="prompt-flag" src="./flags/au.svg" alt="" />
      <span class="row">
        {#each words as word (word)}
          <span class="word">{word}</span>
        {/each}
      </span>
      <span class="caption">Guess the Country</span>
    </button>
  </div>
</Modal>

<style>
  .games {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: clamp(10px, 3vmin, 24px);
    width: min(640px, 84vw);
  }
  .game {
    display: grid;
    grid-template-rows: 1fr auto auto;
    justify-items: center;
    align-items: center;
    gap: clamp(8px, 2vmin, 16px);
    padding: clamp(12px, 3vmin, 24px);
    border-radius: var(--radius);
    background: var(--surface);
    border: 3px solid transparent;
    transition: transform 0.12s ease, border-color 0.12s ease;
  }
  .game:hover {
    transform: translateY(-3px);
    border-color: var(--gold);
  }
  .prompt-word {
    display: inline-flex;
    align-items: center;
    gap: 0.3em;
    font-size: clamp(22px, 6vmin, 40px);
    font-weight: 800;
    color: var(--green);
  }
  .prompt-flag {
    height: clamp(34px, 9vmin, 60px);
    border-radius: 3px;
    box-shadow: 0 0 0 1px rgb(0 0 0 / 0.12);
  }
  .row {
    display: flex;
    gap: clamp(4px, 1.2vmin, 10px);
  }
  .row img {
    height: clamp(22px, 6vmin, 40px);
    border-radius: 3px;
    box-shadow: 0 0 0 1px rgb(0 0 0 / 0.12);
  }
  .word {
    display: grid;
    place-items: center;
    height: clamp(22px, 6vmin, 40px);
    padding: 0 0.6em;
    border-radius: 6px;
    background: var(--bg);
    font-weight: 700;
    font-size: clamp(12px, 3vmin, 20px);
  }
  .caption {
    font-size: clamp(12px, 2.4vmin, 16px);
    font-weight: 600;
    color: var(--muted);
  }
</style>
