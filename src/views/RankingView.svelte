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

<div class="inner-pane ranking-root">
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

  <div class="tbl-wrap desktop-only">
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

  <div class="ranking-mobile-list mobile-only">
    {#if !sorted.length}
      <div class="ranking-mobile-empty">Brak zadań.</div>
    {:else}
      {#each sorted as n, i}
        {@const pct = n.done || 0}
        {@const doneColor = pct >= 100 ? '#3B7A1E' : pct > 0 ? '#2E75B6' : '#ED7D31'}
        {@const ragCls = n.rag === 'R' ? 'rag-R' : n.rag === 'A' ? 'rag-A' : n.rag === 'G' ? 'rag-G' : 'rag-none'}
        {@const ragLbl = n.rag === 'R' ? 'Red' : n.rag === 'A' ? 'Amber' : n.rag === 'G' ? 'Green' : 'Brak'}
        {@const overdue = !!(n.dateEnd && n.dateEnd < today && pct < 100)}
        <article class="ranking-card">
          <div class="ranking-card-top">
            <div class="ranking-card-heading">
              <span class="ranking-rank">#{i + 1}</span>
              <div class="ranking-code">{n._code ?? '—'}</div>
              <h3>{n.name || '—'}</h3>
            </div>
            <span class={ragCls}>{ragLbl}</span>
          </div>

          <div class="ranking-progress">
            <div class="ranking-progress-top">
              <span>Ukończenie</span>
              <strong style="color:{doneColor}">{pct}%</strong>
            </div>
            <div class="ranking-progress-bar">
              <div class="ranking-progress-fill" style="width:{Math.min(pct, 100)}%;background:{doneColor}"></div>
            </div>
          </div>

          <div class="ranking-rail">
            <div class="ranking-tile">
              <span>Termin</span>
              <strong class:ranking-overdue={overdue}>{n.dateEnd || '—'}</strong>
            </div>
            <div class="ranking-tile">
              <span>Odpowiedzialny</span>
              <strong>{n.resp || '—'}</strong>
            </div>
            <label class="ranking-tile ranking-priority">
              <span>Priorytet</span>
              <select value={n.priority || ''} on:change={(e) => onPriorityChange(n.id, e)}>
                {#each PRIORITIES as p}
                  <option value={p}>{p || '— brak —'}</option>
                {/each}
              </select>
            </label>
          </div>
        </article>
      {/each}
    {/if}
  </div>
</div>

<style>
  .ranking-root {
    display: flex;
    flex-direction: column;
    gap: 14px;
  }

  .ranking-mobile-list {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .ranking-card {
    display: flex;
    flex-direction: column;
    gap: 14px;
    padding: 16px;
    border-radius: 26px;
    border: 1px solid rgba(20, 53, 95, 0.08);
    background:
      radial-gradient(circle at top right, rgba(46, 117, 182, 0.1), transparent 36%),
      linear-gradient(180deg, rgba(244, 248, 252, 0.94), #ffffff);
    box-shadow: 0 16px 28px rgba(31, 56, 100, 0.08);
  }

  .ranking-card-top {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 10px;
  }

  .ranking-card-heading {
    min-width: 0;
    flex: 1;
  }

  .ranking-rank {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-width: 42px;
    height: 32px;
    border-radius: 999px;
    background: rgba(20, 53, 95, 0.08);
    color: var(--text-primary);
    font-size: 12px;
    font-weight: 800;
  }

  .ranking-code {
    margin-top: 10px;
    font-family: 'Courier New', monospace;
    font-size: 11px;
    font-weight: 700;
    color: var(--text-muted);
  }

  .ranking-card h3 {
    margin: 6px 0 0;
    font-size: 18px;
    line-height: 1.15;
    color: var(--text-primary);
  }

  .ranking-progress {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .ranking-progress-top {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    font-size: 12px;
    color: var(--text-secondary);
  }

  .ranking-progress-top strong {
    font-size: 16px;
  }

  .ranking-progress-bar {
    height: 8px;
    border-radius: 999px;
    overflow: hidden;
    background: var(--bg-muted);
  }

  .ranking-progress-fill {
    height: 100%;
    border-radius: inherit;
  }

  .ranking-rail {
    display: flex;
    gap: 10px;
    overflow-x: auto;
    padding-bottom: 2px;
    -webkit-overflow-scrolling: touch;
  }

  .ranking-tile {
    flex: 0 0 160px;
    min-width: 160px;
    display: flex;
    flex-direction: column;
    gap: 6px;
    padding: 12px 14px;
    border-radius: 18px;
    background: rgba(255, 255, 255, 0.92);
    border: 1px solid rgba(20, 53, 95, 0.08);
  }

  .ranking-tile span {
    font-size: 11px;
    color: var(--text-secondary);
  }

  .ranking-tile strong {
    font-size: 14px;
    line-height: 1.3;
    color: var(--text-primary);
  }

  .ranking-priority select {
    width: 100%;
    min-height: 42px;
    border: 1px solid var(--border-strong);
    border-radius: 12px;
    padding: 10px 12px;
    font-size: 13px;
    color: var(--text-primary);
    background: var(--bg-surface);
  }

  .ranking-overdue {
    color: var(--color-danger);
  }

  .ranking-mobile-empty {
    padding: 18px;
    border-radius: 22px;
    border: 1px dashed var(--border-strong);
    background: var(--bg-muted);
    color: var(--text-secondary);
    font-size: 13px;
    text-align: center;
  }

  @media (max-width: 900px) {
    .ctrl-bar {
      padding: 14px;
      border-radius: 22px;
      border: 1px solid var(--border);
      background: var(--bg-surface);
    }

    .ctrl-bar label {
      width: 100%;
      font-size: 12px;
      color: var(--text-secondary);
    }
  }

  @media (max-width: 520px) {
    .ranking-card-top {
      flex-direction: column;
    }

    .ranking-card {
      padding: 14px;
      border-radius: 24px;
    }
  }
</style>
