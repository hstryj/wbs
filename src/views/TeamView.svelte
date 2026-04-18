<script lang="ts">
  import { tree } from '../lib/state/tree';
  import { people, pName, pRole, initials } from '../lib/state/people';
  import { assignCodes, collectLeaves, barColor } from '../lib/utils/wbs';
  import { PRIORITY_COLOR, PRIORITY_DOT } from '../lib/utils/priority';
  import { todayISO, isOverdue } from '../lib/utils/dates';
  import type { WbsNode, Person } from '../lib/types';

  $: ($tree, assignCodes($tree));
  $: leaves = collectLeaves($tree);
  $: today = todayISO();

  type PersonKey = string;
  type GroupEntry = { key: PersonKey; person: Person | null; tasks: WbsNode[] };

  $: groups = buildGroups($people, leaves);

  function buildGroups(pp: Person[], ls: WbsNode[]): GroupEntry[] {
    const map = new Map<PersonKey, GroupEntry>();
    pp.forEach((p) => {
      const k = pName(p);
      if (!k) return;
      map.set(k, { key: k, person: p, tasks: [] });
    });
    ls.forEach((n) => {
      if (!n.resp) return;
      if (!map.has(n.resp)) {
        map.set(n.resp, { key: n.resp, person: null, tasks: [] });
      }
      map.get(n.resp)!.tasks.push(n);
    });
    return [...map.values()];
  }

  function avatarColor(entry: GroupEntry): string {
    if (entry.person && (entry.person as Person).color) return (entry.person as Person).color!;
    // deterministic color by name
    const s = entry.key;
    let hash = 0;
    for (let i = 0; i < s.length; i++) hash = (hash * 31 + s.charCodeAt(i)) | 0;
    const palette = ['#2E75B6', '#3B7A1E', '#ED7D31', '#6a3daa', '#c0392b', '#7a4000', '#1F3864'];
    return palette[Math.abs(hash) % palette.length];
  }

  function personProgress(tasks: WbsNode[]): { avg: number; totalW: number } {
    const totalW = tasks.reduce((a, n) => a + (n.weight || 0), 0);
    const wtdSum = tasks.reduce((a, n) => a + ((n.weight || 0) * (n.done || 0)) / 100, 0);
    const avg = totalW > 0 ? Math.round((wtdSum / totalW) * 100) : 0;
    return { avg, totalW };
  }
</script>

<div class="inner-pane">
  {#if !$people.length && !leaves.some((n) => n.resp)}
    <div style="color:#7a92ad;font-style:italic;font-size:13px;padding:40px 0;text-align:center">
      Brak zdefiniowanego zespołu. Dodaj osoby przez panel Zespół w legacy (<a href="/legacy/index.html" style="color:#2E75B6">otwórz monolit</a>)
      lub przypisz osobę do zadania w Edytorze WBS.
    </div>
  {:else}
    <div class="team-grid">
      {#each groups as g}
        {@const col = avatarColor(g)}
        {@const prog = personProgress(g.tasks)}
        {@const bc = barColor(prog.avg)}
        <div class="team-card">
          <div class="tc-hdr">
            <div class="tc-av" style="background:{col}">{initials(g.key)}</div>
            <div>
              <div class="tc-name">{g.key}</div>
              <div class="tc-meta">
                {#if g.person && pRole(g.person)}{pRole(g.person)} • {/if}
                {g.tasks.length} zad. | waga: {prog.totalW.toFixed(1)}%
              </div>
            </div>
          </div>

          {#if g.tasks.length}
            <ul class="tc-tasks">
              {#each g.tasks.slice(0, 8) as n}
                {@const p = n.done || 0}
                {@const tc = p >= 100 ? '#3B7A1E' : p > 0 ? '#2E75B6' : '#ED7D31'}
                {@const over = isOverdue(n.dateEnd, p)}
                <li class="tc-task">
                  <span class="tc-code">{n._code ?? ''}</span>
                  <span class="tc-nm" title={n.name}>{n.name || '–'}</span>
                  {#if n.priority}
                    <span title={n.priority} style="color:{PRIORITY_COLOR[n.priority]};font-size:10px">{PRIORITY_DOT[n.priority]}</span>
                  {/if}
                  {#if n.md}<span style="font-size:9px;color:#7a92ad">{n.md}md</span>{/if}
                  {#if n.dateEnd}
                    <span style="font-size:9px;color:{over ? '#c0392b' : '#7a92ad'}">{over ? '⚠ ' : ''}{n.dateEnd}</span>
                  {/if}
                  <span class="tc-pct" style="color:{tc}">{p}%</span>
                </li>
              {/each}
              {#if g.tasks.length > 8}
                <li class="tc-task" style="color:#7a92ad;font-style:italic;font-size:10px">
                  <span></span><span>…i {g.tasks.length - 8} więcej</span>
                </li>
              {/if}
            </ul>
          {:else}
            <div style="color:#aab;font-size:11px;font-style:italic;padding:4px 0">Brak zadań.</div>
          {/if}

          <div class="tc-foot">
            <div style="display:flex;justify-content:space-between;font-size:11px">
              <span style="color:#5a7aaa;font-weight:600">Zaawansowanie</span>
              <span style="font-weight:700;color:{bc}">{prog.avg}%</span>
            </div>
            <div class="tc-bar-bg"><div class="tc-bar-fg" style="width:{Math.min(prog.avg, 100)}%;background:{bc}"></div></div>
          </div>
        </div>
      {/each}
    </div>
  {/if}
</div>
