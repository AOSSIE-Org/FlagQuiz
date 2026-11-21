<script lang="ts">
  import { Trash2, X } from '@lucide/svelte';
  import { isSolved, makeAdultCheck } from '../lib/adultCheck';
  import type { User } from '../lib/types';
  import CustomFlag from './CustomFlag.svelte';
  import Modal from './Modal.svelte';

  /** Confirms deleting a player by asking for the solution of an equation only grown-ups can solve. */
  let { player, onconfirm, oncancel }: { player: User; onconfirm: () => void; oncancel: () => void } = $props();

  let check = $state(makeAdultCheck());
  let answer = $state('');
  let wrong = $state(false);

  function submit(e: SubmitEvent) {
    e.preventDefault();
    if (isSolved(check, answer)) {
      onconfirm();
      return;
    }
    // A new equation after every wrong answer, so guessing doesn't work.
    wrong = true;
    answer = '';
    check = makeAdultCheck();
  }
</script>

<Modal label="Delete {player.name}?" onclose={oncancel}>
  <form class="gate" onsubmit={submit}>
    <div class="who">
      <span class="flag"><CustomFlag flag={player.flag} /></span>
      <span class="name">{player.name}</span>
      <Trash2 class="bin" aria-hidden="true" />
    </div>
    <p class="hint">Grown-ups only: solve for <i>x</i> to delete this player and all their progress.</p>
    <p class="equation" aria-live="polite">{check.equation}</p>
    <label class="answer" class:wrong>
      <i>x</i> =
      <input
        bind:value={answer}
        oninput={() => (wrong = false)}
        inputmode="numeric"
        autocomplete="off"
        aria-label="x"
      />
    </label>
    <div class="actions">
      <button type="button" class="icon-btn" onclick={oncancel} aria-label="Cancel" title="Cancel"><X size={26} /></button>
      <button type="submit" class="icon-btn danger" disabled={!answer.trim()} aria-label="Delete" title="Delete">
        <Trash2 size={24} />
      </button>
    </div>
  </form>
</Modal>

<style>
  .gate {
    display: grid;
    justify-items: center;
    gap: clamp(6px, 2vmin, 14px);
    width: min(440px, 84vw);
  }
  .who {
    display: flex;
    align-items: center;
    gap: 12px;
  }
  .flag {
    display: block;
    height: clamp(32px, 8vmin, 48px);
    aspect-ratio: 3 / 2;
  }
  .flag :global(svg) {
    width: 100%;
    height: 100%;
  }
  .name {
    font-weight: 800;
    font-size: clamp(18px, 4vmin, 26px);
  }
  .who :global(.bin) {
    color: var(--bad);
  }
  .hint {
    margin: 0;
    text-align: center;
    color: var(--muted);
    font-size: clamp(12px, 2.6vmin, 15px);
  }
  .equation {
    margin: 0;
    font-size: clamp(22px, 6vmin, 36px);
    font-weight: 800;
    font-variant-numeric: tabular-nums;
    font-family: ui-serif, Georgia, serif;
    user-select: none;
  }
  .answer {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: clamp(18px, 4.5vmin, 26px);
    font-weight: 700;
    font-family: ui-serif, Georgia, serif;
  }
  .answer input {
    width: 5ch;
    padding: 4px 8px;
    border-radius: var(--radius-sm);
    border: 2px solid var(--border);
    background: var(--surface);
    color: var(--text);
    font: inherit;
    text-align: center;
    user-select: text;
  }
  .answer.wrong input {
    border-color: var(--bad);
    animation: shake 0.35s ease;
  }
  .actions {
    display: flex;
    justify-content: space-between;
    width: 100%;
  }
  .icon-btn.danger {
    background: var(--bad);
    color: #fff;
  }
  @keyframes shake {
    20%,
    60% {
      transform: translateX(-4px);
    }
    40%,
    80% {
      transform: translateX(4px);
    }
  }
</style>
