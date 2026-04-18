<script lang="ts">
  import { addRoot } from '../lib/state/tree';
</script>

<div class="toolbar">
  <button class="btn btn-blue" on:click={addRoot}>
    <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
      <rect x="6" y="1" width="1.5" height="11" rx=".75" fill="#fff"/>
      <rect x="1" y="6" width="11" height="1.5" rx=".75" fill="#fff"/>
    </svg>
    Dodaj punkt główny
  </button>
  <span class="sep"></span>
  <span style="font-size:11px;color:#7a92ad">Migracja Svelte — w toku</span>
</div>
