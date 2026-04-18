<script lang="ts">
  import Topbar from './components/Topbar.svelte';
  import Toolbar from './components/Toolbar.svelte';
  import TabBar from './components/TabBar.svelte';
  import { activeTab } from './lib/state/ui';

  import DashboardView from './views/DashboardView.svelte';
  import RankingView from './views/RankingView.svelte';
  import RisksView from './views/RisksView.svelte';
  import ChangelogView from './views/ChangelogView.svelte';
  import TreeView from './views/TreeView.svelte';
  import WaterfallView from './views/WaterfallView.svelte';
  import GanttView from './views/GanttView.svelte';
  import StubView from './views/StubView.svelte';
</script>

<div class="wrap">
  <Topbar />
  <Toolbar />
  <TabBar />

  {#if $activeTab === 'dash'}
    <DashboardView />
  {:else if $activeTab === 'rank'}
    <RankingView />
  {:else if $activeTab === 'risk'}
    <RisksView />
  {:else if $activeTab === 'log'}
    <ChangelogView />
  {:else if $activeTab === 'chart'}
    <TreeView />
  {:else if $activeTab === 'wfall'}
    <WaterfallView />
  {:else if $activeTab === 'gantt'}
    <GanttView />
  {:else if $activeTab === 'table'}
    <StubView name="Edytor WBS" description="Tabela hierarchiczna z zadaniami, wagami, terminami. Najbardziej złożony widok — migracja w następnym etapie." />
  {:else if $activeTab === 'team'}
    <StubView name="Widok zespołu" description="Karty pracowników z ich zadaniami i godzinami. Wymaga modali Harmonogram/Dokumenty." />
  {:else if $activeTab === 'report'}
    <StubView name="Raport" description="Generowanie raportu PDF z podsumowaniem projektu." />
  {:else if $activeTab === 'wlreport'}
    <StubView name="Raport godzin" description="Czas pracy per zadanie WBS, per pracownik/grupa. 4 sub-taby." />
  {:else if $activeTab === 'orders'}
    <StubView name="Zamówienia" description="Listy materiałowe (BOM) + baza materiałów. Sub-taby." />
  {/if}
</div>
