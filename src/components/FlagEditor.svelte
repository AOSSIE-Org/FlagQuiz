<script lang="ts">
  import { Check, Pencil, X } from '@lucide/svelte';
  import { untrack } from 'svelte';
  import { app, type EditorMode } from '../lib/app.svelte';
  import { PALETTE, randomFlag } from '../lib/palette';
  import { PATTERNS, type UserFlag } from '../lib/types';
  import { t } from '../lib/i18n.svelte';
  import CustomFlag from './CustomFlag.svelte';
  import Modal from './Modal.svelte';

  let { mode }: { mode: EditorMode } = $props();

  // The editor works on a copy of the initial values.
  const initial = untrack(() =>
    mode === 'edit' && app.user
      ? { name: app.user.name, flag: $state.snapshot(app.user.flag) as UserFlag }
      : { name: '', flag: randomFlag() },
  );
  let name = $state(initial.name);
  let flag = $state<UserFlag>(initial.flag);
  let slot = $state(0);
  let saving = $state(false);
  let valid = $derived(name.trim().length > 0);
  /** Whether the colour of the selected slot is not one of the palette colours. */
  let isCustom = $derived(!PALETTE.includes(flag.colors[slot]));

  /** Cancel is possible except when creating the very first user. */
  let canCancel = $derived(mode === 'edit' || app.users.length > 0);

  function cancel() {
    app.editor = null;
  }

  async function save() {
    if (!valid || saving) return;
    saving = true;
    const snapshot = $state.snapshot(flag) as UserFlag;
    if (mode === 'edit') await app.updateUser(name.trim(), snapshot);
    else await app.createUser(name.trim(), snapshot);
    saving = false;
  }
</script>

<Modal label={mode === 'edit' ? t('editPlayer') : t('newPlayer')} onclose={canCancel ? cancel : undefined} wide>
  <form class="editor" onsubmit={(e) => (e.preventDefault(), save())}>
    <div class="left">
      <CustomFlag {flag} class="preview" />
      <label class="name">
        <Pencil size={20} aria-hidden="true" />
        <span class="visually-hidden">{t('name')}</span>
        <input
          bind:value={name}
          maxlength="16"
          autocomplete="off"
          autocapitalize="words"
          spellcheck="false"
          enterkeyhint="done"
        />
      </label>
    </div>

    <div class="right">
      <div class="patterns" role="radiogroup" aria-label={t('pattern')}>
        {#each PATTERNS as pattern (pattern)}
          <button
            type="button"
            role="radio"
            aria-checked={flag.pattern === pattern}
            aria-label={t(`pattern.${pattern}`)}
            title={t(`pattern.${pattern}`)}
            class="pattern"
            class:active={flag.pattern === pattern}
            onclick={() => (flag.pattern = pattern)}
          >
            <CustomFlag {flag} {pattern} />
          </button>
        {/each}
      </div>

      <div class="slots" role="radiogroup" aria-label={t('colourToChange')}>
        {#each flag.colors as color, i (i)}
          <button
            type="button"
            role="radio"
            aria-checked={slot === i}
            aria-label={t('colourNumber', { n: i + 1 })}
            class="slot"
            class:active={slot === i}
            style:background={color}
            onclick={() => (slot = i)}
          >
            <span>{i + 1}</span>
          </button>
        {/each}
      </div>

      <div class="palette" role="radiogroup" aria-label={t('colours')}>
        {#each PALETTE as color (color)}
          <button
            type="button"
            role="radio"
            aria-checked={flag.colors[slot] === color}
            aria-label={color}
            class="swatch"
            class:active={flag.colors[slot] === color}
            style:background={color}
            onclick={() => (flag.colors[slot] = color)}
          ></button>
        {/each}
        <!-- Any other colour, with the system colour picker. -->
        <label
          class="swatch custom"
          class:active={isCustom}
          style:--custom={isCustom ? flag.colors[slot] : null}
          title={t('otherColour')}
        >
          <span class="visually-hidden">{t('otherColour')}</span>
          <input
            type="color"
            value={flag.colors[slot].toLowerCase()}
            oninput={(e) => (flag.colors[slot] = e.currentTarget.value.toUpperCase())}
          />
        </label>
      </div>

    </div>

    <div class="actions">
      {#if canCancel}
        <button type="button" class="icon-btn" onclick={cancel} aria-label={t('cancel')} title={t('cancel')}>
          <X size={28} />
        </button>
      {:else}
        <span></span>
      {/if}
      <button type="submit" class="icon-btn primary" disabled={!valid || saving} aria-label={t('save')} title={t('save')}>
        <Check size={32} strokeWidth={3} />
      </button>
    </div>
  </form>
</Modal>

<style>
  .editor {
    display: grid;
    grid-template-columns: minmax(0, 1fr) minmax(0, 1.1fr);
    grid-template-areas: 'left right' 'actions actions';
    gap: clamp(10px, 3vmin, 24px);
    width: min(820px, 88vw);
  }
  /*
   * Explicit single-column tracks and min-width: 0, so that percentage widths
   * inside resolve against the column (Safari otherwise sizes the column from
   * its content and the preview spills over the patterns).
   */
  .left,
  .right {
    min-width: 0;
    grid-template-columns: minmax(0, 1fr);
  }
  .left {
    grid-area: left;
    display: grid;
    align-content: center;
    gap: clamp(8px, 2.5vmin, 18px);
  }
  .left :global(.preview) {
    width: 100%;
    max-width: calc(38dvh * 1.5);
    height: auto;
    justify-self: center;
    border-radius: 8px;
  }
  .name {
    min-width: 0;
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 0 12px;
    border-radius: var(--radius-sm);
    background: var(--surface);
    border: 2px solid var(--border);
    color: var(--muted);
  }
  .name:focus-within {
    border-color: var(--focus);
  }
  .name input {
    flex: 1;
    min-width: 0;
    padding: clamp(6px, 1.6vmin, 12px) 0;
    border: 0;
    outline: none;
    background: none;
    color: var(--text);
    font: inherit;
    font-size: clamp(16px, 3.4vmin, 24px);
    font-weight: 600;
    user-select: text;
    -webkit-user-select: text;
  }
  .right {
    grid-area: right;
    display: grid;
    align-content: center;
    gap: clamp(8px, 2.2vmin, 16px);
  }
  .slots {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 8px;
  }
  .slot {
    height: clamp(30px, 7vmin, 48px);
    border-radius: var(--radius-sm);
    box-shadow: inset 0 0 0 1px rgb(0 0 0 / 0.2);
    display: grid;
    place-items: center;
  }
  .slot span {
    font-weight: 800;
    font-size: clamp(12px, 2.6vmin, 18px);
    color: #fff;
    text-shadow:
      0 0 2px #000,
      0 0 4px rgb(0 0 0 / 0.6);
  }
  .slot.active {
    outline: 4px solid var(--text);
    outline-offset: 2px;
  }
  .palette {
    display: grid;
    grid-template-columns: repeat(7, 1fr);
    gap: clamp(5px, 1.4vmin, 10px);
  }
  .swatch {
    aspect-ratio: 1;
    border-radius: 50%;
    box-shadow: inset 0 0 0 2px color-mix(in srgb, var(--text) 25%, transparent);
    transition: transform 0.1s ease;
    max-height: 7.5dvh;
    justify-self: center;
    width: 100%;
    max-width: 7.5dvh;
  }
  .swatch.custom {
    position: relative;
    cursor: pointer;
    background: conic-gradient(red, yellow, lime, cyan, blue, magenta, red);
  }
  .swatch.custom[style*='--custom'] {
    background:
      radial-gradient(circle, var(--custom) 52%, transparent 54%),
      conic-gradient(red, yellow, lime, cyan, blue, magenta, red);
  }
  .swatch.custom input {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    opacity: 0;
    cursor: pointer;
    border: 0;
    padding: 0;
  }
  .swatch.custom:focus-within {
    outline: 3px solid var(--focus);
    outline-offset: 2px;
  }
  .swatch.active {
    outline: 3px solid var(--text);
    outline-offset: 2px;
    transform: scale(1.08);
  }
  .patterns {
    display: grid;
    grid-template-columns: repeat(6, 1fr);
    row-gap: clamp(4px, 1vmin, 8px);
    gap: clamp(5px, 1.4vmin, 10px);
  }
  .pattern {
    border-radius: 6px;
    padding: 2px;
    max-height: 9dvh;
  }
  .pattern :global(svg) {
    width: 100%;
    max-height: calc(9dvh - 4px);
  }
  .pattern.active {
    outline: 3px solid var(--text);
    outline-offset: 1px;
  }
  .actions {
    grid-area: actions;
    display: flex;
    justify-content: space-between;
  }
</style>
