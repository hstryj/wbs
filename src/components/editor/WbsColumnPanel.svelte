<script lang="ts">
  import { colVis, colPanelOpen, type ColName } from '../../lib/state/ui';

  const COL_LIST: ColName[] = ['waga', 'waz', 'rag', 'md', 'start', 'end', 'pri', 'note'];
  const COL_LABELS: Record<ColName, string> = {
    waga: 'Waga',
    waz: 'Ważone',
    rag: 'RAG',
    md: 'MD',
    start: 'Start',
    end: 'Koniec',
    pri: 'Priorytet',
    note: 'Uwagi'
  };

  function toggleCol(name: ColName) {
    colVis.update((v) => ({ ...v, [name]: !v[name] }));
  }
</script>

<div style="display:flex;gap:8px;padding:6px 14px;background:var(--bg-muted);border-bottom:1px solid var(--border)">
  <button
    class="btn"
    on:click={() => colPanelOpen.update((v) => !v)}
    style="background:var(--bg-subtle);color:var(--text-primary);border-color:var(--border-strong)"
  >
    <svg width="13" height="13" viewBox="0 0 13 13" fill="none" aria-hidden="true">
      <rect x="1" y="1" width="3" height="11" rx="1" fill="currentColor" opacity=".6"/>
      <rect x="5" y="1" width="3" height="11" rx="1" fill="currentColor"/>
      <rect x="9" y="1" width="3" height="11" rx="1" fill="currentColor" opacity=".6"/>
    </svg>
    Kolumny
  </button>
</div>

<div class="col-panel {$colPanelOpen ? 'open' : 'shut'}">
  <div class="col-panel-inner">
    <span style="font-size:11px;font-weight:600;color:var(--text-secondary);margin-right:4px">Pokaż kolumny:</span>
    {#each COL_LIST as c}
      <label>
        <input type="checkbox" checked={$colVis[c]} on:change={() => toggleCol(c)} />
        {COL_LABELS[c]}
      </label>
    {/each}
  </div>
</div>
