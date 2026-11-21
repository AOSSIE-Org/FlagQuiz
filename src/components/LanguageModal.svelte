<script lang="ts">
  import { Check, Languages, X } from '@lucide/svelte';
  import { app } from '../lib/app.svelte';
  import { LANGUAGES, t, type LanguageCode } from '../lib/i18n.svelte';
  import { pickerOrder } from '../lib/languages';
  import Modal from './Modal.svelte';

  /** English first, then the others in alphabetical order of their own names. */
  const languages = pickerOrder(LANGUAGES);
  const close = () => (app.languageOpen = false);

  function choose(code: LanguageCode) {
    app.setSettings({ language: code });
    close();
  }
</script>

<Modal label={t('language')} onclose={close} wide>
  <div class="picker">
    <div class="head">
      <Languages class="icon" aria-hidden="true" />
      <button class="icon-btn close" onclick={close} aria-label={t('close')} title={t('close')}><X size={22} /></button>
    </div>
    <div class="languages" role="radiogroup" aria-label={t('language')}>
      {#each languages as lang (lang.code)}
        {@const active = app.settings.language === lang.code}
        <button
          role="radio"
          aria-checked={active}
          class="lang"
          class:active
          lang={lang.code}
          dir={lang.dir}
          title={lang.english}
          onclick={() => choose(lang.code)}
        >
          {lang.name}
          {#if active}<span class="tick" aria-hidden="true"><Check size="100%" strokeWidth={4} /></span>{/if}
        </button>
      {/each}
    </div>
  </div>
</Modal>

<style>
  .picker {
    display: grid;
    gap: clamp(6px, 1.6vmin, 12px);
    /* The dialog shrinks to its content, so the width must not depend on it. */
    width: min(880px, 84vw);
  }
  .head {
    display: flex;
    align-items: center;
    justify-content: space-between;
  }
  .head :global(.icon) {
    width: clamp(22px, 5vmin, 30px);
    height: clamp(22px, 5vmin, 30px);
    color: var(--green);
  }
  .close {
    width: clamp(34px, 7vmin, 44px);
    height: clamp(34px, 7vmin, 44px);
  }
  .languages {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(clamp(92px, 16vmin, 132px), 1fr));
    gap: clamp(5px, 1.2vmin, 10px);
  }
  .lang {
    position: relative;
    display: grid;
    place-items: center;
    min-width: 0;
    min-height: clamp(36px, 9vmin, 56px);
    padding: 2px 6px;
    border-radius: var(--radius-sm, 10px);
    background: var(--surface);
    border: 2px solid transparent;
    font-size: clamp(13px, 2.7vmin, 18px);
    font-weight: 700;
    line-height: 1.1;
    text-align: center;
    text-wrap: balance;
    overflow-wrap: anywhere;
    transition:
      transform 0.12s ease,
      border-color 0.12s ease;
  }
  .lang:hover {
    border-color: var(--gold);
    transform: translateY(-1px);
  }
  .lang.active {
    border-color: var(--green);
  }
  .tick {
    position: absolute;
    top: -6px;
    inset-inline-end: -6px;
    width: 20px;
    height: 20px;
    padding: 3px;
    border-radius: 50%;
    background: var(--green);
    color: #fff;
  }
</style>
