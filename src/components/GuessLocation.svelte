<script lang="ts">
  import { Maximize2, Minus, Plus, Volume2 } from '@lucide/svelte';
  import { onMount, untrack } from 'svelte';
  import { COUNTRIES } from '../data/countries';
  import { app } from '../lib/app.svelte';
  import { speak } from '../lib/speech';
  import Flag from './Flag.svelte';

  interface MapCountry {
    code: string;
    /** SVG path, absent for countries too small to be on the map. */
    d?: string;
    /** Label / marker position. */
    x: number;
    y: number;
    /** Tiny country: also shown as a round, easy-to-tap marker. */
    small?: boolean;
  }
  interface MapData {
    width: number;
    height: number;
    countries: MapCountry[];
    neutral: string[];
  }

  const byCode = new Map(COUNTRIES.map((c) => [c.code, c]));
  const MAX_ZOOM = 16;

  let map = $state<MapData | null>(null);
  let svg = $state<SVGSVGElement>();
  /** Zoom factor and centre of the view, in map units. */
  let k = $state(1);
  let cx = $state(0);
  let cy = $state(0);

  onMount(async () => {
    const data = (await import('../data/map.json')).default as MapData;
    cx = data.width / 2;
    cy = data.height / 2;
    map = data;
  });

  let view = $derived.by(() => {
    if (!map) return { x: 0, y: 0, w: 1, h: 1 };
    const w = map.width / k;
    const h = map.height / k;
    return {
      x: Math.min(Math.max(cx - w / 2, 0), map.width - w),
      y: Math.min(Math.max(cy - h / 2, 0), map.height - h),
      w,
      h,
    };
  });

  let markers = $derived(map?.countries.filter((c) => c.small) ?? []);
  let labels = $derived.by(() => {
    const round = app.round;
    if (!map || !round) return [];
    const codes = [...round.wrong, ...(round.solved ? [round.target.code] : [])];
    return codes.flatMap((code) => {
      const c = map!.countries.find((m) => m.code === code);
      const country = byCode.get(code);
      return c && country ? [{ ...c, country, correct: code === round.target.code }] : [];
    });
  });

  // Say the country's name whenever a new round starts.
  $effect(() => {
    app.round?.id;
    untrack(() => app.round && speak(app.round.target.name));
  });

  function choose(code: string) {
    if (app.answer(code) === 'wrong') speak(byCode.get(code)?.name ?? '');
  }

  // ------------------------------------------------------------ zoom & pan

  function toMap(clientX: number, clientY: number) {
    const ctm = svg!.getScreenCTM();
    if (!ctm) return { x: cx, y: cy };
    const p = new DOMPoint(clientX, clientY).matrixTransform(ctm.inverse());
    return { x: p.x, y: p.y };
  }

  /** Zooms by `factor`, keeping the map point under (clientX, clientY) in place. */
  function zoomAt(factor: number, clientX?: number, clientY?: number) {
    const next = Math.min(MAX_ZOOM, Math.max(1, k * factor));
    if (clientX === undefined || clientY === undefined) {
      k = next;
      return;
    }
    const before = toMap(clientX, clientY);
    const ratio = k / next;
    cx = before.x + (view.x + view.w / 2 - before.x) * ratio;
    cy = before.y + (view.y + view.h / 2 - before.y) * ratio;
    k = next;
  }

  function reset() {
    k = 1;
    cx = (map?.width ?? 0) / 2;
    cy = (map?.height ?? 0) / 2;
  }

  function onwheel(e: WheelEvent) {
    e.preventDefault();
    zoomAt(e.deltaY < 0 ? 1.25 : 0.8, e.clientX, e.clientY);
  }

  const pointers = new Map<number, { x: number; y: number }>();
  let moved = false;
  let start = { x: 0, y: 0 };
  let pinchDistance = 0;

  function onpointerdown(e: PointerEvent) {
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.size === 1) {
      moved = false;
      start = { x: e.clientX, y: e.clientY };
    } else if (pointers.size === 2) {
      const [a, b] = [...pointers.values()];
      pinchDistance = Math.hypot(a.x - b.x, a.y - b.y);
      moved = true; // a pinch is never a tap
    }
    svg?.setPointerCapture(e.pointerId);
  }

  function onpointermove(e: PointerEvent) {
    const prev = pointers.get(e.pointerId);
    if (!prev) return;
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.size === 2) {
      const [a, b] = [...pointers.values()];
      const distance = Math.hypot(a.x - b.x, a.y - b.y);
      if (pinchDistance > 0) zoomAt(distance / pinchDistance, (a.x + b.x) / 2, (a.y + b.y) / 2);
      pinchDistance = distance;
      return;
    }
    if (!moved && Math.hypot(e.clientX - start.x, e.clientY - start.y) < 8) return;
    moved = true;
    if (k > 1) {
      // Pan: move the view by the pointer's displacement, in map units.
      const p0 = toMap(prev.x, prev.y);
      const p1 = toMap(e.clientX, e.clientY);
      cx = view.x + view.w / 2 - (p1.x - p0.x);
      cy = view.y + view.h / 2 - (p1.y - p0.y);
    }
  }

  function onpointerup(e: PointerEvent) {
    const wasTap = pointers.size === 1 && !moved;
    pointers.delete(e.pointerId);
    if (pointers.size < 2) pinchDistance = 0;
    if (!wasTap) return;
    const target = document.elementFromPoint(e.clientX, e.clientY)?.closest<SVGElement>('[data-code]');
    if (target?.dataset.code) choose(target.dataset.code);
  }

  function onpointercancel(e: PointerEvent) {
    pointers.delete(e.pointerId);
    pinchDistance = 0;
  }
</script>

{#if app.round}
  {@const round = app.round}
  <section class="game" aria-label="Guess the Location">
    <div class="prompt-row">
      <button class="prompt" onclick={() => speak(round.target.name)} aria-label="{round.target.name}: listen">
        <span class="prompt-flag"><Flag country={round.target} decorative /></span>
        <span class="name">{round.target.name}</span>
        <Volume2 class="speaker" aria-hidden="true" />
      </button>
    </div>

    <div class="map-box">
      {#if map}
        <svg
          bind:this={svg}
          class="map"
          class:solved={round.solved}
          viewBox="{view.x} {view.y} {view.w} {view.h}"
          role="img"
          aria-label="World map"
          {onwheel}
          {onpointerdown}
          {onpointermove}
          {onpointerup}
          {onpointercancel}
        >
          <g class="neutral">
            {#each map.neutral as d, i (i)}
              <path {d} vector-effect="non-scaling-stroke" />
            {/each}
          </g>
          {#each map.countries as c (c.code)}
            {#if c.d}
              <path
                d={c.d}
                data-code={c.code}
                class="country"
                class:wrong={round.wrong.includes(c.code)}
                class:correct={round.solved && c.code === round.target.code}
                vector-effect="non-scaling-stroke"
              />
            {/if}
          {/each}
          {#each markers as c (c.code)}
            <g
              class="marker"
              class:wrong={round.wrong.includes(c.code)}
              class:correct={round.solved && c.code === round.target.code}
              transform="translate({c.x} {c.y}) scale({1 / k})"
            >
              <!-- Larger invisible circle: easier to tap. -->
              <circle class="hit" r="9" data-code={c.code} />
              <circle class="dot" r="3.6" data-code={c.code} />
            </g>
          {/each}
          {#each labels as l (l.code)}
            <g class="label" class:correct={l.correct} transform="translate({l.x} {l.y}) scale({1 / k})">
              <image href="./flags/{l.code.toLowerCase()}.svg" x={-15} y={-30} width="30" height="20" preserveAspectRatio="xMidYMid meet" />
              <text y="6" text-anchor="middle">{l.country.name}</text>
            </g>
          {/each}
        </svg>

        <div class="zoom">
          <button onclick={() => zoomAt(1.6)} disabled={k >= MAX_ZOOM} aria-label="Zoom in" title="Zoom in"><Plus size={20} /></button>
          <button onclick={() => zoomAt(1 / 1.6)} disabled={k <= 1} aria-label="Zoom out" title="Zoom out"><Minus size={20} /></button>
          <button onclick={reset} disabled={k <= 1} aria-label="Whole world" title="Whole world"><Maximize2 size={18} /></button>
        </div>
      {/if}
    </div>
  </section>
{/if}

<style>
  .game {
    height: 100%;
    display: grid;
    grid-template-rows: auto minmax(0, 1fr);
    gap: clamp(4px, 1.2vmin, 10px);
  }
  .prompt-row {
    display: flex;
    justify-content: center;
    padding-inline: var(--side-reserve);
    min-height: var(--header-h);
    align-items: center;
  }
  .prompt {
    display: inline-flex;
    align-items: center;
    gap: 0.4em;
    max-width: 100%;
    padding: 0.15em 0.5em;
    border-radius: var(--radius);
    font-size: clamp(20px, 5.5vmin, 46px);
    font-weight: 800;
    line-height: 1.1;
  }
  .prompt:hover {
    background: var(--surface);
  }
  .prompt-flag {
    container-type: size;
    display: grid;
    place-items: center;
    width: 1.6em;
    height: 1.1em;
    flex-shrink: 0;
  }
  .prompt :global(.speaker) {
    flex-shrink: 0;
    width: 0.7em;
    height: 0.7em;
    color: var(--green);
  }
  .name {
    text-align: center;
  }
  .map-box {
    position: relative;
    min-height: 0;
    display: grid;
  }
  .map {
    width: 100%;
    height: 100%;
    touch-action: none;
    cursor: pointer;
  }
  .neutral path {
    fill: var(--surface-2);
    stroke: var(--bg);
    stroke-width: 0.6px;
    opacity: 0.6;
  }
  .country {
    fill: var(--surface-2);
    stroke: var(--bg);
    stroke-width: 0.7px;
    transition: fill 0.12s ease;
  }
  .map:not(.solved) .country:hover:not(.wrong) {
    fill: color-mix(in srgb, var(--gold) 55%, var(--surface-2));
  }
  .country.wrong {
    fill: var(--bad);
  }
  .country.correct {
    fill: var(--ok);
  }
  .marker .hit {
    fill: transparent;
  }
  .marker .dot {
    fill: var(--surface-2);
    stroke: var(--muted);
    stroke-width: 1.4;
  }
  .map:not(.solved) .marker:not(.wrong):hover .dot {
    fill: var(--gold);
  }
  .marker.wrong .dot {
    fill: var(--bad);
    stroke: var(--bad);
  }
  .marker.correct .dot {
    fill: var(--ok);
    stroke: var(--ok);
  }
  .label {
    pointer-events: none;
    animation: appear 0.25s ease;
  }
  .label image {
    filter: drop-shadow(0 1px 2px rgb(0 0 0 / 0.4));
  }
  .label text {
    font-size: 13px;
    font-weight: 800;
    fill: var(--bad);
    stroke: var(--bg);
    stroke-width: 3.5px;
    paint-order: stroke;
  }
  .label.correct text {
    fill: var(--ok);
  }
  .zoom {
    position: absolute;
    left: 0;
    bottom: 0;
    display: flex;
    flex-direction: column;
    gap: 4px;
  }
  .zoom button {
    display: grid;
    place-items: center;
    width: clamp(32px, 7vmin, 42px);
    height: clamp(32px, 7vmin, 42px);
    border-radius: var(--radius-sm);
    background: var(--surface);
    box-shadow: 0 1px 3px rgb(0 0 0 / 0.15);
  }
  .zoom button:disabled {
    opacity: 0.35;
  }
  @keyframes appear {
    from {
      opacity: 0;
    }
  }
</style>
