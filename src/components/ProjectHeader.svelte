<script lang="ts">
  import { get } from 'svelte/store';
  import { auth } from '../lib/state/auth';
  import { projectMeta, STATUS_LABEL, fmtPln, normalizeProjectMeta, type ProjectStatus } from '../lib/state/project';
  import { projectSettings } from '../lib/state/worklog';
  import { tree } from '../lib/state/tree';
  import { currentProject } from '../lib/state/currentProject';
  import { listProjects, type CloudProject, updateProjectMeta } from '../lib/cloud/projects';
  import { flushCloudSync, loadFromCloud, startCloudSync, stopCloudSync } from '../lib/cloud/sync';
  import { collectLeaves } from '../lib/utils/wbs';
  import { todayISO, daysBetween } from '../lib/utils/dates';

  let editing = false;
  let draft = normalizeProjectMeta($projectMeta);
  let draftSettings = { ...$projectSettings };
  let cloudProjects: CloudProject[] = [];
  let projectPickerId = '';
  let projectPickerBusy = false;
  let projectPickerInfo: string | null = null;

  function projectMetaWithFallback() {
    const current = get(currentProject);
    const meta = get(projectMeta);
    const cloudCurrent = cloudProjects.find((project) => project.id === current.id) ?? null;

    return normalizeProjectMeta({
      ...meta,
      name: meta.name.trim() || current.name || cloudCurrent?.name || '',
      client: meta.client.trim() || cloudCurrent?.client || ''
    });
  }

  function openEdit() {
    draft = projectMetaWithFallback();
    draftSettings = { ...$projectSettings };
    projectPickerInfo = null;
    projectPickerId = get(currentProject).id || '';
    editing = true;
    if ($auth.configured) {
      void loadCloudProjects();
    }
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
    const current = get(currentProject);
    const cloudCurrent = cloudProjects.find((project) => project.id === current.id) ?? null;
    const nextMeta = normalizeProjectMeta({
      ...draft,
      name: draft.name.trim() || current.name || cloudCurrent?.name || '',
      client: draft.client.trim() || cloudCurrent?.client || ''
    });
    projectMeta.set(nextMeta);
    projectSettings.set({ ...draftSettings });
    currentProject.update((state) => ({
      ...state,
      name: nextMeta.name || state.name
    }));
    editing = false;

    const projectId = get(currentProject).id;
    if (!projectId) return;
    await updateProjectMeta(projectId, {
      name: nextMeta.name || 'Nowy projekt',
      client: nextMeta.client || null
    });
  }

  async function loadCloudProjects() {
    projectPickerBusy = true;
    projectPickerInfo = null;
    const res = await listProjects();
    projectPickerBusy = false;
    if (res.error) {
      projectPickerInfo = res.error.message;
      cloudProjects = [];
      return;
    }
    cloudProjects = res.data;
    projectPickerId = get(currentProject).id || res.data[0]?.id || '';
    if (editing) {
      draft = projectMetaWithFallback();
    }
  }

  async function openSelectedProject() {
    if (!projectPickerId) return;
    const previousId = get(currentProject).id;
    projectPickerBusy = true;
    projectPickerInfo = null;

    const flushRes = await flushCloudSync();
    if (flushRes.error) {
      projectPickerBusy = false;
      projectPickerInfo = flushRes.error;
      return;
    }

    stopCloudSync();
    const loadRes = await loadFromCloud(projectPickerId);
    if (loadRes.error) {
      if (previousId) startCloudSync(previousId);
      projectPickerBusy = false;
      projectPickerInfo = loadRes.error;
      return;
    }

    startCloudSync(projectPickerId);
    projectPickerBusy = false;
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

  <button class="ribbon-edit" on:click={openEdit} title="Edytuj metadane albo otwórz projekt z bazy">
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
      <path d="M18.5 2.5a2.12 2.12 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
    </svg>
    <span class="ribbon-edit-label">Edytuj / otwórz projekt</span>
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

      {#if $auth.configured}
        <section class="project-modal-section">
          <div class="project-modal-section-title">Cloud workspace</div>
          <div class="project-switcher">
            <div class="project-switcher-head">
              <strong>Przełącz projekt bez ręcznego przepisywania danych</strong>
              <small>Najpierw wybierz istniejący projekt z bazy, a dopiero potem ewentualnie popraw metadane.</small>
            </div>
            <label class="form-full">Istniejący projekt z bazy
              <select bind:value={projectPickerId} disabled={projectPickerBusy || cloudProjects.length === 0}>
                {#if cloudProjects.length === 0}
                  <option value="">Brak innych projektów w chmurze</option>
                {:else}
                  {#each cloudProjects as project}
                    <option value={project.id}>
                      {project.name || 'Bez nazwy'}{project.client ? ` — ${project.client}` : ''}
                    </option>
                  {/each}
                {/if}
              </select>
            </label>
            <div class="project-switcher-actions">
              <button class="btn project-switcher-btn" disabled={!projectPickerId || projectPickerBusy} on:click={openSelectedProject}>
                {projectPickerBusy ? 'Ładowanie…' : projectPickerId === $currentProject.id ? 'Odśwież z bazy' : 'Otwórz wybrany projekt'}
              </button>
            </div>
            <p class="project-switcher-note">
              Tu otworzysz istniejący projekt widoczny dla Twojego konta i od razu przełączysz cały workspace na ten zapis z bazy.
            </p>
            {#if projectPickerInfo}
              <p class="project-switcher-error">{projectPickerInfo}</p>
            {/if}
          </div>
        </section>
      {/if}

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
    background:
      linear-gradient(180deg, rgba(255, 255, 255, 0.98) 0%, rgba(246, 250, 254, 0.98) 100%);
    border-left: 1px solid rgba(20, 53, 95, 0.14);
    border-right: 1px solid rgba(20, 53, 95, 0.14);
    border-bottom: 1px solid rgba(20, 53, 95, 0.14);
    box-shadow:
      0 16px 32px rgba(15, 23, 42, 0.06),
      inset 0 1px 0 rgba(255, 255, 255, 0.92);
    font-size: 12px;
  }

  .ribbon-main {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 10px 16px;
    flex: 1;
    min-width: 0;
    border-right: 1px solid rgba(20, 53, 95, 0.12);
    background:
      radial-gradient(circle at top left, rgba(46, 117, 182, 0.14), transparent 38%),
      linear-gradient(135deg, rgba(17, 43, 76, 0.97) 0%, rgba(31, 66, 113, 0.96) 100%);
  }
  .ribbon-code {
    font-family: 'JetBrains Mono', 'Courier New', monospace;
    font-size: 11px;
    color: rgba(255, 255, 255, 0.88);
    padding: 5px 10px;
    background: rgba(255, 255, 255, 0.12);
    border: 1px solid rgba(255, 255, 255, 0.14);
    border-radius: 999px;
    box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.08);
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
    color: #fff;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .ribbon-client {
    font-size: 11px;
    color: rgba(255, 255, 255, 0.72);
    margin-top: 2px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .ribbon-client strong {
    color: #fff;
    font-weight: 600;
  }

  .ribbon-meta {
    display: flex;
    align-items: stretch;
    background:
      linear-gradient(180deg, rgba(243, 247, 252, 0.96) 0%, rgba(252, 253, 255, 0.98) 100%);
  }
  .meta-cell {
    display: flex;
    flex-direction: column;
    justify-content: center;
    gap: 2px;
    padding: 12px 16px;
    border-right: 1px solid rgba(20, 53, 95, 0.12);
    min-width: 0;
    min-height: 60px;
  }
  .meta-cell:last-child {
    border-right: none;
  }
  .meta-label {
    font-size: 10px;
    color: #7788a4;
    font-weight: 600;
    letter-spacing: 0.04em;
    text-transform: uppercase;
  }
  .meta-value {
    font-size: 12px;
    font-weight: 700;
    color: #243b5f;
    white-space: nowrap;
    font-variant-numeric: tabular-nums;
  }
  .meta-extra {
    color: #6c819f;
    font-weight: 500;
    margin-left: 4px;
  }
  .meta-status {
    display: inline-flex;
    align-self: flex-start;
    align-items: center;
    min-height: 28px;
    padding: 4px 10px;
    border-radius: 999px;
    border: 1px solid transparent;
    line-height: 1;
  }

  /* Status colors */
  .meta-status-aktywny {
    color: #166534;
    background: rgba(34, 197, 94, 0.12);
    border-color: rgba(34, 197, 94, 0.2);
  }
  .meta-status-wstrzymany {
    color: #a16207;
    background: rgba(245, 158, 11, 0.14);
    border-color: rgba(245, 158, 11, 0.22);
  }
  .meta-status-zakończony {
    color: #52637c;
    background: rgba(148, 163, 184, 0.14);
    border-color: rgba(148, 163, 184, 0.2);
  }
  .meta-status-planowany {
    color: #1d4d8c;
    background: rgba(46, 117, 182, 0.12);
    border-color: rgba(46, 117, 182, 0.18);
  }

  .meta-deadline-over { color: var(--color-danger); }
  .meta-deadline-soon { color: var(--color-warning); }
  .meta-deadline-ok { color: var(--text-primary); }

  .meta-budget-over { color: var(--color-danger); }
  .meta-budget-warn { color: var(--color-warning); }
  .meta-budget-ok { color: var(--text-primary); }

  .ribbon-edit {
    background:
      radial-gradient(circle at top center, rgba(255, 255, 255, 0.28), transparent 38%),
      linear-gradient(145deg, #244d86 0%, #2e75b6 100%);
    border: none;
    border-left: 1px solid rgba(20, 53, 95, 0.12);
    color: #fff;
    cursor: pointer;
    padding: 0 18px;
    height: 100%;
    align-self: stretch;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    min-width: 182px;
    font-weight: 700;
    transition: background .16s ease, color .16s ease, box-shadow .16s ease, transform .12s ease;
  }
  .ribbon-edit-label {
    display: none;
    font-size: 12px;
    font-weight: 700;
    letter-spacing: 0.01em;
  }
  .ribbon-edit:hover {
    background:
      radial-gradient(circle at top center, rgba(255, 255, 255, 0.34), transparent 38%),
      linear-gradient(145deg, #1e4577 0%, #3882c6 100%);
    box-shadow:
      inset 0 1px 0 rgba(255, 255, 255, 0.2),
      0 12px 24px rgba(46, 117, 182, 0.22);
    transform: translateY(-1px);
  }

  @media (min-width: 901px) {
    .proj-ribbon {
      border-radius: 0 0 14px 14px;
      overflow: hidden;
    }

    .ribbon-main {
      min-height: 72px;
      padding: 14px 18px;
    }

    .ribbon-name {
      font-size: 18px;
    }

    .ribbon-client {
      font-size: 12px;
    }

    .meta-cell {
      min-width: 122px;
    }

    .meta-value {
      font-size: 13px;
    }

    .ribbon-edit-label {
      display: inline;
    }
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

  .project-switcher {
    display: flex;
    flex-direction: column;
    gap: 10px;
  }

  .project-switcher-head {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .project-switcher-head strong {
    font-size: 14px;
    line-height: 1.2;
    color: var(--text-primary);
  }

  .project-switcher-head small {
    font-size: 12px;
    line-height: 1.5;
    color: var(--text-secondary);
  }

  .project-switcher-actions {
    display: flex;
    justify-content: flex-start;
  }

  .project-switcher-btn {
    background: linear-gradient(135deg, rgba(231, 240, 249, 0.98) 0%, rgba(245, 249, 253, 0.98) 100%);
    color: #12345d;
    border-color: rgba(46, 117, 182, 0.22);
  }

  .project-switcher-btn:hover {
    background: linear-gradient(135deg, rgba(215, 232, 247, 0.98) 0%, rgba(236, 244, 251, 0.98) 100%);
    color: #12345d;
  }

  .project-switcher-note,
  .project-switcher-error {
    margin: 0;
    font-size: 12px;
    line-height: 1.5;
  }

  .project-switcher-note {
    color: var(--text-secondary);
  }

  .project-switcher-error {
    color: var(--color-danger);
    font-weight: 600;
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
    width: 100%;
    min-width: 0;
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
      background:
        radial-gradient(circle at top center, rgba(255, 255, 255, 0.18), transparent 36%),
        linear-gradient(145deg, rgba(31, 66, 113, 0.94) 0%, rgba(46, 117, 182, 0.94) 100%);
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
