<script lang="ts">
  import { Plus, Upload, X } from '@lucide/svelte';
  import { app } from '../lib/app.svelte';
  import { ImportError, MAX_IMPORT_BYTES } from '../lib/transfer';
  import CustomFlag from './CustomFlag.svelte';
  import Modal from './Modal.svelte';

  let fileInput: HTMLInputElement;
  let importError = $state<string | null>(null);
  let imported = $state<number | null>(null);
  let errorTimer: ReturnType<typeof setTimeout> | undefined;

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
  <ul class="users">
    {#each app.users as user (user.id)}
      <li>
        <button class="tile" class:new={user.id === imported} onclick={() => app.chooseUser(user)} aria-label={user.name}>
          <CustomFlag flag={user.flag} class="tile-flag" />
          <span class="name">{user.name}</span>
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
  </div>
</Modal>

<style>
  .users {
    list-style: none;
    margin: 0;
    padding: 4px;
    display: grid;
    grid-template-columns: repeat(auto-fill, clamp(96px, 18vmin, 150px));
    justify-content: center;
    gap: clamp(8px, 2vmin, 16px);
    width: min(640px, 86vw);
  }
  .tile {
    width: 100%;
    display: grid;
    gap: 6px;
    justify-items: center;
    padding: 10px;
    border-radius: var(--radius);
    background: var(--surface);
    transition: transform 0.12s ease;
  }
  .tile:hover {
    transform: translateY(-2px);
  }
  .tile.new {
    outline: 3px solid var(--gold);
    animation: pop 0.35s ease;
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
