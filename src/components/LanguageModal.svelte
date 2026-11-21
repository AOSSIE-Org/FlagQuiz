<script lang="ts">
  import { Check, X } from '@lucide/svelte';
  import { app } from '../lib/app.svelte';
  import { LANGUAGES, t, type LanguageCode } from '../lib/i18n.svelte';
  import Modal from './Modal.svelte';

  const close = () => (app.languageOpen = false);

  function choose(code: LanguageCode) {
    app.setSettings({ language: code });
    close();
  }
</script>

<Modal label={t('language')} onclose={close}>
  <div class="languages" role="radiogroup" aria-label={t('language')}>
    {#each LANGUAGES as lang (lang.code)}
      {@const active = app.settings.language === lang.code}
      <button
        role="radio"
        aria-checked={active}
        class="lang"
        class:active
        lang={lang.code}
        dir={lang.dir}
        onclick={() => choose(lang.code)}
      >
        <span class="name">{lang.name}</span>
        {#if active}<span class="tick" aria-hidden="true"><Check size="100%" strokeWidth={4} /></span>{/if}
      </button>
    {/each}
  </div>
  <div class="actions">
    <button class="icon-btn" onclick={close} aria-label={t('close')} title={t('close')}><X size={26} /></button>
  </div>
</Modal>

<style>
  .languages {
    display: grid;
    grid-template-columns: repeat(5, minmax(0, 1fr));
    gap: clamp(6px, 1.6vmin, 12px);
    width: min(760px, 88vw);
  }
  .lang {
    position: relative;
    display: grid;
    place-items: center;
    min-height: clamp(44px, 12vmin, 72px);
    padding: 6px;
    border-radius: var(--radius);
    background: var(--surface);
    border: 3px solid transparent;
    font-size: clamp(14px, 3vmin, 20px);
    font-weight: 700;
    transition:
      transform 0.12s ease,
      border-color 0.12s ease;
  }
  .lang:hover {
    border-color: var(--gold);
    transform: translateY(-2px);
  }
  .lang.active {
    border-color: var(--green);
  }
  .name {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    max-width: 100%;
  }
  .tick {
    position: absolute;
    top: -8px;
    inset-inline-end: -8px;
    width: 24px;
    height: 24px;
    padding: 4px;
    border-radius: 50%;
    background: var(--green);
    color: #fff;
  }
  .actions {
    display: flex;
    justify-content: flex-end;
    margin-top: clamp(8px, 2vmin, 16px);
  }
</style>
