<script lang="ts">
  import { tick } from 'svelte';
  import type { WbsNode } from '../../lib/types';
  import { addChild, delNode, setField, toggleCollapse } from '../../lib/state/tree';
  import { pendingFocusNodeId } from '../../lib/state/ui';
  import { childWeightSum, childWeightedSum } from '../../lib/utils/wbs';

  export let node: WbsNode;

  let titleInput: HTMLInputElement;

  $: canToggle = node.children.length > 0;
  $: progress = (() => {
    const cw = childWeightSum(node.children);
    if (cw < 0.001) return 0;
    return Math.round((childWeightedSum(node.children) / cw) * 1000) / 10;
  })();
  $: weight = childWeightSum(node.children);

  function onTitleInput(e: Event) {
    setField(node.id, 'name', (e.target as HTMLInputElement).value);
  }

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

<tr class="proj-hdr-row">
  <td colspan="13" style="padding:0">
    <div class="proj-hdr">
      {#if canToggle}
        <button class="btn-tog" on:click={() => toggleCollapse(node.id)}>{node.collapsed ? '▶' : '▼'}</button>
      {:else}
        <span style="display:inline-block;width:18px"></span>
      {/if}
      <input
        bind:this={titleInput}
        class="proj-title-inp"
        value={node.name}
        placeholder="Tytuł punktu głównego..."
        on:input={onTitleInput}
      />
      <div style="display:flex;align-items:center;gap:6px;margin-left:6px">
        <div style="background:rgba(255,255,255,.18);border-radius:3px;height:7px;width:80px;overflow:hidden">
          <div style="background:rgba(255,255,255,.85);height:7px;border-radius:3px;width:{Math.min(progress, 100)}%"></div>
        </div>
        <span style="font-size:11px;font-weight:700;color:rgba(255,255,255,.9);white-space:nowrap">{progress.toFixed(1)}%</span>
        <span style="font-size:11px;color:rgba(255,255,255,.6);white-space:nowrap">waga: {weight.toFixed(1)}%</span>
      </div>
      <span class="proj-hdr-meta" style="margin-left:auto">{node.children.length} elem.</span>
      <button
        class="btn-add-child"
        on:click={addAndFocus}
        style="background:rgba(255,255,255,.18);color:#fff;border-color:rgba(255,255,255,.3);font-size:11px;padding:2px 8px"
      >+ Dodaj</button>
      <button
        class="btn-del"
        on:click={() => delNode(node.id)}
        style="background:rgba(255,255,255,.08);border-color:rgba(255,255,255,.2);color:rgba(255,255,255,.7)"
      >✕</button>
    </div>
  </td>
</tr>
