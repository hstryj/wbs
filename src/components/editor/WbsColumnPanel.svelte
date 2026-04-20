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

<div class="desktop-only">
  <div style="display:flex;gap:8px;padding:6px 14px;background:var(--bg-muted);border-bottom:1px solid var(--border)">
    <button
      type="button"
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
</div>

<section class="mobile-column-dock mobile-only">
  <div class="mobile-column-copy">
    <span class="mobile-column-eyebrow">Układ kart</span>
    <strong>Pola mobilnego widoku</strong>
    <span>Przesuwaj kafelki i wybierz, które kolumny mają być widoczne na telefonie.</span>
  </div>

  <div class="mobile-column-rail" aria-label="Przełączniki kolumn mobilnych">
    {#each COL_LIST as c}
      <button
        type="button"
        class="mobile-column-pill"
        class:active={$colVis[c]}
        on:click={() => toggleCol(c)}
      >
        <span>{COL_LABELS[c]}</span>
        <small>{$colVis[c] ? 'Widoczne' : 'Ukryte'}</small>
      </button>
    {/each}
  </div>
</section>

<style>
  .mobile-only {
    display: none;
  }

  @media (max-width: 820px) {
    .desktop-only {
      display: none;
    }

    .mobile-only {
      display: block;
    }

    .mobile-column-dock {
      padding: 14px;
      background: linear-gradient(180deg, rgba(245, 249, 253, 0.98), rgba(238, 245, 251, 0.96));
      border-bottom: 1px solid var(--border);
    }

    .mobile-column-copy {
      display: flex;
      flex-direction: column;
      gap: 4px;
      margin-bottom: 12px;
    }

    .mobile-column-eyebrow {
      font-size: 11px;
      font-weight: 700;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      color: var(--text-muted);
    }

    .mobile-column-copy strong {
      font-size: 17px;
      color: #12345d;
      letter-spacing: -0.02em;
    }

    .mobile-column-copy span:last-child {
      font-size: 13px;
      line-height: 1.4;
      color: var(--text-secondary);
    }

    .mobile-column-rail {
      display: flex;
      gap: 10px;
      overflow-x: auto;
      padding-bottom: 2px;
      scroll-snap-type: x proximity;
      -webkit-overflow-scrolling: touch;
    }

    .mobile-column-pill {
      flex: 0 0 auto;
      min-width: 136px;
      display: flex;
      flex-direction: column;
      gap: 3px;
      padding: 12px 14px;
      border-radius: 18px;
      border: 1px solid rgba(37, 84, 136, 0.14);
      background: rgba(255, 255, 255, 0.94);
      text-align: left;
      color: var(--text-primary);
      box-shadow: 0 10px 18px rgba(31, 56, 100, 0.06);
      cursor: pointer;
      scroll-snap-align: start;
    }

    .mobile-column-pill.active {
      border-color: rgba(46, 117, 182, 0.34);
      background: rgba(46, 117, 182, 0.1);
      box-shadow: 0 14px 22px rgba(46, 117, 182, 0.12);
    }

    .mobile-column-pill span {
      font-size: 14px;
      font-weight: 700;
    }

    .mobile-column-pill small {
      font-size: 12px;
      color: var(--text-secondary);
    }
  }
</style>
