<script lang="ts">
  import { people, pName } from '../lib/state/people';
  import { worklog, wlGetHours, wlWeekTotal, wlPersonTotal, wlPersonMonth, wlPersonRange, wlHoursByTask, wlSetHours } from '../lib/state/worklog';
  import { tree } from '../lib/state/tree';
  import { assignCodes, collectLeaves } from '../lib/utils/wbs';
  import { getISOWeek, weekKey, weeksInYear, todayISO } from '../lib/utils/dates';

  type SubTab = 'week' | 'month' | 'range' | 'task';
  let sub: SubTab = 'week';

  const now = new Date();
  const [curY, curW] = getISOWeek(now);

  let selY = curY;
  let selW = curW;
  let monthYear = now.getFullYear();
  let monthSel = now.getMonth() + 1;
  let rangeFrom = todayISO();
  let rangeTo = todayISO();

  $: ($tree, assignCodes($tree));
  $: leaves = collectLeaves($tree);

  const DAYS = ['Pn', 'Wt', 'Śr', 'Cz', 'Pt', 'So', 'Nd'];
  const MONTHS = ['Styczeń','Luty','Marzec','Kwiecień','Maj','Czerwiec','Lipiec','Sierpień','Wrzesień','Październik','Listopad','Grudzień'];

  // List of persons shown in reports: union of PEOPLE and anyone with worklog
  $: personList = (() => {
    const names = new Set<string>();
    $people.forEach((p) => { const n = pName(p); if (n) names.add(n); });
    Object.keys($worklog).forEach((n) => names.add(n));
    return [...names].sort();
  })();

  const yearOpts = (() => {
    const y = now.getFullYear();
    return [y - 1, y, y + 1];
  })();
  $: weekOpts = (() => Array.from({ length: weeksInYear(selY) }, (_, i) => i + 1))();

  function onHourInput(person: string, dow: number, e: Event) {
    const v = parseFloat((e.target as HTMLInputElement).value) || 0;
    wlSetHours(person, selY, selW, dow, v);
  }

  // Derived tables per sub-tab
  $: weekRows = personList.map((p) => ({
    name: p,
    days: [1, 2, 3, 4, 5, 6, 7].map((d) => wlGetHours($worklog, p, selY, selW, d)),
    total: wlWeekTotal($worklog, p, selY, selW)
  }));
  $: weekGrand = weekRows.reduce((a, r) => a + r.total, 0);

  $: monthRows = personList.map((p) => ({
    name: p,
    hours: wlPersonMonth($worklog, p, monthYear, monthSel)
  }));
  $: monthGrand = monthRows.reduce((a, r) => a + r.hours, 0);

  $: rangeRows = personList.map((p) => ({
    name: p,
    hours: wlPersonRange($worklog, p, rangeFrom, rangeTo)
  }));
  $: rangeGrand = rangeRows.reduce((a, r) => a + r.hours, 0);

  $: taskHours = wlHoursByTask($worklog);
  $: taskRows = leaves
    .map((n) => ({
      code: n._code || '',
      name: n.name || '–',
      hours: taskHours[n._code || ''] || 0,
      resp: n.resp || '—'
    }))
    .filter((r) => r.hours > 0)
    .sort((a, b) => b.hours - a.hours);
  $: taskGrand = taskRows.reduce((a, r) => a + r.hours, 0);
</script>

<div class="inner-pane">
  <div class="wlrg-panel">
    <div class="wlrg-tabs">
      <button class="wlrg-tab" class:active={sub === 'week'}  on:click={() => (sub = 'week')}>Tydzień</button>
      <button class="wlrg-tab" class:active={sub === 'month'} on:click={() => (sub = 'month')}>Miesiąc</button>
      <button class="wlrg-tab" class:active={sub === 'range'} on:click={() => (sub = 'range')}>Zakres dat</button>
      <button class="wlrg-tab" class:active={sub === 'task'}  on:click={() => (sub = 'task')}>Zadania WBS</button>
    </div>

    {#if sub === 'week'}
      <div class="wlrg-row">
        <label for="wl-year">Rok:</label>
        <select id="wl-year" bind:value={selY}>
          {#each yearOpts as y}<option value={y}>{y}</option>{/each}
        </select>
        <label for="wl-week">Tydzień:</label>
        <select id="wl-week" bind:value={selW}>
          {#each weekOpts as w}<option value={w}>{w}</option>{/each}
        </select>
      </div>
      <p style="font-size:11px;color:#7a92ad;margin-bottom:10px">
        💡 Wpisz godziny bezpośrednio w komórkach — zmiany zapisują się automatycznie.
      </p>
      <div class="tbl-wrap">
        <table class="rank">
          <thead>
            <tr>
              <th style="width:140px">Pracownik</th>
              {#each DAYS as d}<th style="width:56px;text-align:center">{d}</th>{/each}
              <th style="width:70px;text-align:center">Razem</th>
            </tr>
          </thead>
          <tbody>
            {#if !personList.length}
              <tr><td colspan="9" style="text-align:center;padding:24px;color:#7a92ad">
                Brak pracowników. Dodaj osoby w Edytorze WBS lub w legacy.
              </td></tr>
            {:else}
              {#each weekRows as r}
                <tr>
                  <td style="font-weight:600;color:#1a3a6a">{r.name}</td>
                  {#each r.days as h, idx}
                    <td style="padding:3px 4px;text-align:center">
                      <input
                        type="number"
                        min="0"
                        max="24"
                        step="0.5"
                        value={h}
                        on:input={(e) => onHourInput(r.name, idx + 1, e)}
                        style="width:44px;padding:4px 4px;border:1px solid #c5d4e8;border-radius:4px;text-align:center;font-size:11px"
                      />
                    </td>
                  {/each}
                  <td style="text-align:center;font-weight:700;color:#1F3864">{r.total.toFixed(1)}</td>
                </tr>
              {/each}
              <tr style="background:#1a3057;color:#fff;font-weight:700">
                <td style="padding:8px 9px">SUMA</td>
                <td colspan="7"></td>
                <td style="padding:8px 9px;text-align:center">{weekGrand.toFixed(1)} h</td>
              </tr>
            {/if}
          </tbody>
        </table>
      </div>

    {:else if sub === 'month'}
      <div class="wlrg-row">
        <label for="wl-m-year">Rok:</label>
        <select id="wl-m-year" bind:value={monthYear}>
          {#each yearOpts as y}<option value={y}>{y}</option>{/each}
        </select>
        <label for="wl-m-month">Miesiąc:</label>
        <select id="wl-m-month" bind:value={monthSel}>
          {#each MONTHS as m, i}<option value={i + 1}>{m}</option>{/each}
        </select>
      </div>
      <div class="tbl-wrap">
        <table class="rank">
          <thead>
            <tr>
              <th>Pracownik</th>
              <th style="width:100px;text-align:center">Godziny</th>
              <th style="width:90px;text-align:center">Dni robocze</th>
            </tr>
          </thead>
          <tbody>
            {#if !personList.length}
              <tr><td colspan="3" style="text-align:center;padding:24px;color:#7a92ad">Brak danych.</td></tr>
            {:else}
              {#each monthRows as r}
                <tr>
                  <td style="font-weight:600;color:#1a3a6a">{r.name}</td>
                  <td style="text-align:center;font-weight:700">{r.hours.toFixed(1)} h</td>
                  <td style="text-align:center;color:#5a7aaa">{(r.hours / 8).toFixed(1)}</td>
                </tr>
              {/each}
              <tr style="background:#1a3057;color:#fff;font-weight:700">
                <td style="padding:8px 9px">SUMA</td>
                <td style="padding:8px 9px;text-align:center">{monthGrand.toFixed(1)} h</td>
                <td style="padding:8px 9px;text-align:center">{(monthGrand / 8).toFixed(1)}</td>
              </tr>
            {/if}
          </tbody>
        </table>
      </div>

    {:else if sub === 'range'}
      <div class="wlrg-row">
        <label for="wl-from">Od:</label>
        <input id="wl-from" type="date" bind:value={rangeFrom} />
        <label for="wl-to">Do:</label>
        <input id="wl-to" type="date" bind:value={rangeTo} />
      </div>
      <div class="tbl-wrap">
        <table class="rank">
          <thead>
            <tr>
              <th>Pracownik</th>
              <th style="width:100px;text-align:center">Godziny</th>
              <th style="width:90px;text-align:center">Dni</th>
            </tr>
          </thead>
          <tbody>
            {#if !personList.length}
              <tr><td colspan="3" style="text-align:center;padding:24px;color:#7a92ad">Brak danych.</td></tr>
            {:else}
              {#each rangeRows as r}
                <tr>
                  <td style="font-weight:600;color:#1a3a6a">{r.name}</td>
                  <td style="text-align:center;font-weight:700">{r.hours.toFixed(1)} h</td>
                  <td style="text-align:center;color:#5a7aaa">{(r.hours / 8).toFixed(1)}</td>
                </tr>
              {/each}
              <tr style="background:#1a3057;color:#fff;font-weight:700">
                <td style="padding:8px 9px">SUMA</td>
                <td style="padding:8px 9px;text-align:center">{rangeGrand.toFixed(1)} h</td>
                <td style="padding:8px 9px;text-align:center">{(rangeGrand / 8).toFixed(1)}</td>
              </tr>
            {/if}
          </tbody>
        </table>
      </div>

    {:else if sub === 'task'}
      <p style="font-size:11px;color:#7a92ad;margin-bottom:10px">
        Godziny przypisane do zadań WBS (pole „task" w worklog entry).
      </p>
      <div class="tbl-wrap">
        <table class="rank">
          <thead>
            <tr>
              <th style="width:86px">Kod</th>
              <th>Zadanie</th>
              <th style="width:110px">Odpowiedzialny</th>
              <th style="width:100px;text-align:center">Godziny</th>
            </tr>
          </thead>
          <tbody>
            {#if !taskRows.length}
              <tr><td colspan="4" style="text-align:center;padding:24px;color:#7a92ad">
                Brak godzin przypisanych do zadań.
              </td></tr>
            {:else}
              {#each taskRows as r}
                <tr>
                  <td><span style="font-family:'Courier New',monospace;font-size:10px;color:#7a92ad">{r.code}</span></td>
                  <td style="font-weight:600;color:#1a3a6a">{r.name}</td>
                  <td style="color:#555">{r.resp}</td>
                  <td style="text-align:center;font-weight:700">{r.hours.toFixed(1)} h</td>
                </tr>
              {/each}
              <tr style="background:#1a3057;color:#fff;font-weight:700">
                <td colspan="3" style="padding:8px 9px;text-align:right">SUMA:</td>
                <td style="padding:8px 9px;text-align:center">{taskGrand.toFixed(1)} h</td>
              </tr>
            {/if}
          </tbody>
        </table>
      </div>
    {/if}
  </div>
</div>
