<script lang="ts">
  import { tree, addRoot } from '../lib/state/tree';
  import { collectLeaves, isLeaf } from '../lib/utils/wbs';
  import { activeTab } from '../lib/state/ui';

  function addTask() {
    // Jeśli są już sekcje — dodaj leaf do ostatniej; inaczej utwórz projekt.
    const t = $tree;
    if (!t.length) {
      addRoot();
      return;
    }
    // Najlepsza prosta heurystyka: przełącz na edytor WBS, gdzie można
    // dodać podpunkt pod konkretną sekcję. Inaczej nowy leaf bez kontekstu
    // tworzy bałagan w hierarchii.
    activeTab.set('table');
  }

  function exportReport() {
    // Otwórz widok raportu który ma wbudowany przycisk drukowania.
    activeTab.set('report');
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

  <button class="btn" on:click={exportReport} style="background:var(--bg-surface);color:var(--text-primary);border-color:var(--border-strong)">
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
      <polyline points="7 10 12 15 17 10"/>
      <line x1="12" y1="15" x2="12" y2="3"/>
    </svg>
    Eksportuj
  </button>
</div>
