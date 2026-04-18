<script lang="ts">
  /** Segmented progress bar — each segment = one section, width proportional to weight,
   * color-coded by that section's progress. */
  export let segments: Array<{ label: string; weight: number; done: number; color?: string }> = [];

  $: totalWeight = segments.reduce((a, s) => a + (s.weight || 0), 0) || 1;

  function colorOf(done: number, override?: string): string {
    if (override) return override;
    if (done >= 100) return 'var(--color-success)';
    if (done >= 50) return 'var(--brand-primary)';
    if (done >= 25) return 'var(--color-warning)';
    if (done > 0) return 'var(--color-warning)';
    return 'var(--color-neutral)';
  }
</script>

<div class="seg-wrap" role="img" aria-label="Segmentowy pasek postępu {segments.length} sekcji">
  {#if !segments.length}
    <div class="seg-empty">Brak danych</div>
  {:else}
    <div class="seg-track">
      {#each segments as s}
        {@const widthPct = ((s.weight || 0) / totalWeight) * 100}
        {@const donePct = Math.min(100, Math.max(0, s.done || 0))}
        <div
          class="seg"
          style="width:{widthPct}%;background:var(--bg-muted)"
          title="{s.label}: {donePct}% (waga: {s.weight}%)"
        >
          <div
            class="seg-fill"
            style="width:{donePct}%;background:{colorOf(s.done, s.color)}"
          ></div>
        </div>
      {/each}
    </div>
    <div class="seg-legend">
      {#each segments as s}
        {@const widthPct = ((s.weight || 0) / totalWeight) * 100}
        <div class="seg-legend-item" style="flex:{widthPct}">
          <span class="seg-legend-dot" style="background:{colorOf(s.done, s.color)}"></span>
          <span class="seg-legend-lbl">{s.label}</span>
          <span class="seg-legend-val">{s.done}%</span>
        </div>
      {/each}
    </div>
  {/if}
</div>

<style>
  .seg-wrap {
    width: 100%;
  }
  .seg-track {
    display: flex;
    height: 14px;
    background: var(--bg-muted);
    border-radius: 8px;
    overflow: hidden;
    gap: 2px;
  }
  .seg {
    height: 100%;
    position: relative;
    min-width: 8px;
  }
  .seg-fill {
    height: 100%;
    transition: width .4s cubic-bezier(.4,0,.2,1);
  }
  .seg-legend {
    display: flex;
    gap: 8px;
    margin-top: 8px;
    flex-wrap: wrap;
  }
  .seg-legend-item {
    font-size: 11px;
    color: var(--text-secondary);
    display: inline-flex;
    align-items: center;
    gap: 6px;
    min-width: 0;
    overflow: hidden;
    padding: 2px 4px;
  }
  .seg-legend-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    flex-shrink: 0;
  }
  .seg-legend-lbl {
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    color: var(--text-primary);
    font-weight: 600;
  }
  .seg-legend-val {
    color: var(--text-muted);
    font-variant-numeric: tabular-nums;
    margin-left: auto;
  }
  .seg-empty {
    color: var(--text-muted);
    font-style: italic;
    padding: 10px 0;
    font-size: 12px;
  }
</style>
