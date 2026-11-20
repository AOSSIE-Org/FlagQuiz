<script lang="ts">
  import {
    ChartColumn,
    Check,
    Download,
    Earth,
    Gamepad2,
    Moon,
    Pencil,
    Share2,
    Sun,
    Users,
    X,
  } from '@lucide/svelte';
  import { app, shareApp } from '../lib/app.svelte';
  import { DIFFICULTIES } from '../lib/types';
  import CustomFlag from './CustomFlag.svelte';
  import DifficultyIcon from './DifficultyIcon.svelte';

  let root = $state<HTMLDivElement>();
  let shareResult = $state<'copied' | 'failed' | null>(null);
  let shareTimer: ReturnType<typeof setTimeout> | undefined;

  function closeOnOutside(e: PointerEvent) {
    if (app.menuOpen && !root?.contains(e.target as Node)) app.menuOpen = false;
  }

  function onkeydown(e: KeyboardEvent) {
    if (e.key === 'Escape' && app.menuOpen) app.menuOpen = false;
  }

  function open(fn: () => void) {
    app.menuOpen = false;
    fn();
  }

  function cycleDifficulty() {
    if (!app.user) return;
    const i = DIFFICULTIES.indexOf(app.user.difficulty);
    app.setDifficulty(DIFFICULTIES[(i + 1) % DIFFICULTIES.length]);
  }

  async function share() {
    const result = await shareApp();
    clearTimeout(shareTimer);
    shareResult = result === 'shared' ? null : result;
    shareTimer = setTimeout(() => (shareResult = null), 1500);
  }
</script>

<svelte:window onpointerdown={closeOnOutside} {onkeydown} />

{#if app.user}
  {@const user = app.user}
  <div class="profile" bind:this={root}>
    <button
      class="me"
      aria-label="{user.name}: menu"
      aria-haspopup="menu"
      aria-expanded={app.menuOpen}
      title={user.name}
      onclick={() => (app.menuOpen = !app.menuOpen)}
    >
      <CustomFlag flag={user.flag} />
    </button>

    {#if app.menuOpen}
      <div class="menu" role="menu" aria-label="Menu">
        <button
          role="menuitem"
          class="item"
          onclick={() => app.toggleTheme()}
          aria-label={user.theme === 'dark' ? 'Light mode' : 'Dark mode'}
          title={user.theme === 'dark' ? 'Light mode' : 'Dark mode'}
        >
          {#if user.theme === 'dark'}<Sun />{:else}<Moon />{/if}
        </button>
        <button role="menuitem" class="item" onclick={() => open(() => (app.editor = 'edit'))} aria-label="Edit player" title="Edit player">
          <Pencil />
        </button>
        <button
          role="menuitem"
          class="item difficulty"
          onclick={cycleDifficulty}
          aria-label="Difficulty: {user.difficulty}"
          title="Difficulty: {user.difficulty}"
        >
          <DifficultyIcon difficulty={user.difficulty} />
        </button>
        <button role="menuitem" class="item" onclick={() => open(() => (app.filterOpen = true))} aria-label="Countries" title="Countries">
          <Earth />
        </button>
        <button role="menuitem" class="item" onclick={() => open(() => (app.statsOpen = true))} aria-label="Statistics" title="Statistics">
          <ChartColumn />
        </button>
        <button
          role="menuitem"
          class="item"
          class:ok={shareResult === 'copied'}
          class:bad={shareResult === 'failed'}
          onclick={share}
          aria-label={shareResult === 'copied' ? 'Link copied' : 'Share'}
          title={shareResult === 'copied' ? 'Link copied' : 'Share'}
        >
          {#if shareResult === 'copied'}<Check />{:else if shareResult === 'failed'}<X />{:else}<Share2 />{/if}
        </button>
        <button role="menuitem" class="item" onclick={() => app.exportUser()} aria-label="Save my data" title="Save my data">
          <Download />
        </button>
        <button role="menuitem" class="item" onclick={() => app.changeGame()} aria-label="Change game" title="Change game">
          <Gamepad2 />
        </button>
        <button role="menuitem" class="item" onclick={() => app.switchUser()} aria-label="Switch player" title="Switch player">
          <Users />
        </button>
      </div>
    {/if}
  </div>
{/if}

<style>
  .profile {
    position: relative;
  }
  .me {
    display: block;
    height: clamp(36px, 9vmin, 58px);
    aspect-ratio: 3 / 2;
    border-radius: 6px;
    transition: transform 0.12s ease;
  }
  .me:hover {
    transform: scale(1.05);
  }
  .me :global(svg) {
    width: 100%;
    height: 100%;
    border-radius: 6px;
  }
  .menu {
    position: absolute;
    top: calc(100% + 8px);
    right: 0;
    z-index: 15;
    display: grid;
    gap: clamp(4px, 1vmin, 8px);
    padding: clamp(6px, 1.4vmin, 10px);
    border-radius: var(--radius);
    background: var(--bg);
    border: 1px solid var(--border);
    box-shadow: var(--shadow);
    animation: drop 0.15s ease;
  }
  .item {
    display: grid;
    place-items: center;
    width: clamp(40px, 8.5vmin, 52px);
    height: clamp(40px, 8.5vmin, 52px);
    border-radius: var(--radius-sm);
    background: var(--surface);
    transition: background 0.12s ease;
  }
  .item:hover {
    background: var(--surface-2);
  }
  .item.difficulty {
    font-size: clamp(20px, 4.4vmin, 26px);
    color: var(--green);
  }
  .item.ok {
    background: var(--ok);
    color: #fff;
  }
  .item.bad {
    background: var(--bad);
    color: #fff;
  }
  /* Short screens (phones in landscape): lay the items out in rows. */
  @media (max-height: 560px) {
    .menu {
      grid-template-columns: repeat(5, auto);
    }
  }
  @keyframes drop {
    from {
      transform: translateY(-6px);
      opacity: 0;
    }
  }
</style>
