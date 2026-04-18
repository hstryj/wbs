<script lang="ts">
  import { projectMeta, STATUS_LABEL, fmtPln, type ProjectStatus } from '../lib/state/project';
  import { tree } from '../lib/state/tree';
  import { collectLeaves } from '../lib/utils/wbs';
  import { todayISO, daysBetween } from '../lib/utils/dates';

  let editing = false;
  let draft = { ...$projectMeta };

  function openEdit() {
    draft = { ...$projectMeta };
    editing = true;
  }
  function cancel() {
    editing = false;
  }
  function save() {
    projectMeta.set({ ...draft });
    editing = false;
  }

  const STATUS_OPTIONS: ProjectStatus[] = ['aktywny', 'wstrzymany', 'zakończony', 'planowany'];

  $: pm = $projectMeta;
  $: today = todayISO();
  $: daysLeft = pm.dateEnd ? daysBetween(today, pm.dateEnd) : null;
  $: deadlineState =
    daysLeft === null ? 'none' :
    daysLeft < 0 ? 'over' :
    daysLeft <= 7 ? 'soon' :
    'ok';

  $: budgetPct = pm.plannedBudget > 0 ? (pm.actualBudget / pm.plannedBudget) * 100 : 0;
  $: budgetState = budgetPct > 100 ? 'over' : budgetPct >= 80 ? 'warn' : 'ok';

  $: leavesCount = collectLeaves($tree).length;
</script>

<div class="proj-ribbon">
  <div class="ribbon-main">
    <div class="ribbon-code">{pm.code || '—'}</div>
    <div class="ribbon-title">
      <div class="ribbon-name">{pm.name || 'Nieokreślony projekt'}</div>
      <div class="ribbon-client">
        Klient: <strong>{pm.client || '—'}</strong>
        {#if pm.manager}· Kierownik: <strong>{pm.manager}</strong>{/if}
      </div>
    </div>
  </div>

  <div class="ribbon-meta">
    <div class="meta-cell">
      <span class="meta-label">Status</span>
      <span class="meta-value meta-status meta-status-{pm.status}">{STATUS_LABEL[pm.status]}</span>
    </div>
    <div class="meta-cell">
      <span class="meta-label">Termin</span>
      <span class="meta-value meta-deadline-{deadlineState}">
        {pm.dateEnd || '—'}
        {#if daysLeft !== null}
          <span class="meta-extra">
            ({daysLeft < 0 ? `${-daysLeft} dn po` : daysLeft === 0 ? 'dziś' : `za ${daysLeft} dn`})
          </span>
        {/if}
      </span>
    </div>
    <div class="meta-cell">
      <span class="meta-label">Budżet</span>
      <span class="meta-value meta-budget-{budgetState}">
        {fmtPln(pm.actualBudget)} / {fmtPln(pm.plannedBudget)} {pm.currency}
        {#if pm.plannedBudget > 0}
          <span class="meta-extra">({budgetPct.toFixed(0)}%)</span>
        {/if}
      </span>
    </div>
    <div class="meta-cell">
      <span class="meta-label">Zadania</span>
      <span class="meta-value">{leavesCount}</span>
    </div>
  </div>

  <button class="ribbon-edit" on:click={openEdit} title="Edytuj metadane projektu">
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
      <path d="M18.5 2.5a2.12 2.12 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
    </svg>
  </button>
</div>

{#if editing}
  <div
    class="modal-bg"
    on:click|self={cancel}
    on:keydown={(e) => e.key === 'Escape' && cancel()}
    role="dialog"
    aria-modal="true"
    aria-label="Edycja metadanych projektu"
    tabindex="-1"
  >
    <div class="modal-box">
      <h3>Metadane projektu</h3>
      <div class="form-grid">
        <label>Numer kontraktu
          <input type="text" bind:value={draft.code} placeholder="np. 2026/ME-014" />
        </label>
        <label>Status
          <select bind:value={draft.status}>
            {#each STATUS_OPTIONS as s}
              <option value={s}>{STATUS_LABEL[s]}</option>
            {/each}
          </select>
        </label>
        <label class="form-full">Nazwa projektu
          <input type="text" bind:value={draft.name} placeholder="np. Moderna Elektro — rozbudowa hali" />
        </label>
        <label class="form-full">Klient
          <input type="text" bind:value={draft.client} placeholder="np. ElektroPro Sp. z o.o." />
        </label>
        <label class="form-full">Kierownik projektu
          <input type="text" bind:value={draft.manager} placeholder="np. J. Kowalski" />
        </label>
        <label>Data rozpoczęcia
          <input type="date" bind:value={draft.dateStart} />
        </label>
        <label>Termin zakończenia
          <input type="date" bind:value={draft.dateEnd} />
        </label>
        <label>Budżet planowany (PLN)
          <input type="number" min="0" step="1000" bind:value={draft.plannedBudget} />
        </label>
        <label>Budżet aktualny (PLN)
          <input type="number" min="0" step="1000" bind:value={draft.actualBudget} />
        </label>
      </div>
      <div style="display:flex;justify-content:flex-end;gap:8px;margin-top:16px">
        <button class="btn" on:click={cancel} style="background:var(--bg-muted);color:var(--text-primary);border-color:var(--border)">Anuluj</button>
        <button class="btn btn-blue" on:click={save}>Zapisz</button>
      </div>
    </div>
  </div>
{/if}

<style>
  .proj-ribbon {
    display: flex;
    align-items: center;
    gap: 0;
    padding: 0;
    background: var(--bg-surface);
    border-left: 1px solid var(--border);
    border-right: 1px solid var(--border);
    border-bottom: 1px solid var(--border);
    font-size: 12px;
  }

  .ribbon-main {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 10px 16px;
    flex: 1;
    min-width: 0;
    border-right: 1px solid var(--border);
  }
  .ribbon-code {
    font-family: 'Courier New', monospace;
    font-size: 11px;
    color: var(--text-muted);
    padding: 3px 8px;
    background: var(--bg-muted);
    border-radius: 3px;
    font-weight: 700;
    letter-spacing: 0.04em;
    white-space: nowrap;
  }
  .ribbon-title {
    min-width: 0;
    flex: 1;
  }
  .ribbon-name {
    font-size: 14px;
    font-weight: 700;
    color: var(--text-primary);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .ribbon-client {
    font-size: 11px;
    color: var(--text-secondary);
    margin-top: 1px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .ribbon-client strong {
    color: var(--text-primary);
    font-weight: 600;
  }

  .ribbon-meta {
    display: flex;
    align-items: stretch;
  }
  .meta-cell {
    display: flex;
    flex-direction: column;
    justify-content: center;
    padding: 8px 16px;
    border-right: 1px solid var(--border);
    min-width: 0;
  }
  .meta-cell:last-child {
    border-right: none;
  }
  .meta-label {
    font-size: 10px;
    color: var(--text-muted);
    font-weight: 600;
    margin-bottom: 2px;
  }
  .meta-value {
    font-size: 12px;
    font-weight: 600;
    color: var(--text-primary);
    white-space: nowrap;
    font-variant-numeric: tabular-nums;
  }
  .meta-extra {
    color: var(--text-muted);
    font-weight: 400;
    margin-left: 4px;
  }

  /* Status colors */
  .meta-status-aktywny { color: var(--color-success); }
  .meta-status-wstrzymany { color: var(--color-warning); }
  .meta-status-zakończony { color: var(--text-muted); }
  .meta-status-planowany { color: var(--brand-primary); }

  .meta-deadline-over { color: var(--color-danger); }
  .meta-deadline-soon { color: var(--color-warning); }
  .meta-deadline-ok { color: var(--text-primary); }

  .meta-budget-over { color: var(--color-danger); }
  .meta-budget-warn { color: var(--color-warning); }
  .meta-budget-ok { color: var(--text-primary); }

  .ribbon-edit {
    background: transparent;
    border: none;
    border-left: 1px solid var(--border);
    color: var(--text-muted);
    cursor: pointer;
    padding: 0 14px;
    height: 100%;
    align-self: stretch;
    display: flex;
    align-items: center;
  }
  .ribbon-edit:hover {
    color: var(--brand-primary);
    background: var(--brand-primary-bg);
  }

  .form-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 12px 16px;
  }
  .form-grid label {
    display: flex;
    flex-direction: column;
    gap: 4px;
    font-size: 11px;
    font-weight: 600;
    color: var(--text-secondary);
  }
  .form-grid input,
  .form-grid select {
    border: 1px solid var(--border-strong);
    border-radius: 3px;
    padding: 7px 10px;
    font-size: 13px;
    font-family: inherit;
    color: var(--text-primary);
    background: var(--bg-surface);
  }
  .form-grid input:focus,
  .form-grid select:focus {
    outline: 2px solid var(--brand-primary);
    outline-offset: -1px;
  }
  .form-full {
    grid-column: 1 / -1;
  }

  @media (max-width: 900px) {
    .proj-ribbon {
      flex-wrap: wrap;
    }
    .ribbon-main {
      flex: 1 1 100%;
      border-right: none;
      border-bottom: 1px solid var(--border);
    }
    .ribbon-meta {
      flex: 1 1 100%;
      flex-wrap: wrap;
    }
    .meta-cell {
      flex: 1 1 50%;
      border-bottom: 1px solid var(--border-subtle);
    }
    .ribbon-edit {
      border-left: none;
      border-top: 1px solid var(--border);
      width: 100%;
      justify-content: center;
      padding: 8px;
    }
  }
</style>
