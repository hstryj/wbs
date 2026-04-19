<script lang="ts">
  import { writable } from 'svelte/store';
  import { tree } from '../lib/state/tree';
  import { people, pName, pRole, initials } from '../lib/state/people';
  import { worklog, wlGetHours } from '../lib/state/worklog';
  import { persistStore } from '../lib/state/persistence';
  import { assignCodes, collectLeaves, taskActiveOnDay } from '../lib/utils/wbs';
  import { PRIORITY_COLOR } from '../lib/utils/priority';
  import {
    getISOWeek, weekKey, weekStartDate, shiftWeek,
    weekDates, monthDates, isWeekend,
    DAYS_PL_SHORT, MONTHS_PL, MONTHS_PL_SHORT,
    todayISO
  } from '../lib/utils/dates';
  import ResourceBanner from '../components/ResourceBanner.svelte';
  import type { WbsNode, Person } from '../lib/types';

  type ViewMode = 'week' | 'month';
  type PersonFilter = string; // '' (all) | 'NazwaOsoby' | 'grp:NazwaGrupy'

  const viewMode = writable<ViewMode>('week');
  persistStore(viewMode, 'wbs_personal_plan_mode');

  // Current week state (YYYY-Wnn) — initialized from today
  const todayY = new Date().getFullYear();
  const [curY, curW] = getISOWeek(new Date());
  const curWeekKey = weekKey(curY, curW);

  let selWeek: string = curWeekKey;
  let selMonth: string = `${todayY}-${String(new Date().getMonth() + 1).padStart(2, '0')}`;
  let personFilter: PersonFilter = '';

  $: ($tree, assignCodes($tree));

  // ── Group extraction (from people.group field) ──────────────────
  $: groups = (() => {
    const set = new Set<string>();
    $people.forEach((p) => {
      const g = (p as Person).group;
      if (g && g.trim()) set.add(g.trim());
    });
    return [...set].sort();
  })();

  // ── Filter persons by personFilter ──────────────────────────────
  $: filteredPersons = (() => {
    const base: Person[] = $people.filter((p) => pName(p));
    if (!personFilter) return base;
    if (personFilter.startsWith('grp:')) {
      const g = personFilter.slice(4);
      return base.filter((p) => (p as Person).group === g);
    }
    return base.filter((p) => pName(p) === personFilter);
  })();

  // ── Week view data ──────────────────────────────────────────────
  $: weekY = parseInt(selWeek.slice(0, 4));
  $: weekN = parseInt(selWeek.slice(6));
  $: weekDays = weekDates(weekY, weekN); // 7 ISO dates

  // ── Month view data ─────────────────────────────────────────────
  $: monthY = parseInt(selMonth.slice(0, 4));
  $: monthM = parseInt(selMonth.slice(5, 7));
  $: monthDays = monthDates(monthY, monthM);

  $: today = todayISO();

  // ── Task chips for a person on a day ────────────────────────────
  function chipsFor(personName: string, iso: string): WbsNode[] {
    const all = collectLeaves($tree);
    return all.filter((n) => n.resp === personName && taskActiveOnDay(n, iso));
  }

  function hoursFor(personName: string, iso: string): number {
    const d = new Date(iso + 'T00:00:00Z');
    const [y, w] = getISOWeek(d);
    const dow = d.getUTCDay() === 0 ? 7 : d.getUTCDay();
    return wlGetHours($worklog, personName, y, w, dow);
  }

  function personWeekTotalHours(personName: string): number {
    return weekDays.reduce((a, iso) => a + hoursFor(personName, iso), 0);
  }

  // ── Navigation ──────────────────────────────────────────────────
  function prev() {
    if ($viewMode === 'week') {
      selWeek = shiftWeek(selWeek, -1);
    } else {
      const [y, m] = selMonth.split('-').map((s) => parseInt(s));
      const d = new Date(Date.UTC(y, m - 2, 15)); // m-2 bo m jest 1-indexed, chcę miesiąc wcześniej
      selMonth = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
    }
  }

  function next() {
    if ($viewMode === 'week') {
      selWeek = shiftWeek(selWeek, 1);
    } else {
      const [y, m] = selMonth.split('-').map((s) => parseInt(s));
      const d = new Date(Date.UTC(y, m, 15)); // m = index następnego miesiąca
      selMonth = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
    }
  }

  function goToday() {
    const now = new Date();
    const [y, w] = getISOWeek(now);
    selWeek = weekKey(y, w);
    selMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  }

  function fmtWeekRange(wk: string): string {
    const y = parseInt(wk.slice(0, 4));
    const w = parseInt(wk.slice(6));
    const mon = weekStartDate(y, w);
    const sun = new Date(mon);
    sun.setUTCDate(mon.getUTCDate() + 6);
    const fmt = (d: Date) => d.getUTCDate() + ' ' + MONTHS_PL_SHORT[d.getUTCMonth()];
    return fmt(mon) + ' – ' + fmt(sun);
  }

  function chipTooltip(n: WbsNode): string {
    return `${n._code ?? ''} ${n.name || ''} | ${n.dateStart}→${n.dateEnd} | ${n.done || 0}%`;
  }

  function personMeta(p: Person): string {
    const parts: string[] = [];
    if (p.role) parts.push(p.role);
    if (p.group) parts.push(p.group);
    return parts.join(' · ');
  }
</script>

<div class="inner-pane plan-root">
  <ResourceBanner />

  <div class="plan-toolbar">
    <div class="plan-view-toggle" role="tablist" aria-label="Tryb widoku">
      <button
        class:active={$viewMode === 'week'}
        on:click={() => viewMode.set('week')}
        role="tab"
        aria-selected={$viewMode === 'week'}
      >Tygodniowy</button>
      <button
        class:active={$viewMode === 'month'}
        on:click={() => viewMode.set('month')}
        role="tab"
        aria-selected={$viewMode === 'month'}
      >Miesięczny</button>
    </div>

    <label class="plan-field">
      Zespół:
      <select bind:value={personFilter}>
        <option value="">Wszyscy ({$people.length})</option>
        {#if groups.length}
          <optgroup label="── Grupy ──">
            {#each groups as g}
              <option value={`grp:${g}`}>{g}</option>
            {/each}
          </optgroup>
        {/if}
        <optgroup label="── Osoby ──">
          {#each $people as p}
            <option value={pName(p)}>{pName(p)}{pRole(p) ? ` (${pRole(p)})` : ''}</option>
          {/each}
        </optgroup>
      </select>
    </label>

    {#if $viewMode === 'week'}
      <label class="plan-field">
        Tydzień:
        <input type="week" bind:value={selWeek} />
      </label>
      <span class="plan-range">{fmtWeekRange(selWeek)}</span>
    {:else}
      <label class="plan-field">
        Miesiąc:
        <input type="month" bind:value={selMonth} />
      </label>
      <span class="plan-range">{MONTHS_PL[monthM - 1]} {monthY}</span>
    {/if}

    <div class="plan-nav">
      <button on:click={prev} aria-label="Poprzedni">◀</button>
      <button class="plan-today" on:click={goToday}>Dziś</button>
      <button on:click={next} aria-label="Następny">▶</button>
    </div>
  </div>

  {#if !filteredPersons.length}
    <div class="plan-empty">
      Brak osób do wyświetlenia. Dodaj pracowników w widoku <strong>Zespół</strong> lub zmień filtr.
    </div>
  {:else if $viewMode === 'week'}
    <!-- ── WEEK VIEW ── -->
    <div class="tbl-wrap">
      <table class="plan-table">
        <thead>
          <tr>
            <th class="plan-th-person">Pracownik</th>
            {#each weekDays as iso, i}
              {@const weekend = isWeekend(iso)}
              {@const isToday = iso === today}
              <th class="plan-th-day" class:plan-weekend={weekend} class:plan-today-col={isToday}>
                <div class="plan-day-name">{DAYS_PL_SHORT[i]}</div>
                <div class="plan-day-date">{parseInt(iso.slice(8))} {MONTHS_PL_SHORT[parseInt(iso.slice(5, 7)) - 1]}</div>
              </th>
            {/each}
            <th class="plan-th-total">Σ godz.</th>
          </tr>
        </thead>
        <tbody>
          {#each filteredPersons as p}
            {@const nm = pName(p)}
            {@const total = personWeekTotalHours(nm)}
            {@const meta = personMeta(p)}
            <tr>
              <td class="plan-td-person">
                <div class="plan-person">
                  <div class="plan-avatar">{initials(nm)}</div>
                  <div class="plan-pname">
                    <div>{nm}</div>
                    {#if meta}
                      <div class="plan-pmeta">{meta}</div>
                    {/if}
                  </div>
                </div>
              </td>
              {#each weekDays as iso}
                {@const chips = chipsFor(nm, iso)}
                {@const hrs = hoursFor(nm, iso)}
                {@const weekend = isWeekend(iso)}
                {@const isToday = iso === today}
                <td class="plan-td-day" class:plan-weekend={weekend} class:plan-today-col={isToday}>
                  {#if chips.length}
                    <div class="plan-chips">
                      {#each chips.slice(0, 4) as n}
                        {@const col = PRIORITY_COLOR[n.priority || '']}
                        <div class="plan-chip" style="border-left-color:{col}" title={chipTooltip(n)}>
                          <span class="plan-chip-code">{n._code ?? ''}</span>
                          <span class="plan-chip-name">{n.name || '—'}</span>
                        </div>
                      {/each}
                      {#if chips.length > 4}
                        <div class="plan-chip-more">+{chips.length - 4} więcej</div>
                      {/if}
                    </div>
                  {/if}
                  {#if hrs > 0}
                    <div class="plan-hours">{hrs.toFixed(1)} h</div>
                  {/if}
                </td>
              {/each}
              <td class="plan-td-total">{total.toFixed(1)}</td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>
  {:else}
    <!-- ── MONTH VIEW ── -->
    <div class="tbl-wrap">
      <table class="plan-table plan-table-month">
        <thead>
          <tr>
            <th class="plan-th-person">Pracownik</th>
            {#each monthDays as iso}
              {@const d = parseInt(iso.slice(8))}
              {@const weekend = isWeekend(iso)}
              {@const isToday = iso === today}
              {@const dayJs = new Date(iso + 'T00:00:00Z').getUTCDay()}
              <th
                class="plan-th-mday"
                class:plan-weekend={weekend}
                class:plan-today-col={isToday}
                class:plan-monday={dayJs === 1}
              >{d}</th>
            {/each}
          </tr>
        </thead>
        <tbody>
          {#each filteredPersons as p}
            {@const nm = pName(p)}
            <tr>
              <td class="plan-td-person">
                <div class="plan-person">
                  <div class="plan-avatar">{initials(nm)}</div>
                  <div class="plan-pname">{nm}</div>
                </div>
              </td>
              {#each monthDays as iso}
                {@const chips = chipsFor(nm, iso)}
                {@const weekend = isWeekend(iso)}
                {@const isToday = iso === today}
                <td
                  class="plan-td-mday"
                  class:plan-weekend={weekend}
                  class:plan-today-col={isToday}
                  title={chips.length ? chips.map(chipTooltip).join('\n') : ''}
                >
                  {#if chips.length}
                    <div class="plan-mday-chips">
                      {#each chips.slice(0, 3) as n}
                        <div
                          class="plan-mday-dot"
                          style="background:{PRIORITY_COLOR[n.priority || '']}"
                          title={chipTooltip(n)}
                        ></div>
                      {/each}
                      {#if chips.length > 3}
                        <div class="plan-mday-more">+{chips.length - 3}</div>
                      {/if}
                    </div>
                  {/if}
                </td>
              {/each}
            </tr>
          {/each}
        </tbody>
      </table>
    </div>
  {/if}
</div>

<style>
  .plan-root { padding: 16px; }

  .plan-toolbar {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 12px;
    padding: 10px 14px;
    background: var(--bg-muted);
    border: 1px solid var(--border);
    border-radius: var(--radius-md);
    margin-bottom: 12px;
    font-size: 12px;
  }

  .plan-view-toggle {
    display: inline-flex;
    border: 1px solid var(--border-strong);
    border-radius: var(--radius-sm);
    overflow: hidden;
    background: var(--bg-surface);
  }
  .plan-view-toggle button {
    background: transparent;
    border: none;
    padding: 6px 14px;
    font-size: 12px;
    font-weight: 500;
    color: var(--text-secondary);
    cursor: pointer;
    font-family: inherit;
  }
  .plan-view-toggle button.active {
    background: var(--brand-primary);
    color: #fff;
    font-weight: 600;
  }

  .plan-field {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    color: var(--text-secondary);
    font-weight: 500;
  }
  .plan-field select,
  .plan-field input {
    padding: 5px 8px;
    border: 1px solid var(--border-strong);
    border-radius: var(--radius-sm);
    font-size: 12px;
    font-family: inherit;
    color: var(--text-primary);
    background: var(--bg-surface);
  }
  .plan-field select:focus,
  .plan-field input:focus {
    outline: none;
    border-color: var(--brand-primary);
    box-shadow: 0 0 0 2px var(--brand-primary-bg);
  }
  .plan-range {
    color: var(--text-primary);
    font-weight: 600;
    margin-left: auto;
  }
  .plan-nav {
    display: inline-flex;
    gap: 4px;
  }
  .plan-nav button {
    padding: 6px 12px;
    border: 1px solid var(--border-strong);
    background: var(--bg-surface);
    color: var(--text-primary);
    border-radius: var(--radius-sm);
    cursor: pointer;
    font-family: inherit;
    font-size: 12px;
    font-weight: 500;
    transition: background .1s, border-color .1s;
  }
  .plan-nav button:hover { background: var(--brand-primary-bg); border-color: var(--brand-primary); color: var(--brand-primary-dark); }
  .plan-nav .plan-today { font-weight: 600; }

  .plan-empty {
    padding: 40px;
    text-align: center;
    color: var(--text-muted);
    background: var(--bg-surface);
    border: 1px solid var(--border);
    border-radius: var(--radius-md);
  }

  /* ── Table ── */
  .plan-table {
    width: 100%;
    border-collapse: collapse;
    background: var(--bg-surface);
    font-size: 12px;
  }
  .plan-table thead th {
    background: var(--bg-muted);
    color: var(--text-primary);
    padding: 8px 10px;
    font-size: 11px;
    font-weight: 600;
    text-align: center;
    text-transform: uppercase;
    letter-spacing: .04em;
    border-bottom: 2px solid var(--brand-primary);
    border-right: 1px solid var(--border);
  }
  .plan-table thead th:last-child { border-right: none; }
  .plan-table .plan-th-person { text-align: left; padding-left: 12px; width: 200px; }
  .plan-table .plan-th-day {
    min-width: 130px;
  }
  .plan-day-name { font-size: 11px; font-weight: 700; }
  .plan-day-date { font-size: 10px; font-weight: 400; color: var(--text-muted); margin-top: 2px; text-transform: none; letter-spacing: 0; }
  .plan-table .plan-th-total { width: 80px; }

  .plan-table tbody td {
    padding: 6px 8px;
    border-bottom: 1px solid var(--border-subtle);
    border-right: 1px solid var(--border-subtle);
    vertical-align: top;
  }
  .plan-table tbody tr:hover td { background: var(--table-hover); }

  .plan-td-person {
    padding: 8px 12px !important;
    background: var(--bg-surface);
    border-right: 1px solid var(--border);
    position: sticky;
    left: 0;
    z-index: 1;
  }
  .plan-person { display: flex; align-items: center; gap: 8px; }
  .plan-avatar {
    width: 28px; height: 28px; border-radius: 50%;
    background: var(--brand-primary); color: #fff;
    font-size: 11px; font-weight: 700;
    display: flex; align-items: center; justify-content: center;
    flex-shrink: 0;
  }
  .plan-pname { font-weight: 600; color: var(--text-primary); font-size: 12px; }
  .plan-pmeta { font-size: 10px; color: var(--text-muted); font-weight: 400; }

  .plan-td-day { min-height: 60px; }
  .plan-weekend { background: repeating-linear-gradient(45deg, var(--bg-muted), var(--bg-muted) 4px, var(--bg-surface) 4px, var(--bg-surface) 8px); }
  .plan-today-col { background: var(--brand-primary-bg) !important; }

  .plan-chips { display: flex; flex-direction: column; gap: 3px; }
  .plan-chip {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 3px 6px;
    background: var(--bg-muted);
    border: 1px solid var(--border);
    border-left: 3px solid var(--color-neutral);
    border-radius: var(--radius-sm);
    font-size: 10px;
    line-height: 1.2;
    cursor: help;
  }
  .plan-chip-code {
    font-family: 'JetBrains Mono', monospace;
    font-size: 9px;
    color: var(--text-muted);
    font-weight: 600;
    flex-shrink: 0;
  }
  .plan-chip-name {
    color: var(--text-primary);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-weight: 500;
  }
  .plan-chip-more { font-size: 10px; color: var(--text-muted); font-style: italic; padding: 2px 6px; }

  .plan-hours {
    margin-top: 4px;
    font-size: 10px;
    font-weight: 700;
    color: var(--brand-primary-dark);
    text-align: right;
    font-variant-numeric: tabular-nums;
  }

  .plan-td-total {
    text-align: center;
    font-weight: 700;
    color: var(--text-primary);
    font-variant-numeric: tabular-nums;
    font-size: 13px;
  }

  /* ── Month view ── */
  .plan-table-month thead .plan-th-mday {
    min-width: 22px;
    padding: 4px 2px;
    font-size: 10px;
    font-weight: 500;
  }
  .plan-table-month thead .plan-monday {
    border-left: 2px solid var(--brand-primary);
  }
  .plan-td-mday {
    min-width: 22px;
    padding: 3px 2px !important;
    text-align: center;
    vertical-align: middle;
  }
  .plan-mday-chips {
    display: inline-flex;
    gap: 2px;
    align-items: center;
  }
  .plan-mday-dot {
    width: 5px; height: 5px; border-radius: 50%;
  }
  .plan-mday-more { font-size: 8px; color: var(--text-muted); }
</style>
