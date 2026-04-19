<script lang="ts">
  import type { TabName } from '../lib/types';
  import { activeTab } from '../lib/state/ui';

  const tabs: Array<{ id: TabName; label: string; done: boolean }> = [
    { id: 'dash',     label: 'Dashboard',       done: true },
    { id: 'table',    label: 'Edytor WBS',      done: true },
    { id: 'rank',     label: 'Zadania',         done: true },
    { id: 'team',     label: 'Zespół',          done: true },
    { id: 'gantt',    label: 'Harmonogram',     done: true },
    { id: 'personal', label: 'Personal Plan',   done: true },
    { id: 'wlreport', label: 'Raport godzin',   done: true },
    { id: 'orders',   label: 'Zamówienia',      done: true },
    { id: 'risk',     label: 'Ryzyka',          done: true },
    { id: 'report',   label: 'Raport',          done: true },
    { id: 'chart',    label: 'Drzewo',          done: true },
    { id: 'wfall',    label: 'Waterfall wag',   done: true },
    { id: 'log',      label: 'Dziennik',        done: true }
  ];
</script>

<div class="view-tabs">
  {#each tabs as tab}
    <button
      class="view-tab"
      class:active={$activeTab === tab.id}
      on:click={() => activeTab.set(tab.id)}
      title={tab.done ? 'Zmigrowany' : 'Nie zmigrowany — widok stub'}
    >
      {tab.label}
    </button>
  {/each}
</div>
