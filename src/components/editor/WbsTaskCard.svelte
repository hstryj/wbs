<script lang="ts">
  import { tick } from 'svelte';
  import type { WbsNode, Priority, RAG } from '../../lib/types';
  import { addChild, delNode, setField, setWeight, toggleCollapse } from '../../lib/state/tree';
  import { colVis, pendingFocusNodeId } from '../../lib/state/ui';
  import { people, pName, pRole } from '../../lib/state/people';
  import { PRIORITIES } from '../../lib/utils/priority';
  import { isLeaf, childWeightSum, nodeDonePct, nodeWtd, barColor, depthCfg, depthOf } from '../../lib/utils/wbs';
  import { todayISO } from '../../lib/utils/dates';

  export let node: WbsNode;

  let titleInput: HTMLInputElement;

  $: depth = depthOf(node._code);
  $: cfg = depthCfg(depth);
  $: leaf = isLeaf(node);
  $: done = Math.round(nodeDonePct(node) * 10) / 10;
  $: wtd = nodeWtd(node).toFixed(1);
  $: bc = barColor(done);
  $: bar = Math.min(done, 100);
  $: today = todayISO();
  $: overdue = node.dateEnd && node.dateEnd < today && (node.done || 0) < 100;
  $: childSum = leaf ? 0 : Math.round(childWeightSum(node.children) * 10) / 10;
  $: over100 = childSum > 100;

  function onNameInput(e: Event) { setField(node.id, 'name', (e.target as HTMLInputElement).value); }
  function onWeightInput(e: Event) { setWeight(node.id, parseFloat((e.target as HTMLInputElement).value) || 0); }
  function onDoneInput(e: Event) { setField(node.id, 'done', parseFloat((e.target as HTMLInputElement).value) || 0); }
  function onMdChange(e: Event) { setField(node.id, 'md', parseFloat((e.target as HTMLInputElement).value) || 0); }
  function onRespChange(e: Event) { setField(node.id, 'resp', (e.target as HTMLInputElement | HTMLSelectElement).value); }
  function onPriChange(e: Event) { setField(node.id, 'priority', (e.target as HTMLSelectElement).value as Priority); }
  function onRagChange(e: Event) { setField(node.id, 'rag', (e.target as HTMLSelectElement).value as RAG); }
  function onStartChange(e: Event) { setField(node.id, 'dateStart', (e.target as HTMLInputElement).value); }
  function onEndChange(e: Event) { setField(node.id, 'dateEnd', (e.target as HTMLInputElement).value); }
  function addAndFocus() {
    const createdId = addChild(node.id);
    if (createdId !== null) pendingFocusNodeId.set(createdId);
  }

  $: if ($pendingFocusNodeId === node.id && titleInput) {
    tick().then(() => {
      titleInput?.focus();
      titleInput?.select();
      pendingFocusNodeId.set(null);
    });
  }
</script>

<article class="task-card" style="background:{cfg.bg};color:{cfg.fc}">
  <div class="task-top">
    <span class="task-code">{node._code ?? '—'}</span>

    <div class="task-statuses">
      {#if overdue}
        <span class="task-status danger">Po terminie</span>
      {:else if node.children.length > 0}
        <button type="button" class="task-toggle" on:click={() => toggleCollapse(node.id)}>
          {node.collapsed ? 'Rozwiń' : 'Zwiń'}
        </button>
      {:else if node.rag}
        <span class="task-status">RAG {node.rag}</span>
      {/if}
    </div>
  </div>

  <div class="task-title-row" style="padding-left:{Math.min(cfg.ind, 24)}px">
    {#if node.children.length > 0}
      <button type="button" class="task-mini-toggle" on:click={() => toggleCollapse(node.id)}>
        {node.collapsed ? '▶' : '▼'}
      </button>
    {/if}
    <input
      bind:this={titleInput}
      class="task-title"
      style="font-size:{cfg.fs};font-weight:{cfg.fw};color:{cfg.fc}"
      value={node.name}
      placeholder="Nazwa zadania..."
      on:input={onNameInput}
    />
  </div>

  <div class="task-progress-card">
    <div class="task-progress-top">
      <span>Ukończenie</span>
      {#if leaf}
        <input class="task-progress-input" type="number" min="0" max="100" step="5" value={node.done} on:input={onDoneInput} />
      {:else}
        <strong>{done.toFixed(0)}%</strong>
      {/if}
    </div>
    <div class="bar-bg task-bar-bg"><div class="bar-fg" style="width:{bar}%;background:{bc}"></div></div>
    <div class="task-progress-meta">
      <span>Ważone: <strong>{wtd}%</strong></span>
      {#if node.dateEnd}
        <span class:danger-text={overdue}>Koniec: <strong>{node.dateEnd}</strong></span>
      {/if}
    </div>
  </div>

  <div class="task-rail">
    {#if $colVis.waga}
      <label class="task-tile">
        <span>Waga</span>
        <input type="number" min="0" max="100" step="0.5" value={node.weight} on:input={onWeightInput} />
        {#if !leaf}
          <small class:danger-text={over100}>Składowe: {childSum}%</small>
        {/if}
      </label>
    {/if}

    {#if $colVis.waz}
      <div class="task-tile metric">
        <span>Ważone</span>
        <strong>{wtd}%</strong>
      </div>
    {/if}

    <label class="task-tile">
      <span>Odpowiedzialny</span>
      {#if $people.length > 0}
        <select class="task-select" on:change={onRespChange} value={node.resp}>
          <option value="">— brak —</option>
          {#each $people as p}
            {@const pn = pName(p)}
            {@const pr = pRole(p)}
            <option value={pn}>{pn}{pr ? ` (${pr})` : ''}</option>
          {/each}
          {#if node.resp && !$people.some((p) => pName(p) === node.resp)}
            <option value={node.resp}>{node.resp}</option>
          {/if}
        </select>
      {:else}
        <input value={node.resp} placeholder="Osoba..." on:input={onRespChange} />
      {/if}
    </label>

    {#if $colVis.rag}
      <label class="task-tile">
        <span>RAG</span>
        <select class="task-select" on:change={onRagChange} value={node.rag}>
          <option value="">—</option>
          <option value="G">🟢 Green</option>
          <option value="A">🟡 Amber</option>
          <option value="R">🔴 Red</option>
        </select>
      </label>
    {/if}

    {#if $colVis.md}
      <label class="task-tile">
        <span>MD</span>
        <input type="number" min="0" step="1" value={node.md || 0} on:change={onMdChange} />
      </label>
    {/if}

    {#if $colVis.start}
      <label class="task-tile">
        <span>Start</span>
        <input type="date" value={node.dateStart} on:change={onStartChange} />
      </label>
    {/if}

    {#if $colVis.end}
      <label class="task-tile">
        <span>Koniec</span>
        <input type="date" value={node.dateEnd} on:change={onEndChange} class:date-over={overdue} />
      </label>
    {/if}

    {#if $colVis.pri}
      <label class="task-tile">
        <span>Priorytet</span>
        <select class="task-select" value={node.priority} on:change={onPriChange}>
          {#each PRIORITIES as p}
            <option value={p}>{p || '— brak —'}</option>
          {/each}
        </select>
      </label>
    {/if}

    {#if $colVis.note}
      <div class="task-tile metric">
        <span>Uwagi</span>
        <strong>{node.note ? 'Jest notatka' : 'Brak notatki'}</strong>
      </div>
    {/if}
  </div>

  <div class="task-actions">
    <button type="button" class="task-action ghost" on:click={addAndFocus}>+ Dodaj podpunkt</button>
    <button type="button" class="task-action danger" on:click={() => delNode(node.id)}>Usuń</button>
  </div>
</article>

<style>
  .task-card {
    display: flex;
    flex-direction: column;
    gap: 12px;
    padding: 14px;
    border-radius: 24px;
    border: 1px solid rgba(13, 42, 74, 0.08);
    box-shadow: 0 14px 24px rgba(31, 56, 100, 0.08);
  }

  .task-top {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
  }

  .task-code {
    display: inline-flex;
    align-items: center;
    padding: 7px 11px;
    border-radius: 999px;
    background: rgba(255, 255, 255, 0.68);
    color: #12345d;
    font-family: 'Courier New', monospace;
    font-size: 12px;
    font-weight: 800;
  }

  .task-statuses {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .task-status,
  .task-toggle {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-height: 38px;
    padding: 8px 12px;
    border-radius: 999px;
    border: 1px solid rgba(13, 42, 74, 0.12);
    background: rgba(255, 255, 255, 0.74);
    color: #12345d;
    font-size: 12px;
    font-weight: 700;
  }

  .task-toggle {
    cursor: pointer;
  }

  .task-status.danger {
    color: #8b1a1a;
    border-color: rgba(139, 26, 26, 0.18);
    background: rgba(252, 232, 232, 0.96);
  }

  .task-title-row {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .task-mini-toggle {
    border: none;
    width: 32px;
    height: 32px;
    border-radius: 10px;
    background: rgba(255, 255, 255, 0.68);
    color: #12345d;
    font-size: 12px;
    font-weight: 800;
    cursor: pointer;
    flex-shrink: 0;
  }

  .task-title {
    width: 100%;
    border: none;
    background: transparent;
    padding: 0;
    line-height: 1.25;
  }

  .task-title:focus {
    outline: none;
  }

  .task-progress-card {
    display: flex;
    flex-direction: column;
    gap: 8px;
    padding: 14px;
    border-radius: 20px;
    background: rgba(255, 255, 255, 0.72);
  }

  .task-progress-top {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
  }

  .task-progress-top span {
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: #3b5f84;
  }

  .task-progress-top strong {
    font-size: 22px;
    line-height: 1;
    color: #12345d;
  }

  .task-progress-input {
    width: 88px;
    border: 1px solid rgba(13, 42, 74, 0.14);
    border-radius: 14px;
    padding: 9px 10px;
    background: #fff;
    color: #12345d;
    text-align: center;
    font-size: 16px;
    font-weight: 700;
  }

  .task-bar-bg {
    margin: 0;
    height: 8px;
    border-radius: 999px;
  }

  .task-progress-meta {
    display: flex;
    flex-wrap: wrap;
    gap: 8px 12px;
    font-size: 12px;
    color: #496a8e;
  }

  .task-rail {
    display: flex;
    gap: 10px;
    overflow-x: auto;
    padding-bottom: 2px;
    scroll-snap-type: x proximity;
    -webkit-overflow-scrolling: touch;
  }

  .task-tile {
    flex: 0 0 min(76vw, 220px);
    display: flex;
    flex-direction: column;
    gap: 8px;
    padding: 13px;
    border-radius: 20px;
    border: 1px solid rgba(13, 42, 74, 0.1);
    background: rgba(255, 255, 255, 0.86);
    box-shadow: 0 8px 16px rgba(31, 56, 100, 0.06);
    scroll-snap-align: start;
  }

  .task-tile span {
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: #4d6d90;
  }

  .task-tile input,
  .task-select {
    width: 100%;
    border: 1px solid rgba(13, 42, 74, 0.12);
    border-radius: 14px;
    padding: 10px 12px;
    background: #fff;
    color: var(--text-primary);
  }

  .task-tile.metric strong {
    font-size: 18px;
    line-height: 1.2;
    color: #12345d;
    letter-spacing: -0.02em;
  }

  .task-tile small {
    font-size: 12px;
    color: #496a8e;
  }

  .task-actions {
    display: grid;
    grid-template-columns: 1fr auto;
    gap: 10px;
  }

  .task-action {
    min-height: 44px;
    border-radius: 18px;
    padding: 12px 14px;
    border: 1px solid transparent;
    font-size: 13px;
    font-weight: 700;
    cursor: pointer;
  }

  .task-action.ghost {
    background: rgba(255, 255, 255, 0.74);
    color: #12345d;
    border-color: rgba(13, 42, 74, 0.12);
  }

  .task-action.danger {
    background: rgba(252, 232, 232, 0.96);
    color: #8b1a1a;
    border-color: rgba(139, 26, 26, 0.14);
  }

  .danger-text {
    color: #8b1a1a;
    font-weight: 700;
  }

  @media (max-width: 420px) {
    .task-actions {
      grid-template-columns: 1fr;
    }

    .task-tile {
      flex-basis: min(82vw, 220px);
    }
  }
</style>
