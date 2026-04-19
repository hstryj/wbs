<script lang="ts">
  import { tree, addRoot } from '../lib/state/tree';
  import { activeTab } from '../lib/state/ui';
  import TemplatesModal from './TemplatesModal.svelte';

  let templatesOpen = false;

  function addTask() {
    if (!$tree.length) {
      addRoot();
      return;
    }
    activeTab.set('table');
  }

  function exportReport() {
    activeTab.set('report');
  }

  function openTemplates() {
    templatesOpen = true;
  }
</script>

<div class="toolbar">
  <button class="btn btn-blue" on:click={addTask}>
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
      <rect x="5.25" y="1" width="1.5" height="10" rx=".75" fill="#fff"/>
      <rect x="1" y="5.25" width="10" height="1.5" rx=".75" fill="#fff"/>
    </svg>
    Dodaj zadanie
  </button>

  <button class="btn btn-secondary" on:click={openTemplates}>
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
      <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/>
      <polyline points="17 21 17 13 7 13 7 21"/>
      <polyline points="7 3 7 8 15 8"/>
    </svg>
    Szablony
  </button>

  <button class="btn btn-secondary" on:click={exportReport}>
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
      <polyline points="7 10 12 15 17 10"/>
      <line x1="12" y1="15" x2="12" y2="3"/>
    </svg>
    Eksportuj
  </button>
</div>

<TemplatesModal bind:open={templatesOpen} />

<style>
  .btn-secondary {
    background: var(--bg-surface);
    color: var(--text-primary);
    border-color: var(--border-strong);
  }
  .btn-secondary:hover {
    background: var(--brand-primary-bg);
    color: var(--brand-primary-dark);
    border-color: var(--brand-primary);
  }
</style>
