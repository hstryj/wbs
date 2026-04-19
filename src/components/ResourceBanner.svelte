<script lang="ts">
  import { tree } from '../lib/state/tree';
  import { people } from '../lib/state/people';
  import { projectSettings } from '../lib/state/worklog';
  import { collectLeaves } from '../lib/utils/wbs';

  $: totalMD = collectLeaves($tree).reduce((a, n) => a + (n.md || 0), 0);
  $: totalHours = totalMD * 8;
  $: hpw = $projectSettings.hrsPerWeek || 40;
  $: requiredWorkers = hpw > 0 ? totalHours / hpw : 0;
  $: requiredInt = Math.ceil(requiredWorkers);
  $: teamCount = $people.length;
  $: teamOk = teamCount >= requiredInt || requiredInt === 0;
</script>

<div class="res-banner" role="region" aria-label="Wskaźnik zasobów projektu">
  <div class="res-tile">
    <div class="res-icon" aria-hidden="true">⏱</div>
    <div class="res-body">
      <div class="res-label">Łączne godziny projektu</div>
      <div class="res-value">{totalHours.toFixed(0)} <span class="res-unit">godz.</span></div>
      <div class="res-sub">{totalMD.toFixed(0)} osobodni</div>
    </div>
  </div>

  <div class="res-tile">
    <div class="res-icon" aria-hidden="true">📅</div>
    <div class="res-body">
      <div class="res-label">Godz. / tydzień</div>
      <div class="res-value">{hpw} <span class="res-unit">h</span></div>
      <div class="res-sub">standard pracownika</div>
    </div>
  </div>

  <div class="res-tile">
    <div class="res-icon" aria-hidden="true">👷</div>
    <div class="res-body">
      <div class="res-label">Wymagani pracownicy</div>
      <div class="res-value">{requiredWorkers.toFixed(1)}</div>
      <div class="res-sub">min. {requiredInt} os.</div>
    </div>
  </div>

  <div class="res-tile" class:res-ok={teamOk} class:res-short={!teamOk}>
    <div class="res-icon" aria-hidden="true">{teamOk ? '✅' : '⚠️'}</div>
    <div class="res-body">
      <div class="res-label">Zespół projektowy</div>
      <div class="res-value">{teamCount} <span class="res-unit">os.</span></div>
      <div class="res-sub">
        {#if requiredInt === 0}
          Określ MD zadań
        {:else if teamOk}
          wystarczający ({teamCount - requiredInt >= 0 ? `+${teamCount - requiredInt}` : ''})
        {:else}
          brakuje {requiredInt - teamCount} os.
        {/if}
      </div>
    </div>
  </div>
</div>

<style>
  .res-banner {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 10px;
    margin-bottom: 14px;
  }
  .res-tile {
    display: flex;
    align-items: center;
    gap: 12px;
    background: var(--bg-surface);
    border: 1px solid var(--border);
    border-radius: var(--radius-md);
    padding: 12px 14px;
    transition: box-shadow .12s ease;
  }
  .res-tile:hover { box-shadow: var(--shadow-sm); }

  .res-ok {
    border-left: 3px solid var(--color-success);
    background: linear-gradient(to right, var(--color-success-bg), transparent 30%);
  }
  .res-short {
    border-left: 3px solid var(--color-danger);
    background: linear-gradient(to right, var(--color-danger-bg), transparent 30%);
  }
  .res-ok .res-value { color: var(--color-success); }
  .res-short .res-value { color: var(--color-danger); }

  .res-icon {
    font-size: 22px;
    line-height: 1;
    flex-shrink: 0;
  }
  .res-body { min-width: 0; flex: 1; }
  .res-label {
    font-size: 10px;
    color: var(--text-muted);
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: .04em;
    margin-bottom: 2px;
  }
  .res-value {
    font-size: 20px;
    font-weight: 700;
    color: var(--text-primary);
    line-height: 1.1;
    font-variant-numeric: tabular-nums;
    letter-spacing: -0.01em;
  }
  .res-unit { font-size: 12px; font-weight: 400; color: var(--text-muted); }
  .res-sub {
    font-size: 11px;
    color: var(--text-secondary);
    margin-top: 2px;
  }

  @media (max-width: 900px) {
    .res-banner { grid-template-columns: repeat(2, 1fr); }
  }
  @media (max-width: 500px) {
    .res-banner { grid-template-columns: 1fr; }
  }
</style>
