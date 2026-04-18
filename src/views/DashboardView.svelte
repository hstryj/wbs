<script lang="ts">
  import { tree } from '../lib/state/tree';
  import { assignCodes, collectLeaves, nodeDonePct, rootWeightSum, rootWeightedSum } from '../lib/utils/wbs';
  import SegmentedBar from '../components/SegmentedBar.svelte';
  import { activeTab } from '../lib/state/ui';
  import type { WbsNode, TabName } from '../lib/types';

  $: ($tree, assignCodes($tree));
  $: leaves = collectLeaves($tree);

  $: rw = rootWeightSum($tree);
  $: rwtd = rootWeightedSum($tree);
  $: tot = rw > 0 ? (rwtd / rw) * 100 : 0;

  $: today = new Date().toISOString().slice(0, 10);

  $: done100 = leaves.filter((n) => (n.done || 0) >= 100).length;
  $: doneIP  = leaves.filter((n) => (n.done || 0) > 0 && (n.done || 0) < 100).length;
  $: done0   = leaves.filter((n) => (n.done || 0) === 0).length;
  $: unass   = leaves.filter((n) => !n.resp).length;
  $: crit    = leaves.filter((n) => n.priority === 'Krytyczny' && (n.done || 0) < 100).length;
  $: ragR    = leaves.filter((n) => n.rag === 'R').length;
  $: overdue = leaves.filter((n) => n.dateEnd && n.dateEnd < today && (n.done || 0) < 100).length;
  $: totalMD = leaves.reduce((a, n) => a + (n.md || 0), 0);
  $: doneMD  = leaves.reduce((a, n) => a + (n.md || 0) * (n.done || 0) / 100, 0);

  // "Brak osób przypisanych: w X sekcjach" — count distinct top-level sections with any unassigned leaf
  $: sectionsWithUnassigned = (() => {
    let count = 0;
    for (const root of $tree) {
      const nodes = root.isProject ? root.children : [root];
      for (const sec of nodes) {
        const secLeaves = collectLeaves([sec]);
        if (secLeaves.some((n) => !n.resp)) count++;
      }
    }
    return count;
  })();

  // Sections for segmented bar (flattened top-level sections, not project roots)
  $: sections = (() => {
    const out: { label: string; weight: number; done: number }[] = [];
    for (const root of $tree) {
      const nodes = root.isProject ? root.children : [root];
      for (const sec of nodes) {
        out.push({
          label: (sec._code ? sec._code + ' ' : '') + (sec.name || '(bez nazwy)'),
          weight: sec.weight || 0,
          done: Math.round(nodeDonePct(sec))
        });
      }
    }
    return out;
  })();

  $: critItems = leaves.filter((n) => n.priority === 'Krytyczny' && (n.done || 0) < 100).slice(0, 8);

  function jumpTo(tab: TabName) {
    activeTab.set(tab);
  }

  // Text colors (semantic only)
  function accent(v: number, kind: 'more-is-bad' | 'more-is-good'): string {
    if (v === 0) return kind === 'more-is-bad' ? 'var(--color-success)' : 'var(--text-muted)';
    return kind === 'more-is-bad' ? (v >= 3 ? 'var(--color-danger)' : 'var(--color-warning)') : 'var(--brand-primary)';
  }
</script>

<div class="inner-pane dash-root">
  <!-- ── Overview strip ────────────────────────────────────────── -->
  <section class="dash-hero">
    <div class="hero-left">
      <div class="hero-label">Zaawansowanie ogólne projektu</div>
      <div class="hero-value">{tot.toFixed(1)}<span class="hero-unit">%</span></div>
      <div class="hero-sub">
        <strong>{rwtd.toFixed(1)}%</strong> ważone · <strong>{rw.toFixed(1)}%</strong> suma wag · <strong>{leaves.length}</strong> zadań
      </div>
    </div>
    <div class="hero-right">
      <div class="stat">
        <div class="stat-label">Ukończone</div>
        <div class="stat-value">{done100} <span class="stat-total">/ {leaves.length}</span></div>
      </div>
      <div class="stat">
        <div class="stat-label">W trakcie</div>
        <div class="stat-value">{doneIP}</div>
      </div>
      <div class="stat">
        <div class="stat-label">Nie rozpoczęte</div>
        <div class="stat-value">{done0}</div>
      </div>
      <div class="stat">
        <div class="stat-label">Estymacja (MD)</div>
        <div class="stat-value">{totalMD.toFixed(1)}<span class="stat-total"> / {doneMD.toFixed(1)} wyk.</span></div>
      </div>
    </div>
  </section>

  <!-- ── Two-column: Attention + Sections progress ────────────── -->
  <div class="dash-grid">
    <!-- Left: attention panel -->
    <section class="panel">
      <header class="panel-hdr">
        <h2>Co wymaga uwagi dzisiaj?</h2>
      </header>

      <button class="alert-row alert-row-btn" on:click={() => jumpTo('rank')} type="button">
        <div class="alert-label">Opóźnione zadania</div>
        <div class="alert-count" style="color:{accent(overdue, 'more-is-bad')}">{overdue}</div>
        <span class="alert-tag" style="background:{overdue > 0 ? 'var(--color-warning-bg)' : 'var(--color-success-bg)'};color:{overdue > 0 ? 'var(--color-warning)' : 'var(--color-success)'}">
          {overdue > 0 ? 'po terminie' : 'brak'}
        </span>
      </button>

      <button class="alert-row alert-row-btn" on:click={() => jumpTo('rank')} type="button">
        <div class="alert-label">Zadania krytyczne (nieukończone)</div>
        <div class="alert-count" style="color:{accent(crit, 'more-is-bad')}">{crit}</div>
        <span class="alert-tag" style="background:{crit > 0 ? 'var(--color-danger-bg)' : 'var(--color-success-bg)'};color:{crit > 0 ? 'var(--color-danger)' : 'var(--color-success)'}">
          {crit > 0 ? 'pilne' : 'brak'}
        </span>
      </button>

      <button class="alert-row alert-row-btn" on:click={() => jumpTo('risk')} type="button">
        <div class="alert-label">Zadania Red (RAG)</div>
        <div class="alert-count" style="color:{accent(ragR, 'more-is-bad')}">{ragR}</div>
        <span class="alert-tag" style="background:{ragR > 0 ? 'var(--color-danger-bg)' : 'var(--color-success-bg)'};color:{ragR > 0 ? 'var(--color-danger)' : 'var(--color-success)'}">
          {ragR > 0 ? 'ryzyko' : 'brak'}
        </span>
      </button>

      <button class="alert-row alert-row-btn" on:click={() => jumpTo('team')} type="button">
        <div class="alert-label">Brak osób przypisanych</div>
        <div class="alert-count" style="color:{accent(unass, 'more-is-bad')}">{unass}</div>
        <span class="alert-tag" style="background:{sectionsWithUnassigned > 0 ? 'var(--color-warning-bg)' : 'var(--color-success-bg)'};color:{sectionsWithUnassigned > 0 ? 'var(--color-warning)' : 'var(--color-success)'}">
          {sectionsWithUnassigned > 0 ? `w ${sectionsWithUnassigned} sekcjach` : 'wszystko obsadzone'}
        </span>
      </button>
    </section>

    <!-- Right: section progress -->
    <section class="panel">
      <header class="panel-hdr">
        <h2>Zaawansowanie sekcji głównych</h2>
      </header>

      {#if !sections.length}
        <p class="empty">Brak sekcji. Dodaj pierwszą w Edytorze WBS.</p>
      {:else}
        <div class="section-list">
          {#each sections as s}
            {@const color = s.done >= 100 ? 'var(--color-success)' :
                            s.done >= 50 ? 'var(--brand-primary)' :
                            s.done >= 25 ? 'var(--color-warning)' :
                            'var(--color-neutral)'}
            <div class="section-row">
              <div class="section-label">
                <span class="section-name" title={s.label}>{s.label}</span>
                <span class="section-val">{s.done}% <span class="section-wt">· waga {s.weight}%</span></span>
              </div>
              <div class="section-bar">
                <div class="section-bar-fill" style="width:{Math.min(s.done, 100)}%;background:{color}"></div>
              </div>
            </div>
          {/each}
        </div>
      {/if}
    </section>
  </div>

  <!-- ── Critical tasks table (if any) ───────────────────────── -->
  {#if critItems.length}
    <section class="panel panel-danger" style="margin-top:24px">
      <header class="panel-hdr">
        <h2 style="color:var(--color-danger)">Zadania krytyczne do ukończenia</h2>
        <button class="link-btn" on:click={() => jumpTo('rank')} type="button">Zobacz wszystkie →</button>
      </header>

      <div class="tbl-wrap" style="border-radius:var(--radius-md);border-top:1px solid var(--border)">
        <table class="rank">
          <thead>
            <tr>
              <th style="width:86px">Kod</th>
              <th>Zadanie</th>
              <th style="width:110px">Odpowiedzialny</th>
              <th style="width:110px">Termin</th>
              <th style="width:90px;text-align:center">Postęp</th>
            </tr>
          </thead>
          <tbody>
            {#each critItems as n}
              {@const over = n.dateEnd && n.dateEnd < today && (n.done || 0) < 100}
              <tr>
                <td><span style="font-family:'Courier New',monospace;font-size:10px;color:var(--text-muted)">{n._code ?? ''}</span></td>
                <td style="font-weight:600;color:var(--text-primary)">{n.name || '–'}</td>
                <td style="color:var(--text-secondary)">{n.resp || '—'}</td>
                <td style="color:{over ? 'var(--color-danger)' : 'var(--text-secondary)'};font-weight:{over ? 700 : 400}">{n.dateEnd || '—'}{over ? ' ⚠' : ''}</td>
                <td style="text-align:center;font-weight:700;color:var(--brand-primary)">{n.done || 0}%</td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
    </section>
  {/if}
</div>

<style>
  .dash-root {
    padding: 22px;
  }

  /* Hero strip — clean numeric overview */
  .dash-hero {
    display: grid;
    grid-template-columns: auto 1fr;
    gap: 32px;
    align-items: center;
    padding: 22px 24px;
    background: var(--bg-muted);
    border: 1px solid var(--border);
    border-radius: var(--radius-lg);
    margin-bottom: 22px;
  }
  .hero-left {
    display: flex;
    flex-direction: column;
    gap: 4px;
    min-width: 0;
  }
  .hero-label {
    font-size: 11px;
    color: var(--text-secondary);
    text-transform: uppercase;
    letter-spacing: .08em;
    font-weight: 600;
  }
  .hero-value {
    font-size: 48px;
    font-weight: 700;
    color: var(--text-primary);
    line-height: 1;
    letter-spacing: -0.03em;
    font-variant-numeric: tabular-nums;
  }
  .hero-unit {
    font-size: 28px;
    color: var(--text-muted);
    font-weight: 400;
  }
  .hero-sub {
    font-size: 12px;
    color: var(--text-secondary);
    margin-top: 4px;
  }
  .hero-sub strong {
    color: var(--text-primary);
    font-variant-numeric: tabular-nums;
  }

  .hero-right {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 0;
  }
  .stat {
    padding: 8px 18px;
    border-left: 1px solid var(--border);
  }
  .stat:first-child {
    border-left: none;
    padding-left: 0;
  }
  .stat-label {
    font-size: 10px;
    color: var(--text-secondary);
    text-transform: uppercase;
    letter-spacing: .06em;
    font-weight: 600;
    margin-bottom: 3px;
  }
  .stat-value {
    font-size: 22px;
    font-weight: 700;
    color: var(--text-primary);
    font-variant-numeric: tabular-nums;
    letter-spacing: -0.02em;
  }
  .stat-total {
    font-size: 12px;
    font-weight: 400;
    color: var(--text-muted);
  }

  /* Two-column layout */
  .dash-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 18px;
  }

  .panel {
    background: var(--bg-surface);
    border: 1px solid var(--border);
    border-radius: var(--radius-lg);
    padding: 18px 20px;
  }
  .panel-danger {
    border-left: 3px solid var(--color-danger);
  }
  .panel-hdr {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 14px;
    padding-bottom: 10px;
    border-bottom: 1px solid var(--border);
    gap: 10px;
  }
  .panel-hdr h2 {
    font-size: 13px;
    font-weight: 700;
    color: var(--text-primary);
    text-transform: uppercase;
    letter-spacing: .04em;
    margin: 0;
  }

  /* Alert rows */
  .alert-row {
    display: grid;
    grid-template-columns: 1fr auto auto;
    gap: 14px;
    align-items: center;
    padding: 12px 4px;
    border-bottom: 1px solid var(--border-subtle);
    text-align: left;
    background: transparent;
    border-left: none;
    border-right: none;
    border-top: none;
    width: 100%;
    cursor: pointer;
    color: inherit;
    font-family: inherit;
    transition: background .12s ease;
  }
  .alert-row:last-of-type { border-bottom: none; }
  .alert-row-btn:hover { background: var(--bg-muted); }
  .alert-label {
    font-size: 13px;
    color: var(--text-primary);
    font-weight: 500;
  }
  .alert-count {
    font-size: 20px;
    font-weight: 700;
    font-variant-numeric: tabular-nums;
    min-width: 36px;
    text-align: right;
  }
  .alert-tag {
    font-size: 10px;
    font-weight: 600;
    padding: 3px 10px;
    border-radius: var(--radius-sm);
    text-transform: uppercase;
    letter-spacing: .04em;
    white-space: nowrap;
  }

  /* Section progress list */
  .section-list {
    display: flex;
    flex-direction: column;
    gap: 14px;
  }
  .section-row {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }
  .section-label {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    gap: 10px;
  }
  .section-name {
    font-size: 12px;
    font-weight: 600;
    color: var(--text-primary);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    max-width: 70%;
  }
  .section-val {
    font-size: 12px;
    font-weight: 700;
    color: var(--text-primary);
    font-variant-numeric: tabular-nums;
    white-space: nowrap;
  }
  .section-wt {
    color: var(--text-muted);
    font-weight: 400;
  }
  .section-bar {
    height: 10px;
    background: var(--bg-muted);
    border-radius: 5px;
    overflow: hidden;
  }
  .section-bar-fill {
    height: 100%;
    border-radius: 5px;
    transition: width .3s ease, background .2s ease;
  }
  .empty {
    color: var(--text-muted);
    font-size: 12px;
    padding: 20px 0;
    font-style: italic;
  }

  .link-btn {
    background: transparent;
    border: none;
    color: var(--brand-primary);
    font-size: 11px;
    font-weight: 600;
    cursor: pointer;
    padding: 4px 8px;
    border-radius: var(--radius-sm);
    transition: background .15s;
  }
  .link-btn:hover { background: var(--brand-primary-bg); }

  /* Mobile */
  @media (max-width: 900px) {
    .dash-hero {
      grid-template-columns: 1fr;
      gap: 20px;
      padding: 18px;
    }
    .hero-right {
      grid-template-columns: repeat(2, 1fr);
      gap: 0;
    }
    .stat {
      padding: 10px 0;
      border-left: none;
      border-top: 1px solid var(--border);
    }
    .stat:nth-child(2) {
      border-left: 1px solid var(--border);
      padding-left: 18px;
    }
    .stat:nth-child(4) {
      border-left: 1px solid var(--border);
      padding-left: 18px;
    }
    .dash-grid {
      grid-template-columns: 1fr;
    }
    .dash-root { padding: 12px; }
    .hero-value { font-size: 40px; }
  }
</style>
