<script lang="ts">
  import { Check, Minus, Play, Plus, Repeat, Trash2, Upload, User as UserIcon, Users, X } from '@lucide/svelte';
  import { app } from '../lib/app.svelte';
  import { ImportError, MAX_IMPORT_BYTES } from '../lib/transfer';
  import type { User } from '../lib/types';
  import { TURN_ROUNDS_MAX, TURN_ROUNDS_MIN } from '../lib/types';
  import CustomFlag from './CustomFlag.svelte';
  import DeletePlayer from './DeletePlayer.svelte';
  import Modal from './Modal.svelte';

  let fileInput: HTMLInputElement;
  let importError = $state<string | null>(null);
  let imported = $state<number | null>(null);
  let errorTimer: ReturnType<typeof setTimeout> | undefined;

  let multi = $derived(app.pickerMode === 'multi');
  let selectedCount = $derived(app.users.filter((u) => u.id !== undefined && app.selectedIds.includes(u.id)).length);

  /** Delete mode: tapping a player asks to delete it (after a grown-ups-only check). */
  let deleting = $state(false);
  let toDelete = $state<User | null>(null);

  async function confirmDelete() {
    if (toDelete?.id !== undefined) await app.deleteUser(toDelete.id);
    toDelete = null;
    if (app.users.length === 0) {
      deleting = false;
      app.editor = 'new';
    }
  }

  function pick(user: User) {
    if (deleting) {
      toDelete = user;
      return;
    }
    if (multi) {
      if (user.id !== undefined) app.toggleSelected(user.id);
    } else {
      void app.startSession([user]);
    }
  }

  async function onFile() {
    const file = fileInput.files?.[0];
    fileInput.value = '';
    if (!file) return;
    try {
      if (file.size > MAX_IMPORT_BYTES) throw new ImportError('File too large');
      const user = await app.importUser(await file.text());
      imported = user.id ?? null;
      importError = null;
    } catch (err) {
      importError = err instanceof ImportError ? err.message : 'Could not import this file';
      clearTimeout(errorTimer);
      errorTimer = setTimeout(() => (importError = null), 3000);
    }
  }
</script>

<Modal label="Who is playing?">
  <div class="mode" role="radiogroup" aria-label="Players">
    <button
      role="radio"
      aria-checked={!multi}
      class:active={!multi}
      onclick={() => app.setPickerMode('single')}
      aria-label="One player"
      title="One player"
    >
      <UserIcon />
    </button>
    <button
      role="radio"
      aria-checked={multi}
      class:active={multi}
      onclick={() => app.setPickerMode('multi')}
      aria-label="Several players"
      title="Several players"
    >
      <Users />
    </button>
  </div>

  <ul class="users">
    {#each app.users as user (user.id)}
      {@const selected = multi && user.id !== undefined && app.selectedIds.includes(user.id)}
      <li>
        <button
          class="tile"
          class:new={user.id === imported}
          class:selected
          class:dimmed={multi && !selected && !deleting}
          class:deleting
          aria-pressed={multi ? selected : undefined}
          onclick={() => pick(user)}
          aria-label={user.name}
        >
          <CustomFlag flag={user.flag} class="tile-flag" />
          <span class="name">{user.name}</span>
          {#if deleting}
            <span class="tick remove" aria-hidden="true"><X size="100%" strokeWidth={4} /></span>
          {:else if selected}
            <span class="tick" aria-hidden="true"><Check size="100%" strokeWidth={4} /></span>
          {/if}
        </button>
      </li>
    {/each}
    <li>
      <button class="tile add" onclick={() => (app.editor = 'new')} aria-label="New player" title="New player">
        <span class="plus"><Plus size="60%" strokeWidth={3} /></span>
        <span class="name" aria-hidden="true">&nbsp;</span>
      </button>
    </li>
  </ul>

  <div class="footer">
    <button
      class="icon-btn"
      class:error={importError}
      onclick={() => fileInput.click()}
      aria-label="Load a player from a file"
      title={importError ?? 'Load a player from a file'}
    >
      {#if importError}<X size={26} />{:else}<Upload size={24} />{/if}
    </button>
    <input
      bind:this={fileInput}
      type="file"
      accept=".json,application/json"
      class="visually-hidden"
      tabindex="-1"
      onchange={onFile}
    />
    {#if importError}
      <span class="error-text" role="alert">{importError}</span>
    {/if}
    <button
      class="bin"
      class:active={deleting}
      onclick={() => (deleting = !deleting)}
      aria-pressed={deleting}
      aria-label="Delete players"
      title="Delete players"
    >
      <Trash2 size="100%" />
    </button>
    {#if multi}
      <!-- Maximum rounds in a row per player. -->
      <div class="rounds" role="group" aria-label="Rounds in a row per player" title="Rounds in a row per player">
        <Repeat class="rounds-icon" aria-hidden="true" />
        <button
          onclick={() => app.setSettings({ turnRounds: app.settings.turnRounds - 1 })}
          disabled={app.settings.turnRounds <= TURN_ROUNDS_MIN}
          aria-label="Fewer rounds"
        >
          <Minus size={18} />
        </button>
        <output aria-label="Rounds in a row">{app.settings.turnRounds}</output>
        <button
          onclick={() => app.setSettings({ turnRounds: app.settings.turnRounds + 1 })}
          disabled={app.settings.turnRounds >= TURN_ROUNDS_MAX}
          aria-label="More rounds"
        >
          <Plus size={18} />
        </button>
      </div>
      <button
        class="icon-btn primary play"
        disabled={selectedCount < 2}
        onclick={() => app.startMultiplayer()}
        aria-label="Play"
        title="Play"
      >
        <Play size={30} fill="currentColor" />
      </button>
    {/if}
  </div>
</Modal>

{#if toDelete}
  <DeletePlayer player={toDelete} onconfirm={confirmDelete} oncancel={() => (toDelete = null)} />
{/if}

<style>
  .mode {
    display: flex;
    justify-content: center;
    gap: 4px;
    width: max-content;
    margin: 0 auto clamp(8px, 2vmin, 16px);
    padding: 4px;
    border-radius: 999px;
    background: var(--surface);
  }
  .mode button {
    display: grid;
    place-items: center;
    width: clamp(44px, 9vmin, 56px);
    height: clamp(36px, 7vmin, 44px);
    border-radius: 999px;
    color: var(--muted);
    transition: background 0.12s ease;
  }
  .mode button.active {
    background: var(--green);
    color: #fff;
  }
  .users {
    list-style: none;
    margin: 0;
    padding: 4px;
    display: grid;
    grid-template-columns: repeat(auto-fit, clamp(96px, 18vmin, 150px));
    justify-content: center;
    gap: clamp(8px, 2vmin, 16px);
    width: min(640px, 86vw);
  }
  .tile {
    position: relative;
    width: 100%;
    display: grid;
    gap: 6px;
    justify-items: center;
    padding: 10px;
    border-radius: var(--radius);
    background: var(--surface);
    border: 3px solid transparent;
    transition:
      transform 0.12s ease,
      opacity 0.12s ease;
  }
  .tile:hover {
    transform: translateY(-2px);
  }
  .tile.selected {
    border-color: var(--green);
  }
  .tile.dimmed {
    opacity: 0.55;
  }
  .tile.new {
    outline: 3px solid var(--gold);
    animation: pop 0.35s ease;
  }
  .tick {
    position: absolute;
    top: -8px;
    right: -8px;
    width: 24px;
    height: 24px;
    padding: 3px;
    border-radius: 50%;
    background: var(--green);
    color: #fff;
  }
  .tile :global(.tile-flag),
  .plus {
    width: 100%;
  }
  .plus {
    display: grid;
    place-items: center;
    aspect-ratio: 3 / 2;
    border-radius: 4px;
    border: 3px dashed var(--muted);
    color: var(--green);
  }
  .name {
    max-width: 100%;
    font-weight: 600;
    font-size: clamp(13px, 2.4vmin, 16px);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .footer {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-top: clamp(8px, 2vmin, 16px);
  }
  .play {
    margin-left: 12px;
  }
  .rounds {
    display: flex;
    align-items: center;
    gap: 4px;
    margin-left: auto;
    padding: 4px 6px;
    border-radius: 999px;
    background: var(--surface);
    color: var(--green);
  }
  .rounds button {
    display: grid;
    place-items: center;
    width: 32px;
    height: 32px;
    border-radius: 50%;
    color: var(--text);
  }
  .rounds button:hover:not(:disabled) {
    background: var(--surface-2);
  }
  .rounds button:disabled {
    opacity: 0.35;
  }
  .rounds output {
    min-width: 2ch;
    text-align: center;
    font-weight: 900;
    font-size: 20px;
    color: var(--text);
    font-variant-numeric: tabular-nums;
  }
  /* Deliberately small and faded: not meant for children. */
  .bin {
    width: 26px;
    height: 26px;
    padding: 5px;
    border-radius: 6px;
    color: var(--muted);
    opacity: 0.4;
  }
  .bin:hover,
  .bin.active {
    opacity: 1;
  }
  .bin.active {
    background: var(--bad);
    color: #fff;
  }
  .tile.deleting {
    animation: wiggle 0.6s ease-in-out infinite;
  }
  .tick.remove {
    background: var(--bad);
  }
  @keyframes wiggle {
    0%,
    100% {
      transform: rotate(-1.5deg);
    }
    50% {
      transform: rotate(1.5deg);
    }
  }
  .icon-btn.error {
    background: var(--bad);
    color: #fff;
    animation: shake 0.35s ease;
  }
  .error-text {
    color: var(--bad);
    font-weight: 600;
    font-size: 14px;
  }
  @keyframes pop {
    0% {
      transform: scale(0.9);
    }
    60% {
      transform: scale(1.05);
    }
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
