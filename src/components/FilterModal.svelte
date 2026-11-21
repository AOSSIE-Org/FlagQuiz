<script lang="ts">
  import { Check, Flag as FlagIcon, Users, X } from '@lucide/svelte';
  import { untrack } from 'svelte';
  import { app } from '../lib/app.svelte';
  import { COUNTRIES, type Continent } from '../data/countries';
  import { applyFilter } from '../lib/select';
  import { CONTINENTS, DEFAULT_FILTER, type CountryFilter } from '../lib/types';
  import { continentName, num, t } from '../lib/i18n.svelte';
  import Modal from './Modal.svelte';

  /** The three most populous countries of each continent, as a visual hint. */
  const SAMPLES = Object.fromEntries(
    CONTINENTS.map((k) => [
      k,
      COUNTRIES.filter((c) => c.continents[0] === k)
        .sort((a, b) => b.population - a.population)
        .slice(0, 3),
    ]),
  ) as Record<Continent, typeof COUNTRIES[number][]>;

  const MIN_N = 10;
  const MAX_N = COUNTRIES.length;

  let filter = $state<CountryFilter>(
    untrack(() => structuredClone($state.snapshot(app.user?.filter ?? DEFAULT_FILTER)) as CountryFilter),
  );
  let count = $derived(applyFilter(COUNTRIES, filter).length);

  function toggle(k: Continent) {
    const on = filter.continents.includes(k);
    // At least one continent stays selected.
    if (on && filter.continents.length === 1) return;
    filter.continents = on
      ? filter.continents.filter((c) => c !== k)
      : CONTINENTS.filter((c) => c === k || filter.continents.includes(c));
  }

  function close() {
    app.filterOpen = false;
  }

  function save() {
    app.setFilter($state.snapshot(filter) as CountryFilter);
    close();
  }
</script>

<Modal label={t('countries')} onclose={close} wide>
  <div class="filter">
    <div class="continents" role="group" aria-label={t('continents')}>
      {#each CONTINENTS as k (k)}
        {@const on = filter.continents.includes(k)}
        <button class="continent" class:on aria-pressed={on} onclick={() => toggle(k)} title={continentName(k)}>
          <span class="flags" aria-hidden="true">
            {#each SAMPLES[k] as c (c.code)}
              <img src="./flags/{c.code.toLowerCase()}.svg" alt="" />
            {/each}
          </span>
          <span class="name">{continentName(k)}</span>
          <span class="tick" aria-hidden="true">{#if on}<Check size="100%" strokeWidth={4} />{/if}</span>
        </button>
      {/each}
    </div>

    <label class="top-n" title={t('mostPopulous')}>
      <Users aria-hidden="true" />
      <span class="visually-hidden">{t('mostPopulous')}</span>
      <input type="range" min={MIN_N} max={MAX_N} step="1" bind:value={filter.topN} />
      <output>{filter.topN >= MAX_N ? '∞' : num(filter.topN)}</output>
    </label>

    <div class="actions">
      <button class="icon-btn" onclick={close} aria-label={t('cancel')} title={t('cancel')}><X size={28} /></button>
      <span class="count" title={t('countriesInGame')} aria-label={t('scoreValue', { label: t('countriesInGame'), value: count })}>
        <FlagIcon aria-hidden="true" />{num(count)}
      </span>
      <button class="icon-btn primary" onclick={save} aria-label={t('save')} title={t('save')}>
        <Check size={32} strokeWidth={3} />
      </button>
    </div>
  </div>
</Modal>

<style>
  .filter {
    display: grid;
    gap: clamp(10px, 3vmin, 22px);
    width: min(820px, 88vw);
  }
  .continents {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(clamp(96px, 20vmin, 140px), 1fr));
    gap: clamp(6px, 1.6vmin, 12px);
  }
  .continent {
    position: relative;
    display: grid;
    justify-items: center;
    gap: 6px;
    padding: clamp(8px, 1.8vmin, 14px) 6px;
    border-radius: var(--radius);
    background: var(--surface);
    border: 3px solid transparent;
    opacity: 0.45;
    filter: grayscale(0.8);
    transition:
      opacity 0.12s ease,
      filter 0.12s ease,
      border-color 0.12s ease;
  }
  .continent.on {
    opacity: 1;
    filter: none;
    border-color: var(--green);
  }
  .flags {
    display: flex;
    gap: 3px;
  }
  .flags img {
    height: clamp(14px, 3.6vmin, 24px);
    border-radius: 2px;
    box-shadow: 0 0 0 1px rgb(0 0 0 / 0.12);
  }
  .name {
    font-weight: 700;
    font-size: clamp(11px, 2.4vmin, 15px);
    text-align: center;
  }
  .tick {
    position: absolute;
    top: -8px;
    inset-inline-end: -8px;
    width: 22px;
    height: 22px;
    padding: 3px;
    border-radius: 50%;
    background: var(--green);
    color: #fff;
  }
  .continent:not(.on) .tick {
    display: none;
  }
  .top-n {
    display: flex;
    align-items: center;
    gap: clamp(8px, 2vmin, 16px);
    color: var(--green);
  }
  .top-n input {
    flex: 1;
    accent-color: var(--green);
    height: 32px;
  }
  .top-n output {
    min-width: 3ch;
    font-weight: 900;
    font-size: clamp(18px, 4vmin, 28px);
    color: var(--text);
    font-variant-numeric: tabular-nums;
    text-align: right;
  }
  .actions {
    display: flex;
    align-items: center;
    justify-content: space-between;
  }
  .count {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    font-weight: 900;
    font-size: clamp(18px, 4vmin, 28px);
    color: var(--muted);
  }
</style>
