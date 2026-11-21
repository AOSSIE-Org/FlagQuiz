<script lang="ts">
  import { Building2, CaseSensitive, Flag, Landmark, MapPin } from '@lucide/svelte';
  import type { GameId } from '../lib/types';

  let { game }: { game: GameId } = $props();
</script>

{#if game === 'flag'}<Flag />{:else if game === 'country'}<CaseSensitive />{:else if game === 'location'}<MapPin />{:else if game === 'capital'}<Landmark />{:else}<Building2 />{/if}
