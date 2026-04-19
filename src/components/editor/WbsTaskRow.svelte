<script lang="ts">
  import type { WbsNode, Priority, RAG } from '../../lib/types';
  import { addChild, delNode, setField, setWeight, toggleCollapse } from '../../lib/state/tree';
  import { colVis } from '../../lib/state/ui';
  import { people, pName, pRole } from '../../lib/state/people';
  import { PRIORITIES } from '../../lib/utils/priority';
  import { isLeaf, childWeightSum, nodeDonePct, nodeWtd, barColor, depthCfg, depthOf } from '../../lib/utils/wbs';
  import { todayISO } from '../../lib/utils/dates';

  export let node: WbsNode;

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

  function onNameInput(e: Event)  { setField(node.id, 'name', (e.target as HTMLInputElement).value); }
  function onWeightInput(e: Event){ setWeight(node.id, parseFloat((e.target as HTMLInputElement).value) || 0); }
  function onDoneInput(e: Event)  { setField(node.id, 'done', parseFloat((e.target as HTMLInputElement).value) || 0); }
  function onMdChange(e: Event)   { setField(node.id, 'md', parseFloat((e.target as HTMLInputElement).value) || 0); }
  function onRespChange(e: Event) { setField(node.id, 'resp', (e.target as HTMLInputElement | HTMLSelectElement).value); }
  function onPriChange(e: Event)  { setField(node.id, 'priority', (e.target as HTMLSelectElement).value as Priority); }
  function onRagChange(e: Event)  { setField(node.id, 'rag', (e.target as HTMLSelectElement).value as RAG); }
  function onStartChange(e: Event){ setField(node.id, 'dateStart', (e.target as HTMLInputElement).value); }
  function onEndChange(e: Event)  { setField(node.id, 'dateEnd', (e.target as HTMLInputElement).value); }
</script>

<tr style="background:{cfg.bg}">
  <td><span class="code">{node._code ?? ''}</span></td>
  <td>
    <div style="display:flex;align-items:center;gap:2px;padding-left:{cfg.ind}px">
      {#if node.children.length > 0}
        <button class="btn-tog" on:click={() => toggleCollapse(node.id)}>{node.collapsed ? '▶' : '▼'}</button>
      {:else}
        <span style="display:inline-block;width:18px"></span>
      {/if}
      <input
        class="iname"
        style="font-size:{cfg.fs};font-weight:{cfg.fw};color:{cfg.fc}"
        value={node.name}
        placeholder="Nazwa..."
        on:input={onNameInput}
      />
    </div>
  </td>
  {#if $colVis.waga}
    <td>
      {#if leaf}
        <input class="inum" type="number" min="0" max="100" step="0.5" value={node.weight} on:input={onWeightInput} />
      {:else}
        <div class="pw-wrap">
          <input class="inum" type="number" min="0" max="100" step="0.5" value={node.weight} on:input={onWeightInput} style="color:#0d4a8a" />
          <span class="comp-hint {over100 ? 'over' : 'ok'}">{over100 ? '▲ ' : ''}składowe: {childSum}%</span>
        </div>
      {/if}
    </td>
  {/if}
  <td>
    {#if leaf}
      <input class="inum" type="number" min="0" max="100" step="5" value={node.done} on:input={onDoneInput} />
      <div class="bar-bg"><div class="bar-fg" style="width:{bar}%;background:{bc}"></div></div>
    {:else}
      <div style="text-align:center;font-size:11px;color:#4a6a8a;font-weight:700;padding:3px 4px 0">{done.toFixed(0)}%</div>
      <div class="bar-bg"><div class="bar-fg" style="width:{bar}%;background:{bc}"></div></div>
    {/if}
  </td>
  {#if $colVis.waz}<td style="text-align:center"><span class="wtd">{wtd}%</span></td>{/if}
  <td>
    {#if $people.length > 0}
      <select class="iresp" on:change={onRespChange} value={node.resp}>
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
      <input class="iresp-txt" value={node.resp} placeholder="Osoba..." on:input={onRespChange} />
    {/if}
  </td>
  {#if $colVis.rag}
    <td style="text-align:center;padding:3px 4px">
      <select on:change={onRagChange} value={node.rag} style="font-size:10px;padding:2px 3px;border:1px solid var(--border-strong);border-radius:var(--radius-sm);width:68px">
        <option value="">—</option>
        <option value="G">🟢 Green</option>
        <option value="A">🟡 Amber</option>
        <option value="R">🔴 Red</option>
      </select>
    </td>
  {/if}
  {#if $colVis.md}
    <td><input class="inum" type="number" min="0" step="1" value={node.md || 0} on:change={onMdChange} style="text-align:center" /></td>
  {/if}
  {#if $colVis.start}
    <td><input type="date" value={node.dateStart} on:change={onStartChange} style="font-size:10px;padding:2px 4px;border:1px solid var(--border-strong);border-radius:var(--radius-sm);width:88px" /></td>
  {/if}
  {#if $colVis.end}
    <td>
      <input
        type="date"
        value={node.dateEnd}
        on:change={onEndChange}
        class={overdue ? 'date-over' : ''}
        style="font-size:10px;padding:2px 4px;border:1px solid var(--border-strong);border-radius:var(--radius-sm);width:88px"
      />
    </td>
  {/if}
  {#if $colVis.pri}
    <td style="padding:4px 6px">
      <select value={node.priority} on:change={onPriChange} style="font-size:11px;padding:4px 6px;border:1px solid var(--border-strong);border-radius:var(--radius-sm);width:100%">
        {#each PRIORITIES as p}
          <option value={p}>{p || '— brak —'}</option>
        {/each}
      </select>
    </td>
  {/if}
  {#if $colVis.note}
    <td style="text-align:center;padding:3px">
      <span class="note-icon" title={node.note || 'Notatka'}>📋</span>
    </td>
  {/if}
  <td>
    <div class="row-actions">
      <button class="btn-add-child" on:click={() => addChild(node.id)}>+ Dodaj podpunkt</button>
      <button class="btn-del" on:click={() => delNode(node.id)}>✕</button>
    </div>
  </td>
</tr>
