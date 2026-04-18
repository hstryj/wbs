<script lang="ts">
  import type { TabName } from '../lib/types';
  import { activeTab } from '../lib/state/ui';

  const tabs: Array<{ id: TabName; label: string; done: boolean }> = [
    { id: 'table',    label: '📋 Edytor WBS',   done: true  },
    { id: 'dash',     label: '📊 Dashboard',    done: true  },
    { id: 'chart',    label: '🌳 Drzewo',        done: true  },
    { id: 'wfall',    label: '📉 Waterfall wag', done: true  },
    { id: 'team',     label: '👥 Zespół',        done: true  },
    { id: 'rank',     label: '🎯 Ranking',       done: true  },
    { id: 'gantt',    label: '📅 Gantt',         done: true  },
    { id: 'risk',     label: '⚠️ Ryzyka',        done: true  },
    { id: 'report',   label: '📄 Raport',        done: false },
    { id: 'log',      label: '🕐 Dziennik',      done: true  },
    { id: 'wlreport', label: '⏱ Raport godzin',  done: false },
    { id: 'orders',   label: '🛒 Zamówienia',    done: false }
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
      {#if !tab.done}<span style="font-size:9px;opacity:.5;margin-left:4px">WIP</span>{/if}
    </button>
  {/each}
</div>
