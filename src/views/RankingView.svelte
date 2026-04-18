<script lang="ts">
  import { tree, setField } from '../lib/state/tree';
  import { assignCodes, collectLeaves } from '../lib/utils/wbs';
  import { PRIORITIES, PRIORITY_ORDER } from '../lib/utils/priority';
  import { todayISO } from '../lib/utils/dates';
  import type { Priority, WbsNode } from '../lib/types';

  type SortKey = 'priority' | 'score' | 'done';
  type FilterKey = 'all' | 'open' | 'done';

  let sort: SortKey = 'priority';
  let filter: FilterKey = 'all';

  $: ($tree, assignCodes($tree));
  $: leaves = collectLeaves($tree);

  $: filtered = leaves.filter((n) => {
    if (filter === 'open') return (n.done || 0) < 100;
    if (filter === 'done') return (n.done || 0) >= 100;
    return true;
  });

  function score(n: WbsNode): number {
    return ((n.weight || 0) * (100 - (n.done || 0))) / 100;
  }

  $: sorted = [...filtered].sort((a, b) => {
    if (sort === 'priority') {
      const pa = PRIORITY_ORDER[a.priority || ''] ?? 4;
      const pb = PRIORITY_ORDER[b.priority || ''] ?? 4;
      if (pa !== pb) return pa - pb;
      return score(b) - score(a);
    }
    if (sort === 'score') return score(b) - score(a);
    return (a.done || 0) - (b.done || 0);
  });

  $: today = todayISO();

  function onPriorityChange(id: number, e: Event) {
    const val = (e.target as HTMLSelectElement).value as Priority;
    setField(id, 'priority', val);
  }
</script>

<div class="inner-pane">
  <div class="ctrl-bar">
    <label for="rank-sort-select">Sortuj:</label>
    <select id="rank-sort-select" bind:value={sort}>
      <option value="priority">Priorytet ręczny + score</option>
      <option value="score">Score (waga × pozostało)</option>
      <option value="done">Ukończenie rosnąco</option>
    </select>
    <label for="rank-filter-select" style="margin-left:8px">Pokaż:</label>
    <select id="rank-filter-select" bind:value={filter}>
      <option value="all">Wszystkie</option>
      <option value="open">Nieukończone</option>
      <option value="done">Ukończone</option>
    </select>
  </div>

  <div class="tbl-wrap">
    <table class="rank">
      <thead>
        <tr>
          <th style="width:38px">#</th>
          <th style="width:86px">Kod</th>
          <th>Zadanie</th>
          <th style="width:82px">Ukończenie</th>
          <th style="width:70px;text-align:center">RAG</th>
          <th style="width:90px">Termin</th>
          <th style="width:130px">Priorytet</th>
          <th style="width:120px">Odpowiedzialny</th>
        </tr>
      </thead>
      <tbody>
        {#if !sorted.length}
          <tr>
            <td colspan="8" style="text-align:center;padding:24px;color:#7a92ad">Brak zadań.</td>
          </tr>
        {:else}
          {#each sorted as n, i}
            {@const pct = n.done || 0}
            {@const doneColor = pct >= 100 ? '#3B7A1E' : pct > 0 ? '#2E75B6' : '#ED7D31'}
            {@const ragCls = n.rag === 'R' ? 'rag-R' : n.rag === 'A' ? 'rag-A' : n.rag === 'G' ? 'rag-G' : 'rag-none'}
            {@const ragLbl = n.rag === 'R' ? '🔴 Red' : n.rag === 'A' ? '🟡 Amber' : n.rag === 'G' ? '🟢 Green' : '—'}
            {@const overdue = n.dateEnd && n.dateEnd < today && pct < 100}
            <tr>
              <td style="text-align:center;color:#7a92ad;font-weight:700">{i + 1}</td>
              <td><span style="font-family:'Courier New',monospace;font-size:10px;color:#5a7aaa;font-weight:700">{n._code ?? ''}</span></td>
              <td><span style="font-weight:600;color:#1a3a6a">{n.name || '–'}</span></td>
              <td style="text-align:center;font-weight:700;color:{doneColor}">{pct}%</td>
              <td style="text-align:center"><span class={ragCls}>{ragLbl}</span></td>
              <td style="font-size:11px;{overdue ? 'color:#c0392b;font-weight:700' : ''}">{n.dateEnd || '—'}</td>
              <td style="padding:4px 8px">
                <select
                  value={n.priority || ''}
                  on:change={(e) => onPriorityChange(n.id, e)}
                  style="font-size:11px;padding:4px 6px;border:1px solid #c5d4e8;border-radius:4px;width:100%"
                >
                  {#each PRIORITIES as p}
                    <option value={p}>{p || '— brak —'}</option>
                  {/each}
                </select>
              </td>
              <td style="color:#555">{n.resp || '—'}</td>
            </tr>
          {/each}
        {/if}
      </tbody>
    </table>
  </div>
</div>
