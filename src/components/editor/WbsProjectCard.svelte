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

<section class="project-card">
  <div class="project-card-top">
    <span class="project-chip">Punkt główny</span>
    {#if canToggle}
      <button type="button" class="project-toggle" on:click={() => toggleCollapse(node.id)}>
        {node.collapsed ? 'Rozwiń sekcję' : 'Zwiń sekcję'}
      </button>
    {/if}
  </div>

  <input
    bind:this={titleInput}
    class="project-title"
    value={node.name}
    placeholder="Tytuł punktu głównego..."
    on:input={onTitleInput}
  />

  <div class="project-stats">
    <div class="project-stat">
      <span>Postęp</span>
      <strong>{progress.toFixed(1)}%</strong>
    </div>
    <div class="project-stat">
      <span>Waga sekcji</span>
      <strong>{weight.toFixed(1)}%</strong>
    </div>
    <div class="project-stat">
      <span>Elementy</span>
      <strong>{node.children.length}</strong>
    </div>
  </div>

  <div class="project-progress">
    <div class="project-progress-bar" style="width:{Math.min(progress, 100)}%"></div>
  </div>

  <div class="project-actions">
    <button type="button" class="project-action ghost" on:click={addAndFocus}>+ Dodaj podpunkt</button>
    <button type="button" class="project-action danger" on:click={() => delNode(node.id)}>Usuń</button>
  </div>
</section>

<style>
  .project-card {
    display: flex;
    flex-direction: column;
    gap: 12px;
    padding: 16px;
    border-radius: 28px;
    background: linear-gradient(145deg, #14355f 0%, #26558a 100%);
    box-shadow: 0 22px 34px rgba(17, 53, 94, 0.18);
    color: #fff;
  }

  .project-card-top {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
  }

  .project-chip {
    display: inline-flex;
    align-items: center;
    padding: 8px 12px;
    border-radius: 999px;
    background: rgba(255, 255, 255, 0.14);
    color: rgba(255, 255, 255, 0.8);
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }

  .project-toggle {
    border: 1px solid rgba(255, 255, 255, 0.22);
    background: rgba(255, 255, 255, 0.12);
    color: #fff;
    border-radius: 999px;
    padding: 9px 12px;
    min-height: 40px;
    font-size: 12px;
    font-weight: 700;
    cursor: pointer;
  }

  .project-title {
    width: 100%;
    border: none;
    border-radius: 20px;
    padding: 0;
    background: transparent;
    color: #fff;
    font-size: 22px;
    font-weight: 800;
    line-height: 1.1;
    letter-spacing: -0.03em;
  }

  .project-title::placeholder {
    color: rgba(255, 255, 255, 0.52);
  }

  .project-title:focus {
    outline: none;
  }

  .project-stats {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 10px;
  }

  .project-stat {
    display: flex;
    flex-direction: column;
    gap: 5px;
    padding: 12px;
    border-radius: 20px;
    background: rgba(255, 255, 255, 0.1);
  }

  .project-stat span {
    font-size: 11px;
    color: rgba(255, 255, 255, 0.7);
    text-transform: uppercase;
    letter-spacing: 0.06em;
    font-weight: 700;
  }

  .project-stat strong {
    font-size: 18px;
    line-height: 1.1;
    letter-spacing: -0.02em;
  }

  .project-progress {
    height: 8px;
    border-radius: 999px;
    overflow: hidden;
    background: rgba(255, 255, 255, 0.18);
  }

  .project-progress-bar {
    height: 100%;
    border-radius: inherit;
    background: linear-gradient(90deg, rgba(255, 255, 255, 0.72), #ffffff);
  }

  .project-actions {
    display: grid;
    grid-template-columns: 1fr auto;
    gap: 10px;
  }

  .project-action {
    min-height: 44px;
    border-radius: 18px;
    padding: 12px 14px;
    border: 1px solid transparent;
    font-size: 13px;
    font-weight: 700;
    cursor: pointer;
  }

  .project-action.ghost {
    background: rgba(255, 255, 255, 0.14);
    color: #fff;
    border-color: rgba(255, 255, 255, 0.18);
  }

  .project-action.danger {
    background: rgba(139, 26, 26, 0.22);
    color: #fff;
    border-color: rgba(255, 255, 255, 0.14);
  }

  @media (max-width: 420px) {
    .project-stats {
      grid-template-columns: 1fr;
    }

    .project-actions {
      grid-template-columns: 1fr;
    }
  }
</style>
