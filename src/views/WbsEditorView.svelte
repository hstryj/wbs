<script lang="ts">
  import { tree, addChild, addSibling, addRoot, delNode, setField, setWeight, toggleCollapse } from '../lib/state/tree';
  import { assignCodes, depthCfg, depthOf, isLeaf, childWeightSum, childWeightedSum, nodeDonePct, nodeWtd, rootWeightSum, rootWeightedSum, barColor } from '../lib/utils/wbs';
  import { colVis, colPanelOpen, warnMsg, type ColName } from '../lib/state/ui';
  import { PRIORITIES } from '../lib/utils/priority';
  import { people, pName, pRole } from '../lib/state/people';
  import type { WbsNode, Priority, RAG } from '../lib/types';
  import { todayISO } from '../lib/utils/dates';

  $: ($tree, assignCodes($tree));

  // ── Flat row list (buildRows analog) ──────────────────────────────
  type Row =
    | { kind: 'proj';     node: WbsNode; canToggle: boolean }
    | { kind: 'task';     node: WbsNode; depth: number; cfg: ReturnType<typeof depthCfg> }
    | { kind: 'add';      onClick: () => void; label: string; bg: string; colspan: number; style?: string }
    | { kind: 'addRoot' };

  function buildRows(list: WbsNode[]): Row[] {
    const rows: Row[] = [];
    for (let i = 0; i < list.length; i++) {
      const n = list[i];
      if (n.isProject) {
        rows.push({ kind: 'proj', node: n, canToggle: n.children.length > 0 });
        if (!n.collapsed) pushChildren(n.children, rows);
        if (i === list.length - 1) {
          rows.push({ kind: 'addRoot' });
        }
        continue;
      }
      // if we ever have non-project top-level (rare)
      pushNode(n, rows);
      if (i === list.length - 1) rows.push({ kind: 'addRoot' });
    }
    return rows;
  }

  function pushChildren(list: WbsNode[], rows: Row[]): void {
    for (let i = 0; i < list.length; i++) {
      pushNode(list[i], rows);
      if (list[i].children.length > 0 && !list[i].collapsed) {
        pushChildren(list[i].children, rows);
      }
      if (i === list.length - 1) {
        const parentId = list[i].id;
        const label = (depthOf(list[i]._code) === 0) ? 'Dodaj kolejną sekcję główną' : 'Dodaj kolejny element na tym poziomie';
        rows.push({
          kind: 'add',
          onClick: () => addSibling(parentId),
          label: '+ ' + label,
          bg: depthCfg(depthOf(list[i]._code)).bg,
          colspan: 8
        });
      }
    }
  }

  function pushNode(n: WbsNode, rows: Row[]): void {
    const d = depthOf(n._code);
    rows.push({ kind: 'task', node: n, depth: d, cfg: depthCfg(d) });
  }

  $: rows = buildRows($tree);

  // ── Summary / validation ──────────────────────────────────────────
  $: rw = rootWeightSum($tree);
  $: rwtd = rootWeightedSum($tree);
  $: totPct = rw > 0 ? (rwtd / rw) * 100 : 0;
  $: diff = Math.round((rw - 100) * 10) / 10;
  $: weightWarn =
    $tree.length === 0
      ? null
      : Math.abs(diff) < 0.05
      ? { text: 'Suma wag = 100% ✓', cls: 'warn-ok' }
      : diff > 0
      ? { text: `Suma wag przekracza 100% o ${diff.toFixed(1)}%`, cls: 'warn-bad' }
      : { text: `Suma wag: brakuje ${Math.abs(diff).toFixed(1)}%`, cls: 'warn-bad' };

  // ── Input handlers ────────────────────────────────────────────────
  function onWeightInput(id: number, e: Event) {
    const v = parseFloat((e.target as HTMLInputElement).value) || 0;
    setWeight(id, v);
  }
  function onDoneInput(id: number, e: Event) {
    const v = parseFloat((e.target as HTMLInputElement).value) || 0;
    setField(id, 'done', v);
  }
  function onMdInput(id: number, e: Event) {
    const v = parseFloat((e.target as HTMLInputElement).value) || 0;
    setField(id, 'md', v);
  }
  function onNameChange(id: number, e: Event) {
    setField(id, 'name', (e.target as HTMLInputElement).value);
  }
  function onRespChange(id: number, e: Event) {
    setField(id, 'resp', (e.target as HTMLSelectElement | HTMLInputElement).value);
  }
  function onPriChange(id: number, e: Event) {
    setField(id, 'priority', (e.target as HTMLSelectElement).value as Priority);
  }
  function onRagChange(id: number, e: Event) {
    setField(id, 'rag', (e.target as HTMLSelectElement).value as RAG);
  }
  function onDateChange(id: number, field: 'dateStart' | 'dateEnd', e: Event) {
    setField(id, field, (e.target as HTMLInputElement).value);
  }

  // Column toggle
  function toggleCol(name: ColName) {
    colVis.update((v) => ({ ...v, [name]: !v[name] }));
  }

  const COL_LIST: ColName[] = ['waga', 'waz', 'rag', 'md', 'start', 'end', 'pri', 'note'];
  const COL_LABELS: Record<ColName, string> = {
    waga: 'Waga',
    waz: 'Ważone',
    rag: 'RAG',
    md: 'MD',
    start: 'Start',
    end: 'Koniec',
    pri: 'Priorytet',
    note: 'Uwagi'
  };

  // Root project header helpers
  function projProgress(n: WbsNode) {
    const cw = childWeightSum(n.children);
    const cwt = childWeightedSum(n.children);
    return cw > 0.001 ? Math.round((cwt / cw) * 1000) / 10 : 0;
  }
  function projWeight(n: WbsNode) {
    return childWeightSum(n.children);
  }

  $: today = todayISO();
</script>

<!-- Weight warn bar -->
{#if weightWarn || $warnMsg}
  <div class="warn-bar {$warnMsg ? ($warnMsg.kind === 'bad' ? 'warn-bad' : 'warn-ok') : weightWarn?.cls}" style="display:block;margin:6px 14px">
    {$warnMsg?.text || weightWarn?.text}
  </div>
{/if}

<!-- Sub-toolbar for Editor: column toggle -->
<div style="display:flex;gap:8px;padding:6px 14px;background:#e8eff8;border-bottom:1px solid #c5d4e8">
  <button
    class="btn"
    on:click={() => colPanelOpen.update((v) => !v)}
    style="background:#4a7aaa;color:#fff;border-color:#3a6090"
  >
    <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
      <rect x="1" y="1" width="3" height="11" rx="1" fill="#fff" opacity=".8"/>
      <rect x="5" y="1" width="3" height="11" rx="1" fill="#fff"/>
      <rect x="9" y="1" width="3" height="11" rx="1" fill="#fff" opacity=".8"/>
    </svg>
    Kolumny
  </button>
</div>

<div class="col-panel {$colPanelOpen ? 'open' : 'shut'}">
  <div class="col-panel-inner">
    <span style="font-size:11px;font-weight:700;color:#1F3864;margin-right:4px">Pokaż kolumny:</span>
    {#each COL_LIST as c}
      <label>
        <input type="checkbox" checked={$colVis[c]} on:change={() => toggleCol(c)} />
        {COL_LABELS[c]}
      </label>
    {/each}
  </div>
</div>

<div class="tbl-wrap">
  <table class="main">
    <thead>
      <tr>
        <th style="width:80px">Kod WBS</th>
        <th>Pakiet roboczy / Opis</th>
        {#if $colVis.waga}<th style="width:72px;text-align:center">Waga (%)</th>{/if}
        <th style="width:88px">Ukończenie</th>
        {#if $colVis.waz}<th style="width:64px;text-align:center">Ważone</th>{/if}
        <th style="width:130px">Odpowiedzialny</th>
        {#if $colVis.rag}<th style="width:62px;text-align:center">RAG</th>{/if}
        {#if $colVis.md}<th style="width:56px;text-align:center">MD</th>{/if}
        {#if $colVis.start}<th style="width:92px;text-align:center">Start</th>{/if}
        {#if $colVis.end}<th style="width:92px;text-align:center">Koniec</th>{/if}
        {#if $colVis.pri}<th style="width:100px">Priorytet</th>{/if}
        {#if $colVis.note}<th style="width:36px;text-align:center">📝</th>{/if}
        <th style="width:110px">Akcje</th>
      </tr>
    </thead>
    <tbody>
      {#if $tree.length === 0}
        <tr>
          <td colspan="13" style="text-align:center;padding:48px 24px;color:#7a92ad">
            <div style="font-size:32px;opacity:.3;margin-bottom:12px">📄</div>
            <p>Brak elementów WBS.<br>Kliknij <strong>Dodaj punkt główny</strong> w toolbarze.</p>
          </td>
        </tr>
      {:else}
        {#each rows as row, rowIdx}
          {#if row.kind === 'proj'}
            {@const n = row.node}
            {@const p = projProgress(n)}
            {@const pw = projWeight(n)}
            <tr class="proj-hdr-row">
              <td colspan="13" style="padding:0">
                <div class="proj-hdr">
                  {#if row.canToggle}
                    <button class="btn-tog" on:click={() => toggleCollapse(n.id)}>{n.collapsed ? '▶' : '▼'}</button>
                  {:else}
                    <span style="display:inline-block;width:18px"></span>
                  {/if}
                  <input
                    class="proj-title-inp"
                    value={n.name}
                    placeholder="Tytuł punktu głównego..."
                    on:input={(e) => onNameChange(n.id, e)}
                  />
                  <div style="display:flex;align-items:center;gap:6px;margin-left:6px">
                    <div style="background:rgba(255,255,255,.18);border-radius:3px;height:7px;width:80px;overflow:hidden">
                      <div style="background:rgba(255,255,255,.85);height:7px;border-radius:3px;width:{Math.min(p, 100)}%"></div>
                    </div>
                    <span style="font-size:11px;font-weight:700;color:rgba(255,255,255,.9);white-space:nowrap">{p.toFixed(1)}%</span>
                    <span style="font-size:11px;color:rgba(255,255,255,.6);white-space:nowrap">waga: {pw.toFixed(1)}%</span>
                  </div>
                  <span class="proj-hdr-meta" style="margin-left:auto">{n.children.length} elem.</span>
                  <button
                    class="btn-add-child"
                    on:click={() => addChild(n.id)}
                    style="background:rgba(255,255,255,.18);color:#fff;border-color:rgba(255,255,255,.3);font-size:11px;padding:2px 8px"
                  >+ Dodaj</button>
                  <button
                    class="btn-del"
                    on:click={() => delNode(n.id)}
                    style="background:rgba(255,255,255,.08);border-color:rgba(255,255,255,.2);color:rgba(255,255,255,.7)"
                  >✕</button>
                </div>
              </td>
            </tr>
          {:else if row.kind === 'task'}
            {@const n = row.node}
            {@const cfg = row.cfg}
            {@const leaf = isLeaf(n)}
            {@const done = Math.round(nodeDonePct(n) * 10) / 10}
            {@const wtd = nodeWtd(n).toFixed(1)}
            {@const bc = barColor(done)}
            {@const bar = Math.min(done, 100)}
            {@const overdue = n.dateEnd && n.dateEnd < today && (n.done || 0) < 100}
            {@const childSum = leaf ? 0 : Math.round(childWeightSum(n.children) * 10) / 10}
            {@const over100 = childSum > 100}
            <tr style="background:{cfg.bg}">
              <td><span class="code">{n._code ?? ''}</span></td>
              <td>
                <div style="display:flex;align-items:center;gap:2px;padding-left:{cfg.ind}px">
                  {#if n.children.length > 0}
                    <button class="btn-tog" on:click={() => toggleCollapse(n.id)}>{n.collapsed ? '▶' : '▼'}</button>
                  {:else}
                    <span style="display:inline-block;width:18px"></span>
                  {/if}
                  <input
                    class="iname"
                    style="font-size:{cfg.fs};font-weight:{cfg.fw};color:{cfg.fc}"
                    value={n.name}
                    placeholder="Nazwa..."
                    on:input={(e) => onNameChange(n.id, e)}
                  />
                </div>
              </td>
              {#if $colVis.waga}
                <td>
                  {#if leaf}
                    <input class="inum" type="number" min="0" max="100" step="0.5" value={n.weight} on:input={(e) => onWeightInput(n.id, e)} />
                  {:else}
                    <div class="pw-wrap">
                      <input class="inum" type="number" min="0" max="100" step="0.5" value={n.weight} on:input={(e) => onWeightInput(n.id, e)} style="color:#0d4a8a" />
                      <span class="comp-hint {over100 ? 'over' : 'ok'}">{over100 ? '▲ ' : ''}składowe: {childSum}%</span>
                    </div>
                  {/if}
                </td>
              {/if}
              <td>
                {#if leaf}
                  <input class="inum" type="number" min="0" max="100" step="5" value={n.done} on:input={(e) => onDoneInput(n.id, e)} />
                  <div class="bar-bg"><div class="bar-fg" style="width:{bar}%;background:{bc}"></div></div>
                {:else}
                  <div style="text-align:center;font-size:11px;color:#4a6a8a;font-weight:700;padding:3px 4px 0">{done.toFixed(0)}%</div>
                  <div class="bar-bg"><div class="bar-fg" style="width:{bar}%;background:{bc}"></div></div>
                {/if}
              </td>
              {#if $colVis.waz}<td style="text-align:center"><span class="wtd">{wtd}%</span></td>{/if}
              <td>
                {#if $people.length > 0}
                  <select class="iresp" on:change={(e) => onRespChange(n.id, e)} value={n.resp}>
                    <option value="">— brak —</option>
                    {#each $people as p}
                      {@const pn = pName(p)}
                      {@const pr = pRole(p)}
                      <option value={pn}>{pn}{pr ? ` (${pr})` : ''}</option>
                    {/each}
                    {#if n.resp && !$people.some((p) => pName(p) === n.resp)}
                      <option value={n.resp}>{n.resp}</option>
                    {/if}
                  </select>
                {:else}
                  <input class="iresp-txt" value={n.resp} placeholder="Osoba..." on:input={(e) => onRespChange(n.id, e)} />
                {/if}
              </td>
              {#if $colVis.rag}
                <td style="text-align:center;padding:3px 4px">
                  <select on:change={(e) => onRagChange(n.id, e)} value={n.rag} style="font-size:10px;padding:2px 3px;border:1px solid #c5d4e8;border-radius:4px;width:68px">
                    <option value="">—</option>
                    <option value="G">🟢 Green</option>
                    <option value="A">🟡 Amber</option>
                    <option value="R">🔴 Red</option>
                  </select>
                </td>
              {/if}
              {#if $colVis.md}
                <td><input class="inum" type="number" min="0" step="0.5" value={n.md || 0} on:input={(e) => onMdInput(n.id, e)} style="text-align:center" /></td>
              {/if}
              {#if $colVis.start}
                <td><input type="date" value={n.dateStart} on:change={(e) => onDateChange(n.id, 'dateStart', e)} style="font-size:10px;padding:2px 4px;border:1px solid #c5d4e8;border-radius:4px;width:88px" /></td>
              {/if}
              {#if $colVis.end}
                <td>
                  <input
                    type="date"
                    value={n.dateEnd}
                    on:change={(e) => onDateChange(n.id, 'dateEnd', e)}
                    class={overdue ? 'date-over' : ''}
                    style="font-size:10px;padding:2px 4px;border:1px solid #c5d4e8;border-radius:4px;width:88px"
                  />
                </td>
              {/if}
              {#if $colVis.pri}
                <td style="padding:4px 6px">
                  <select value={n.priority} on:change={(e) => onPriChange(n.id, e)} style="font-size:11px;padding:4px 6px;border:1px solid #c5d4e8;border-radius:4px;width:100%">
                    {#each PRIORITIES as p}
                      <option value={p}>{p || '— brak —'}</option>
                    {/each}
                  </select>
                </td>
              {/if}
              {#if $colVis.note}
                <td style="text-align:center;padding:3px">
                  <span class="note-icon" title={n.note || 'Notatka'}>📋</span>
                </td>
              {/if}
              <td>
                <div class="row-actions">
                  <button class="btn-add-child" on:click={() => addChild(n.id)}>+ Dodaj podpunkt</button>
                  <button class="btn-del" on:click={() => delNode(n.id)}>✕</button>
                </div>
              </td>
            </tr>
          {:else if row.kind === 'add'}
            <tr class="add-row" style="background:{row.bg}">
              <td colspan={row.colspan}>
                <div class="add-inline" on:click={row.onClick} on:keydown={(e) => e.key === 'Enter' && row.onClick()} role="button" tabindex="0">{row.label}</div>
              </td>
            </tr>
          {:else if row.kind === 'addRoot'}
            <tr style="background:#253a5a">
              <td colspan="13">
                <div class="add-inline" on:click={addRoot} on:keydown={(e) => e.key === 'Enter' && addRoot()} role="button" tabindex="0" style="color:rgba(255,255,255,.55)">+ Dodaj kolejny punkt główny</div>
              </td>
            </tr>
          {/if}
        {/each}
      {/if}
    </tbody>
    {#if $tree.length > 0}
      <tfoot>
        <tr>
          <td colspan="2" style="text-align:right">Suma wag sekcji głównych (= 100%):</td>
          <td style="text-align:center">{rw.toFixed(1)}%</td>
          <td></td>
          <td style="text-align:center">{rwtd.toFixed(1)}%</td>
          <td colspan="8"></td>
        </tr>
      </tfoot>
    {/if}
  </table>
</div>

