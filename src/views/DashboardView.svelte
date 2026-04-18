<script lang="ts">
  import { tree } from '../lib/state/tree';
  import { assignCodes, collectLeaves, nodeDonePct, rootWeightSum, rootWeightedSum, barColor } from '../lib/utils/wbs';
  import { escH } from '../lib/utils/escape';
  import type { WbsNode } from '../lib/types';

  $: ($tree, assignCodes($tree));
  $: leaves = collectLeaves($tree);

  $: rw = rootWeightSum($tree);
  $: rwtd = rootWeightedSum($tree);
  $: tot = rw > 0 ? (rwtd / rw) * 100 : 0;

  $: done100 = leaves.filter((n) => (n.done || 0) >= 100).length;
  $: doneIP  = leaves.filter((n) => (n.done || 0) > 0 && (n.done || 0) < 100).length;
  $: done0   = leaves.filter((n) => (n.done || 0) === 0).length;
  $: unass   = leaves.filter((n) => !n.resp).length;
  $: crit    = leaves.filter((n) => n.priority === 'Krytyczny' && (n.done || 0) < 100).length;
  $: ragR    = leaves.filter((n) => n.rag === 'R').length;
  $: totalMD = leaves.reduce((a, n) => a + (n.md || 0), 0);
  $: doneMD  = leaves.reduce((a, n) => a + (n.md || 0) * (n.done || 0) / 100, 0);

  $: today = new Date().toISOString().slice(0, 10);
  $: overdue = leaves.filter((n) => n.dateEnd && n.dateEnd < today && (n.done || 0) < 100).length;

  $: critItems = leaves.filter((n) => n.priority === 'Krytyczny' && (n.done || 0) < 100);

  type Kpi = { label: string; value: string | number; sub: string; color: string };
  $: kpis = [
    { label: 'Zaawansowanie ogólne',      value: tot.toFixed(1) + '%', sub: 'ważone wagami',                    color: '#1F3864' },
    { label: 'Ukończone zadania',          value: done100,              sub: 'z ' + leaves.length + ' liści',     color: '#3B7A1E' },
    { label: 'W trakcie realizacji',       value: doneIP,               sub: 'zadań aktywnych',                   color: '#2E75B6' },
    { label: 'Nie rozpoczęte',             value: done0,                sub: 'zadań w kolejce',                   color: '#ED7D31' },
    { label: 'Bez przypisania',            value: unass,                sub: 'zadań bez osoby',                   color: unass > 0 ? '#c0392b' : '#3B7A1E' },
    { label: 'Krytyczne (nieukończone)',   value: crit,                 sub: 'zadań krytycznych',                 color: crit > 0 ? '#7a0000' : '#3B7A1E' },
    { label: 'Red (RAG)',                  value: ragR,                 sub: 'zadań z ryzykiem',                  color: ragR > 0 ? '#8b1a1a' : '#3B7A1E' },
    { label: 'Przekroczone terminy',       value: overdue,              sub: 'nieukończonych po deadline',        color: overdue > 0 ? '#8b1a1a' : '#3B7A1E' },
    { label: 'Estymacja (MD)',             value: totalMD.toFixed(1),   sub: 'osobodni łącznie / ' + doneMD.toFixed(1) + ' wykonane', color: '#1F3864' },
    { label: 'Sekcje główne',              value: $tree.length,         sub: 'pakietów roboczych',                color: '#6a3daa' }
  ] as Kpi[];

  function sectionProgress(n: WbsNode) {
    return Math.round(nodeDonePct(n));
  }
</script>

<div class="inner-pane">
  <div class="kpi-grid">
    {#each kpis as k}
      <div class="kpi-card">
        <div class="kpi-label">{k.label}</div>
        <div class="kpi-value" style="color:{k.color}">{k.value}</div>
        <div class="kpi-sub">{k.sub}</div>
      </div>
    {/each}
  </div>

  <div class="ds-h">Zaawansowanie sekcji głównych</div>

  {#if $tree.length === 0}
    <p style="color:#7a92ad;font-size:12px">Brak danych.</p>
  {:else}
    {#each $tree as n}
      {@const p = sectionProgress(n)}
      {@const bc = barColor(p)}
      <div class="sp-item">
        <div class="sp-label">
          <span class="sp-name" title={n.name}>{n._code ?? ''} {n.name}</span>
          <span class="sp-val">{p}% (waga: {n.weight}%)</span>
        </div>
        <div class="sp-bar">
          <div class="sp-fill" style="width:{Math.min(p, 100)}%;background:{bc}"></div>
        </div>
      </div>
    {/each}
  {/if}

  {#if critItems.length}
    <div style="margin-top:16px">
      <div class="ds-h" style="color:#7a0000">Zadania krytyczne do ukończenia</div>
      <table style="width:100%;border-collapse:collapse;font-size:12px;margin-top:8px">
        <thead>
          <tr style="background:#1F3864;color:#fff">
            <th style="padding:6px 10px;text-align:left">Kod</th>
            <th style="padding:6px 10px;text-align:left">Zadanie</th>
            <th style="padding:6px 10px;text-align:center">Ukończenie</th>
            <th style="padding:6px 10px">Odpowiedzialny</th>
          </tr>
        </thead>
        <tbody>
          {#each critItems as n, i}
            {@const dc = (n.done || 0) > 0 ? '#2E75B6' : '#ED7D31'}
            <tr style="background:{i % 2 === 0 ? '#fff5f5' : '#fff8f8'}">
              <td style="padding:5px 10px;font-family:'Courier New',monospace;font-size:10px;color:#7a0000">{n._code ?? ''}</td>
              <td style="padding:5px 10px;font-weight:600;color:#1a3a6a">{n.name || ''}</td>
              <td style="padding:5px 10px;text-align:center;font-weight:700;color:{dc}">{n.done || 0}%</td>
              <td style="padding:5px 10px;color:#555">{n.resp || '—'}</td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>
  {/if}
</div>
