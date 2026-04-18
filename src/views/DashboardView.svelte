<script lang="ts">
  import { tree } from '../lib/state/tree';
  import { activeTab } from '../lib/state/ui';
  import { projectMeta, fmtPln } from '../lib/state/project';
  import {
    assignCodes, collectLeaves, nodeDonePct,
    rootWeightSum, rootWeightedSum,
    taskStatus, TASK_STATUS_LABEL, findSectionName,
    type TaskStatus
  } from '../lib/utils/wbs';
  import { todayISO } from '../lib/utils/dates';
  import type { WbsNode, TabName } from '../lib/types';

  $: ($tree, assignCodes($tree));
  $: today = todayISO();
  $: leaves = collectLeaves($tree);

  // ── Section progress ────────────────────────────────────────────
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

  // ── Summary metrics ────────────────────────────────────────────
  $: rw = rootWeightSum($tree);
  $: rwtd = rootWeightedSum($tree);
  $: overall = rw > 0 ? (rwtd / rw) * 100 : 0;

  $: overdue = leaves.filter((n) => n.dateEnd && n.dateEnd < today && (n.done || 0) < 100).length;
  $: critical = leaves.filter((n) => n.priority === 'Krytyczny' && (n.done || 0) < 100).length;
  $: ragR = leaves.filter((n) => n.rag === 'R').length;
  $: unassigned = leaves.filter((n) => !n.resp).length;

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

  $: critPct = leaves.length > 0 ? (critical / leaves.length) * 100 : 0;

  // ── Task table ─────────────────────────────────────────────────
  type StatusFilter = 'all' | TaskStatus;
  let statusFilter: StatusFilter = 'all';

  $: enrichedLeaves = leaves.map((n) => ({
    node: n,
    status: taskStatus(n, today),
    section: findSectionName($tree, n.id)
  }));

  $: filteredTasks = statusFilter === 'all'
    ? enrichedLeaves
    : enrichedLeaves.filter((t) => t.status === statusFilter);

  const STATUS_ORDER: StatusFilter[] = ['all', 'opoznione', 'krytyczne', 'w-trakcie', 'nowe', 'ukonczone'];
  const STATUS_FILTER_LABELS: Record<StatusFilter, string> = {
    'all':       'Wszystkie',
    'nowe':      'Nowe',
    'w-trakcie': 'W trakcie',
    'opoznione': 'Opóźnione',
    'krytyczne': 'Krytyczne',
    'ukonczone': 'Ukończone'
  };

  function statusCount(s: StatusFilter): number {
    if (s === 'all') return enrichedLeaves.length;
    return enrichedLeaves.filter((t) => t.status === s).length;
  }

  function jumpTo(tab: TabName) { activeTab.set(tab); }

  function fmtDate(iso?: string): string {
    if (!iso) return '—';
    // "2026-06-24" → "24 cze"
    const months = ['sty','lut','mar','kwi','maj','cze','lip','sie','wrz','paź','lis','gru'];
    const d = new Date(iso);
    if (isNaN(d.getTime())) return iso;
    return d.getDate() + ' ' + months[d.getMonth()];
  }

  function daysLeftText(end?: string): string {
    if (!end) return '';
    const d = Math.ceil((new Date(end).getTime() - new Date(today).getTime()) / 86400000);
    if (d < 0) return `(${-d} dn po)`;
    if (d === 0) return '(dziś)';
    return `(za ${d} dn)`;
  }
</script>

<div class="inner-pane dash-root">
  <!-- ── Two-column: Attention + Sections progress ─────────────── -->
  <div class="dash-grid">
    <section class="panel">
      <header class="panel-hdr">
        <h2>Co wymaga uwagi dzisiaj?</h2>
      </header>

      <button class="alert-row" on:click={() => { statusFilter = 'opoznione'; }} type="button">
        <span class="alert-label">Opóźnione zadania</span>
        <span class="alert-count" class:is-bad={overdue > 0}>{overdue}</span>
        <span class="alert-tag tag-{overdue > 0 ? 'warn' : 'ok'}">
          {overdue > 0 ? 'po terminie' : 'brak'}
        </span>
      </button>

      <button class="alert-row" on:click={() => { statusFilter = 'krytyczne'; }} type="button">
        <span class="alert-label">Zadania krytyczne</span>
        <span class="alert-count" class:is-bad={critical > 0}>{critical}</span>
        <span class="alert-tag tag-{critical > 0 ? 'danger' : 'ok'}">
          {critical > 0 ? 'pilne' : 'brak'}
        </span>
      </button>

      <button class="alert-row" on:click={() => jumpTo('risk')} type="button">
        <span class="alert-label">Zadania Red (RAG)</span>
        <span class="alert-count" class:is-bad={ragR > 0}>{ragR}</span>
        <span class="alert-tag tag-{ragR > 0 ? 'danger' : 'ok'}">
          {ragR > 0 ? 'ryzyko' : 'brak'}
        </span>
      </button>

      <button class="alert-row" on:click={() => jumpTo('team')} type="button">
        <span class="alert-label">Brak osób przypisanych</span>
        <span class="alert-count" class:is-bad={unassigned > 0}>{unassigned}</span>
        <span class="alert-tag tag-{sectionsWithUnassigned > 0 ? 'warn' : 'ok'}">
          {sectionsWithUnassigned > 0 ? `w ${sectionsWithUnassigned} sekcjach` : 'wszystko obsadzone'}
        </span>
      </button>
    </section>

    <section class="panel">
      <header class="panel-hdr">
        <h2>Zaawansowanie sekcji głównych</h2>
        <span class="panel-meta">{overall.toFixed(1)}% ogółem</span>
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

  <!-- ── Tasks table ─────────────────────────────────────────── -->
  <section class="panel tasks-panel">
    <header class="panel-hdr">
      <h2>Zadania</h2>
      <div class="filters">
        {#each STATUS_ORDER as s}
          {@const count = statusCount(s)}
          <button
            class="filter-btn"
            class:active={statusFilter === s}
            on:click={() => (statusFilter = s)}
            type="button"
          >
            {STATUS_FILTER_LABELS[s]}
            <span class="filter-count">{count}</span>
          </button>
        {/each}
      </div>
    </header>

    <div class="tbl-wrap">
      <table class="rank">
        <thead>
          <tr>
            <th style="width:86px">Zadanie</th>
            <th style="width:120px">Status</th>
            <th style="width:160px">Odpowiedzialny</th>
            <th style="width:120px">Termin</th>
            <th style="width:110px">Postęp</th>
            <th style="width:90px">Koszt</th>
            <th>Sekcja</th>
          </tr>
        </thead>
        <tbody>
          {#if !filteredTasks.length}
            <tr><td colspan="7" style="text-align:center;padding:30px;color:var(--text-muted)">
              {enrichedLeaves.length === 0
                ? 'Brak zadań. Dodaj je w Edytorze WBS.'
                : 'Brak zadań w tym statusie.'}
            </td></tr>
          {:else}
            {#each filteredTasks.slice(0, 12) as t}
              {@const n = t.node}
              {@const progressColor = (n.done || 0) >= 100 ? 'var(--color-success)' :
                                      (n.done || 0) >= 50 ? 'var(--brand-primary)' :
                                      (n.done || 0) > 0 ? 'var(--color-warning)' :
                                      'var(--color-neutral)'}
              <tr>
                <td>
                  <div class="task-code">{n._code ?? ''}</div>
                  <div class="task-name" title={n.name}>{n.name || '—'}</div>
                </td>
                <td>
                  <span class="status-badge status-{t.status}">{TASK_STATUS_LABEL[t.status]}</span>
                </td>
                <td class="cell-muted">{n.resp || '—'}</td>
                <td class="cell-muted">
                  {fmtDate(n.dateEnd)}
                  {#if n.dateEnd}
                    <span class="task-days">{daysLeftText(n.dateEnd)}</span>
                  {/if}
                </td>
                <td>
                  <div class="progress-wrap">
                    <div class="progress-bar">
                      <div class="progress-fill" style="width:{Math.min(n.done || 0, 100)}%;background:{progressColor}"></div>
                    </div>
                    <span class="progress-val">{n.done || 0}%</span>
                  </div>
                </td>
                <td class="cell-muted cell-num">{n.md ? `${n.md} MD` : '—'}</td>
                <td class="cell-muted">{t.section}</td>
              </tr>
            {/each}
          {/if}
          {#if filteredTasks.length > 12}
            <tr><td colspan="7" style="text-align:center;padding:10px;color:var(--text-muted);font-size:11px">
              …i {filteredTasks.length - 12} więcej. <button class="link-btn" on:click={() => jumpTo('rank')}>Zobacz wszystkie zadania →</button>
            </td></tr>
          {/if}
        </tbody>
      </table>
    </div>
  </section>

  <!-- ── Bottom summary strip ──────────────────────────────────── -->
  <div class="bottom-strip">
    <div class="strip-cell">
      <span class="strip-label">Zaawansowanie sekcji głównych</span>
      <span class="strip-value">{overall.toFixed(1)}%</span>
    </div>
    <div class="strip-cell">
      <span class="strip-label">Koszt</span>
      <span class="strip-value">
        {fmtPln($projectMeta.actualBudget)} / {fmtPln($projectMeta.plannedBudget)} {$projectMeta.currency}
      </span>
    </div>
    <div class="strip-cell">
      <span class="strip-label">Zadania krytyczne</span>
      <span class="strip-value">{critPct.toFixed(0)}%</span>
    </div>
  </div>
</div>

<style>
  .dash-root {
    padding: 16px;
    display: flex;
    flex-direction: column;
    gap: 14px;
  }

  .dash-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 12px;
  }

  .panel {
    background: var(--bg-surface);
    border: 1px solid var(--border);
    border-radius: var(--radius-md);
  }
  .panel-hdr {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 12px 16px;
    border-bottom: 1px solid var(--border);
    gap: 12px;
  }
  .panel-hdr h2 {
    font-size: 13px;
    font-weight: 600;
    color: var(--text-primary);
    margin: 0;
  }
  .panel-meta {
    font-size: 11px;
    color: var(--text-secondary);
    font-variant-numeric: tabular-nums;
  }

  /* Alert rows (attention panel) */
  .alert-row {
    display: grid;
    grid-template-columns: 1fr auto auto;
    gap: 14px;
    align-items: center;
    padding: 11px 16px;
    border-bottom: 1px solid var(--border-subtle);
    width: 100%;
    background: transparent;
    border-left: none;
    border-right: none;
    border-top: none;
    color: inherit;
    font-family: inherit;
    font-size: 13px;
    text-align: left;
    cursor: pointer;
    transition: background .12s ease;
  }
  .alert-row:last-of-type { border-bottom: none; }
  .alert-row:hover { background: var(--bg-muted); }
  .alert-label { color: var(--text-primary); font-weight: 500; }
  .alert-count {
    font-size: 16px;
    font-weight: 700;
    color: var(--text-primary);
    font-variant-numeric: tabular-nums;
    min-width: 24px;
    text-align: right;
  }
  .alert-count.is-bad { color: var(--color-danger); }

  .alert-tag {
    font-size: 11px;
    font-weight: 500;
    padding: 2px 8px;
    border-radius: var(--radius-sm);
    white-space: nowrap;
  }
  .tag-ok     { background: var(--color-success-bg); color: var(--color-success); }
  .tag-warn   { background: var(--color-warning-bg); color: var(--color-warning); }
  .tag-danger { background: var(--color-danger-bg);  color: var(--color-danger); }

  /* Section progress list */
  .section-list {
    display: flex;
    flex-direction: column;
    gap: 10px;
    padding: 14px 16px;
  }
  .section-row { display: flex; flex-direction: column; gap: 5px; }
  .section-label { display: flex; justify-content: space-between; align-items: baseline; gap: 10px; }
  .section-name {
    font-size: 12px;
    font-weight: 500;
    color: var(--text-primary);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    max-width: 70%;
  }
  .section-val {
    font-size: 12px;
    font-weight: 600;
    color: var(--text-primary);
    font-variant-numeric: tabular-nums;
    white-space: nowrap;
  }
  .section-wt { color: var(--text-muted); font-weight: 400; }
  .section-bar { height: 8px; background: var(--bg-muted); border-radius: var(--radius-sm); overflow: hidden; }
  .section-bar-fill { height: 100%; transition: width .3s ease; }

  .empty {
    color: var(--text-muted);
    font-size: 12px;
    padding: 16px;
    font-style: italic;
  }

  /* Tasks panel */
  .tasks-panel .tbl-wrap { border: none; border-top: 1px solid var(--border); }
  .filters {
    display: flex;
    gap: 0;
    flex-wrap: wrap;
    border-bottom: 1px solid transparent;
  }
  .filter-btn {
    font-size: 12px;
    font-weight: 500;
    padding: 6px 12px;
    background: transparent;
    border: none;
    border-bottom: 2px solid transparent;
    margin-bottom: -1px;
    color: var(--text-secondary);
    cursor: pointer;
    font-family: inherit;
    display: inline-flex;
    align-items: center;
    gap: 6px;
    transition: color .12s, border-color .12s;
  }
  .filter-btn:hover { color: var(--text-primary); }
  .filter-btn.active {
    color: var(--brand-primary-dark);
    border-bottom-color: var(--brand-primary);
    font-weight: 600;
  }
  .filter-count {
    font-size: 10px;
    padding: 0 5px;
    min-width: 18px;
    height: 16px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    border-radius: 8px;
    background: var(--border);
    color: var(--text-secondary);
    font-variant-numeric: tabular-nums;
    font-weight: 600;
  }
  .filter-btn.active .filter-count { background: var(--brand-primary); color: #fff; }

  .tasks-panel table.rank td {
    padding: 10px 12px;
    font-size: 12px;
    vertical-align: middle;
    border-bottom: 1px solid var(--border-subtle);
  }
  .tasks-panel table.rank tr:last-child td { border-bottom: none; }
  .task-code {
    font-family: 'JetBrains Mono', 'SF Mono', 'Courier New', monospace;
    font-size: 10px;
    color: var(--text-muted);
    font-weight: 500;
    letter-spacing: .02em;
  }
  .task-name {
    font-size: 12px;
    font-weight: 600;
    color: var(--text-primary);
    margin-top: 1px;
    max-width: 200px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .task-days { color: var(--text-muted); margin-left: 4px; font-size: 11px; }
  .cell-muted { color: var(--text-secondary); }
  .cell-num { text-align: right; font-variant-numeric: tabular-nums; }

  /* Status badges — SAP/Jira style: subtle bg + colored text + 1px border */
  .status-badge {
    display: inline-block;
    padding: 2px 8px;
    border-radius: var(--radius-sm);
    font-size: 11px;
    font-weight: 600;
    letter-spacing: .01em;
    border: 1px solid transparent;
    white-space: nowrap;
    line-height: 1.4;
  }
  .status-nowe       { background: var(--bg-muted);           color: var(--text-secondary);    border-color: var(--border-strong); }
  .status-w-trakcie  { background: var(--brand-primary-bg);    color: var(--brand-primary-dark); border-color: var(--brand-primary); }
  .status-opoznione  { background: var(--color-warning-bg);    color: var(--color-warning);     border-color: var(--color-warning); }
  .status-krytyczne  { background: var(--color-danger-bg);     color: var(--color-danger);      border-color: var(--color-danger); }
  .status-ukonczone  { background: var(--color-success-bg);    color: var(--color-success);     border-color: var(--color-success); }

  /* Progress */
  .progress-wrap { display: flex; align-items: center; gap: 8px; }
  .progress-bar {
    flex: 1;
    height: 6px;
    background: var(--bg-muted);
    border-radius: var(--radius-sm);
    overflow: hidden;
  }
  .progress-fill { height: 100%; transition: width .3s ease; }
  .progress-val {
    font-size: 11px;
    font-weight: 600;
    color: var(--text-primary);
    font-variant-numeric: tabular-nums;
    min-width: 32px;
    text-align: right;
  }

  .link-btn {
    background: transparent;
    border: none;
    color: var(--brand-primary);
    font-size: 11px;
    font-weight: 500;
    cursor: pointer;
    padding: 2px 4px;
  }
  .link-btn:hover { text-decoration: underline; }

  /* Bottom strip */
  .bottom-strip {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    background: var(--bg-muted);
    border: 1px solid var(--border);
    border-radius: var(--radius-md);
  }
  .strip-cell {
    padding: 14px 20px;
    border-right: 1px solid var(--border);
    display: flex;
    flex-direction: column;
    gap: 2px;
  }
  .strip-cell:last-child { border-right: none; }
  .strip-label {
    font-size: 11px;
    color: var(--text-secondary);
    font-weight: 500;
  }
  .strip-value {
    font-size: 16px;
    font-weight: 700;
    color: var(--text-primary);
    font-variant-numeric: tabular-nums;
    letter-spacing: -0.005em;
  }

  /* Mobile */
  @media (max-width: 900px) {
    .dash-grid { grid-template-columns: 1fr; gap: 10px; }
    .bottom-strip { grid-template-columns: 1fr; }
    .strip-cell { border-right: none; border-bottom: 1px solid var(--border); }
    .strip-cell:last-child { border-bottom: none; }
    .filters { gap: 3px; }
    .filter-btn { padding: 6px 10px; font-size: 12px; }
  }
</style>
