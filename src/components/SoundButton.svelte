<script lang="ts">
  import { Volume2, VolumeX } from '@lucide/svelte';
  import { app } from '../lib/app.svelte';
  import { t } from '../lib/i18n.svelte';

  /** Always-visible sound toggle; the preference is saved with the other settings. */
  function toggle() {
    app.setSettings({ sounds: !app.settings.sounds });
  }
</script>

<button
  class="sound"
  onclick={toggle}
  aria-pressed={app.settings.sounds}
  aria-label={app.settings.sounds ? t('soundEffectsOn') : t('soundEffectsOff')}
  title={app.settings.sounds ? t('soundEffectsOn') : t('soundEffectsOff')}
>
  {#if app.settings.sounds}
    <Volume2 size="100%" />
  {:else}
    <VolumeX size="100%" />
  {/if}
</button>

<style>
  .sound {
    position: fixed;
    right: calc(max(6px, env(safe-area-inset-right)) + 38px);
    bottom: max(6px, env(safe-area-inset-bottom));
    z-index: 12;
    width: 30px;
    height: 30px;
    padding: 6px;
    border-radius: 8px;
    color: var(--muted);
    opacity: 0.65;
    transition: opacity 0.15s ease;
  }
  .sound:hover,
  .sound:focus-visible {
    opacity: 1;
    background: var(--surface);
  }
</style>
