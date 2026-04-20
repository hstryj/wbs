<script lang="ts">
  import { get } from 'svelte/store';
  import { projectMeta, STATUS_LABEL, fmtPln, type ProjectStatus } from '../lib/state/project';
  import { projectSettings } from '../lib/state/worklog';
  import { tree } from '../lib/state/tree';
  import { currentProject } from '../lib/state/currentProject';
  import { updateProjectMeta } from '../lib/cloud/projects';
  import { collectLeaves } from '../lib/utils/wbs';
  import { todayISO, daysBetween } from '../lib/utils/dates';

  let editing = false;
  let draft = { ...$projectMeta };
  let draftSettings = { ...$projectSettings };

  function openEdit() {
    draft = { ...$projectMeta };
    draftSettings = { ...$projectSettings };
    editing = true;
  }
  function cancel() {
    editing = false;
  }
  function onWindowKeydown(e: KeyboardEvent) {
    if (e.key === 'Escape') cancel();
  }
  function onOverlayKeydown(e: KeyboardEvent) {
    if (e.key === 'Enter' || e.key === ' ' || e.key === 'Escape') {
      e.preventDefault();
      cancel();
    }
  }
  async function save() {
    projectMeta.set({ ...draft });
    projectSettings.set({ ...draftSettings });
    currentProject.update((state) => ({
      ...state,
      name: draft.name.trim() || state.name
    }));
    editing = false;

    const projectId = get(currentProject).id;
    if (!projectId) return;
    await updateProjectMeta(projectId, {
      name: draft.name.trim() || 'Nowy projekt',
      client: draft.client.trim() || null
    });
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

<svelte:window on:keydown={onWindowKeydown} />

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
    <span class="ribbon-edit-label">Edytuj projekt</span>
  </button>
</div>

{#if editing}
  <div
    class="modal-bg"
    on:click|self={cancel}
    on:keydown|self={onOverlayKeydown}
    role="button"
    tabindex="0"
    aria-label="Zamknij edycję metadanych projektu"
  >
    <div class="modal-box project-modal-box" role="dialog" aria-modal="true" aria-label="Edycja metadanych projektu">
      <div class="project-modal-head">
        <div class="project-modal-heading">
          <p class="project-modal-eyebrow">Profil projektu</p>
          <h3>Metadane projektu</h3>
        </div>
        <button class="project-modal-close" on:click={cancel} title="Zamknij edycję projektu">
          ×
        </button>
      </div>

      <section class="project-modal-section">
        <div class="project-modal-section-title">Podstawowe dane</div>
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
      </section>

      <section class="project-modal-section">
        <div class="project-modal-section-title">Ustawienia godzin pracy</div>
        <div class="form-grid project-settings-grid">
          <label>Godz./tydzień
            <input type="number" min="1" max="168" step="1" bind:value={draftSettings.hrsPerWeek} />
          </label>
          <label>Start pracy
            <input type="time" bind:value={draftSettings.start} />
          </label>
          <label>Koniec pracy
            <input type="time" bind:value={draftSettings.end} />
          </label>
          <label>Przerwa (min)
            <input type="number" min="0" max="240" step="15" bind:value={draftSettings.brk} />
          </label>
        </div>
      </section>

      <div class="project-modal-actions">
        <button class="btn project-modal-cancel" on:click={cancel}>Anuluj</button>
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
  .ribbon-edit-label {
    display: none;
    margin-left: 8px;
    font-size: 12px;
    font-weight: 700;
  }
  .ribbon-edit:hover {
    color: var(--brand-primary);
    background: var(--brand-primary-bg);
  }

  .project-modal-box {
    display: flex;
    flex-direction: column;
    gap: 16px;
  }
  .project-modal-box h3 {
    margin: 0;
  }
  .project-modal-head {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 12px;
  }
  .project-modal-heading {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }
  .project-modal-eyebrow {
    margin: 0;
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    color: var(--brand-primary);
  }
  .project-modal-close {
    flex-shrink: 0;
    width: 38px;
    height: 38px;
    border-radius: 999px;
    border: 1px solid var(--border);
    background: var(--bg-muted);
    color: var(--text-secondary);
    font-size: 22px;
    line-height: 1;
    cursor: pointer;
  }
  .project-modal-section {
    padding: 18px;
    border-radius: 24px;
    border: 1px solid var(--border);
    background:
      radial-gradient(circle at top right, rgba(46, 117, 182, 0.08), transparent 40%),
      var(--bg-surface);
  }
  .project-modal-section-title {
    margin-bottom: 12px;
    font-size: 12px;
    font-weight: 700;
    color: var(--text-primary);
  }
  .project-modal-actions {
    display: flex;
    justify-content: flex-end;
    gap: 8px;
  }
  .project-modal-cancel {
    background: var(--bg-muted);
    color: var(--text-primary);
    border-color: var(--border);
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
      border: none;
      border-radius: 28px;
      overflow: hidden;
      background:
        linear-gradient(180deg, rgba(20, 53, 95, 0.98) 0%, rgba(38, 85, 138, 0.94) 100%);
      box-shadow: 0 18px 32px rgba(20, 53, 95, 0.16);
    }
    .ribbon-main {
      flex: 1 1 100%;
      border-right: none;
      border-bottom: none;
      padding: 16px;
    }
    .ribbon-code {
      background: rgba(255, 255, 255, 0.14);
      color: rgba(255, 255, 255, 0.86);
    }
    .ribbon-name {
      color: #fff;
      font-size: 20px;
      white-space: normal;
    }
    .ribbon-client {
      color: rgba(255, 255, 255, 0.74);
      white-space: normal;
    }
    .ribbon-client strong {
      color: #fff;
    }
    .ribbon-meta {
      flex: 1 1 100%;
      gap: 10px;
      padding: 0 16px 16px;
      overflow-x: auto;
      flex-wrap: nowrap;
      -webkit-overflow-scrolling: touch;
    }
    .meta-cell {
      flex: 0 0 156px;
      min-width: 156px;
      border: 1px solid rgba(255, 255, 255, 0.18);
      border-radius: 22px;
      background: rgba(255, 255, 255, 0.1);
      backdrop-filter: blur(8px);
      padding: 14px;
    }
    .meta-label {
      color: rgba(255, 255, 255, 0.7);
      margin-bottom: 6px;
    }
    .meta-value {
      color: #fff;
      white-space: normal;
      line-height: 1.35;
    }
    .meta-extra {
      color: rgba(255, 255, 255, 0.72);
      display: block;
      margin: 4px 0 0;
    }
    .ribbon-edit {
      border-left: none;
      border-top: 1px solid rgba(255, 255, 255, 0.12);
      width: 100%;
      justify-content: center;
      padding: 14px 16px calc(14px + env(safe-area-inset-bottom));
      color: #fff;
      background: rgba(255, 255, 255, 0.06);
      gap: 8px;
    }
    .ribbon-edit-label {
      display: inline;
    }
    .modal-bg {
      align-items: flex-end;
      padding: 12px;
    }
    .project-modal-box {
      width: 100%;
      max-width: none;
      max-height: min(88vh, 760px);
      overflow-y: auto;
      padding: 18px 16px calc(20px + env(safe-area-inset-bottom));
      border-radius: 28px;
    }
    .project-modal-section {
      padding: 16px;
      border-radius: 24px;
    }
    .form-grid,
    .project-settings-grid {
      grid-template-columns: 1fr;
      gap: 12px;
    }
    .form-full {
      grid-column: auto;
    }
    .project-modal-actions {
      flex-direction: column-reverse;
    }
    .project-modal-actions .btn {
      width: 100%;
    }
  }

  @media (max-width: 520px) {
    .ribbon-main {
      flex-direction: column;
      align-items: flex-start;
    }
    .ribbon-meta {
      padding: 0 12px 12px;
    }
    .meta-cell {
      flex-basis: 144px;
      min-width: 144px;
    }
  }
</style>
