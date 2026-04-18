<script lang="ts">
  /**
   * WBS editor — kompozycja. Logika CRUD żyje w store'ach, wiersze w
   * dedykowanych komponentach. Ten widok ogranicza się do:
   *  1) budowy płaskiej listy wierszy (kolejność + typ),
   *  2) renderowania tabeli z nagłówkiem i stopką,
   *  3) wpinania komponentów WbsProjectRow / WbsTaskRow / WbsAddRow.
   */
  import { tree, addRoot, addSibling } from '../lib/state/tree';
  import { colVis } from '../lib/state/ui';
  import { assignCodes, depthCfg, depthOf, rootWeightSum, rootWeightedSum } from '../lib/utils/wbs';
  import { WbsWarnBar, WbsColumnPanel, WbsProjectRow, WbsTaskRow, WbsAddRow } from '../components/editor';
  import type { WbsNode } from '../lib/types';

  $: ($tree, assignCodes($tree));

  type Row =
    | { kind: 'proj';    node: WbsNode }
    | { kind: 'task';    node: WbsNode }
    | { kind: 'add';     onClick: () => void; label: string; bg: string }
    | { kind: 'addRoot'; onClick: () => void; label: string };

  function buildRows(list: WbsNode[]): Row[] {
    const rows: Row[] = [];
    for (let i = 0; i < list.length; i++) {
      const n = list[i];
      if (n.isProject) {
        rows.push({ kind: 'proj', node: n });
        if (!n.collapsed) pushChildren(n.children, rows);
        if (i === list.length - 1) {
          rows.push({ kind: 'addRoot', onClick: addRoot, label: '+ Dodaj kolejny punkt główny' });
        }
        continue;
      }
      rows.push({ kind: 'task', node: n });
      if (i === list.length - 1) {
        rows.push({ kind: 'addRoot', onClick: addRoot, label: '+ Dodaj kolejny punkt główny' });
      }
    }
    return rows;
  }

  function pushChildren(list: WbsNode[], rows: Row[]): void {
    for (let i = 0; i < list.length; i++) {
      rows.push({ kind: 'task', node: list[i] });
      if (list[i].children.length > 0 && !list[i].collapsed) {
        pushChildren(list[i].children, rows);
      }
      if (i === list.length - 1) {
        const parentId = list[i].id;
        const labelBase = depthOf(list[i]._code) === 0
          ? 'Dodaj kolejną sekcję główną'
          : 'Dodaj kolejny element na tym poziomie';
        rows.push({
          kind: 'add',
          onClick: () => addSibling(parentId),
          label: '+ ' + labelBase,
          bg: depthCfg(depthOf(list[i]._code)).bg
        });
      }
    }
  }

  $: rows = buildRows($tree);
  $: rw = rootWeightSum($tree);
  $: rwtd = rootWeightedSum($tree);
</script>

<WbsWarnBar />
<WbsColumnPanel />

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
          <td colspan="13" style="text-align:center;padding:48px 24px;color:var(--text-muted)">
            <div style="font-size:32px;opacity:.3;margin-bottom:12px">📄</div>
            <p>Brak elementów WBS.<br>Kliknij <strong>Dodaj punkt główny</strong> w toolbarze.</p>
          </td>
        </tr>
      {:else}
        {#each rows as row}
          {#if row.kind === 'proj'}
            <WbsProjectRow node={row.node} />
          {:else if row.kind === 'task'}
            <WbsTaskRow node={row.node} />
          {:else if row.kind === 'add'}
            <WbsAddRow onClick={row.onClick} label={row.label} bg={row.bg} colspan={13} />
          {:else if row.kind === 'addRoot'}
            <WbsAddRow onClick={row.onClick} label={row.label} colspan={13} variant="root" />
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
