<script lang="ts">
  import { tree } from '../lib/state/tree';
  import { people, pName, pRole } from '../lib/state/people';
  import { risks } from '../lib/state/risks';
  import { assignCodes, collectLeaves, nodeDonePct, nodeWtd, rootWeightSum, rootWeightedSum, barColor, isLeaf } from '../lib/utils/wbs';
  import { PRIORITY_DOT } from '../lib/utils/priority';
  import { todayISO } from '../lib/utils/dates';
  import { computeLevel } from '../lib/state/risks';
  import type { WbsNode } from '../lib/types';

  $: ($tree, assignCodes($tree));
  $: leaves = collectLeaves($tree);
  $: rw = rootWeightSum($tree);
  $: rwtd = rootWeightedSum($tree);
  $: tot = rw > 0 ? (rwtd / rw) * 100 : 0;

  $: today = todayISO();

  $: kpis = {
    overall: tot,
    total: leaves.length,
    done: leaves.filter((n) => (n.done || 0) >= 100).length,
    inProgress: leaves.filter((n) => (n.done || 0) > 0 && (n.done || 0) < 100).length,
    notStarted: leaves.filter((n) => (n.done || 0) === 0).length,
    critical: leaves.filter((n) => n.priority === 'Krytyczny' && (n.done || 0) < 100).length,
    overdue: leaves.filter((n) => n.dateEnd && n.dateEnd < today && (n.done || 0) < 100).length,
    unassigned: leaves.filter((n) => !n.resp).length,
    totalMD: leaves.reduce((a, n) => a + (n.md || 0), 0)
  };

  function flatListAll(list: WbsNode[], depth = 0, out: { n: WbsNode; depth: number }[] = []): { n: WbsNode; depth: number }[] {
    for (const n of list) {
      out.push({ n, depth });
      if (n.children.length) flatListAll(n.children, depth + 1, out);
    }
    return out;
  }
  $: flat = flatListAll($tree);

  function printReport() {
    // Use the print CSS applied to the print area; browser native PDF via Print dialog
    window.print();
  }
</script>

<div class="inner-pane print-hide">
  <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;flex-wrap:wrap;gap:10px">
    <h2 style="color:#1F3864;font-size:18px;margin:0">Raport projektu</h2>
    <button class="btn btn-green" on:click={printReport}>🖨 Drukuj / zapisz PDF</button>
  </div>
  <p style="color:#7a92ad;font-size:12px">
    Kliknij „Drukuj / zapisz PDF". W oknie drukowania wybierz „Zapisz jako PDF" jako drukarkę.
  </p>
</div>

<div class="report-area">
  <div class="report-header">
    <h1>Raport projektu WBS</h1>
    <p class="report-date">Wygenerowano: {new Date().toLocaleDateString('pl-PL')}</p>
  </div>

  <section class="report-section">
    <h2>Podsumowanie</h2>
    <table class="report-kpi">
      <tr><td>Zaawansowanie ogólne</td><td><strong>{kpis.overall.toFixed(1)}%</strong></td></tr>
      <tr><td>Liczba zadań</td><td>{kpis.total} (ukończone: {kpis.done}, w trakcie: {kpis.inProgress}, nie rozpoczęte: {kpis.notStarted})</td></tr>
      <tr><td>Zadania krytyczne nieukończone</td><td>{kpis.critical}</td></tr>
      <tr><td>Przekroczone terminy</td><td>{kpis.overdue}</td></tr>
      <tr><td>Zadania bez przypisania</td><td>{kpis.unassigned}</td></tr>
      <tr><td>Estymacja łączna</td><td>{kpis.totalMD.toFixed(1)} osobodni</td></tr>
    </table>
  </section>

  <section class="report-section">
    <h2>Struktura WBS</h2>
    {#if !$tree.length}
      <p>Brak elementów.</p>
    {:else}
      <table class="report-tree">
        <thead>
          <tr>
            <th>Kod</th><th>Nazwa</th><th>Waga</th><th>Ukończ.</th><th>Ważone</th><th>Odpowiedzialny</th>
          </tr>
        </thead>
        <tbody>
          {#each flat as { n, depth }}
            {@const leaf = isLeaf(n)}
            {@const done = Math.round(nodeDonePct(n) * 10) / 10}
            <tr class="depth-{Math.min(depth, 3)}">
              <td class="mono">{n._code ?? ''}</td>
              <td style="padding-left:{4 + depth * 14}px">{n.name || '(bez nazwy)'}</td>
              <td class="num">{n.weight}%</td>
              <td class="num">{leaf ? (n.done || 0) + '%' : done.toFixed(0) + '%'}</td>
              <td class="num">{nodeWtd(n).toFixed(1)}%</td>
              <td>{n.resp || '—'}</td>
            </tr>
          {/each}
          <tr class="total-row">
            <td colspan="2" style="text-align:right"><strong>SUMA</strong></td>
            <td class="num"><strong>{rw.toFixed(1)}%</strong></td>
            <td></td>
            <td class="num"><strong>{rwtd.toFixed(1)}%</strong></td>
            <td></td>
          </tr>
        </tbody>
      </table>
    {/if}
  </section>

  {#if $people.length}
    <section class="report-section">
      <h2>Zespół ({$people.length})</h2>
      <ul class="report-list">
        {#each $people as p}
          {@const name = pName(p)}
          {@const role = pRole(p)}
          <li><strong>{name}</strong>{role ? ` — ${role}` : ''}</li>
        {/each}
      </ul>
    </section>
  {/if}

  {#if $risks.length}
    <section class="report-section">
      <h2>Rejestr ryzyk ({$risks.length})</h2>
      <table class="report-tree">
        <thead>
          <tr><th>#</th><th>Opis</th><th>Poziom</th><th>Właściciel</th><th>Mitygacja</th></tr>
        </thead>
        <tbody>
          {#each $risks as r, i}
            {@const level = computeLevel(r.prob, r.impact)}
            <tr>
              <td class="mono">{i + 1}</td>
              <td>{r.desc}</td>
              <td>{level}</td>
              <td>{r.owner || '—'}</td>
              <td>{r.mitigation || '—'}</td>
            </tr>
          {/each}
        </tbody>
      </table>
    </section>
  {/if}
</div>

<style>
  .report-area {
    background: #fff;
    padding: 20px;
    border: 1px solid #c5d4e8;
    border-top: none;
    font-family: Arial, sans-serif;
    color: #222;
  }
  .report-header h1 {
    color: #1F3864;
    font-size: 22px;
    margin: 0 0 6px 0;
  }
  .report-date {
    color: #7a92ad;
    font-size: 12px;
    margin: 0 0 18px 0;
  }
  .report-section {
    margin-bottom: 22px;
  }
  .report-section h2 {
    color: #1F3864;
    font-size: 15px;
    border-bottom: 2px solid #2E75B6;
    padding-bottom: 4px;
    margin-bottom: 10px;
  }
  .report-kpi,
  .report-tree {
    width: 100%;
    border-collapse: collapse;
    font-size: 12px;
  }
  .report-kpi td {
    padding: 4px 8px;
    border-bottom: 1px solid #e0eaf5;
  }
  .report-kpi td:first-child {
    color: #5a7aaa;
    width: 260px;
  }
  .report-tree th {
    background: #2E75B6;
    color: #fff;
    padding: 6px 8px;
    text-align: left;
    font-size: 11px;
  }
  .report-tree td {
    padding: 4px 8px;
    border-bottom: 1px solid #e8f0f8;
  }
  .report-tree .mono {
    font-family: 'Courier New', monospace;
    font-size: 10px;
    color: #5a7aaa;
  }
  .report-tree .num {
    text-align: right;
    font-variant-numeric: tabular-nums;
  }
  .report-tree .depth-0 td {
    background: #D5E8F7;
    font-weight: 700;
  }
  .report-tree .depth-1 td {
    background: #E8F3FC;
    font-weight: 600;
  }
  .report-tree .total-row td {
    background: #1a3057;
    color: #fff;
    padding: 6px 10px;
  }
  .report-list {
    list-style: none;
    padding: 0;
    margin: 0;
  }
  .report-list li {
    padding: 4px 0;
    border-bottom: 1px solid #e0eaf5;
    font-size: 12px;
  }

  @media print {
    :global(body) { background: #fff; }
    :global(.topbar),
    :global(.toolbar),
    :global(.view-tabs),
    :global(.print-hide) { display: none !important; }
    :global(.wrap) { padding: 0 !important; max-width: 100% !important; }
    .report-area { border: none; padding: 0; }
    .report-tree { page-break-inside: auto; }
    .report-tree tr { page-break-inside: avoid; page-break-after: auto; }
  }
</style>
