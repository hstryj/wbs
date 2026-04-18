<script lang="ts">
  import Topbar from './components/Topbar.svelte';
  import ProjectHeader from './components/ProjectHeader.svelte';
  import Toolbar from './components/Toolbar.svelte';
  import TabBar from './components/TabBar.svelte';
  import StatusBar from './components/StatusBar.svelte';
  import { activeTab } from './lib/state/ui';

  import DashboardView from './views/DashboardView.svelte';
  import RankingView from './views/RankingView.svelte';
  import RisksView from './views/RisksView.svelte';
  import ChangelogView from './views/ChangelogView.svelte';
  import TreeView from './views/TreeView.svelte';
  import WaterfallView from './views/WaterfallView.svelte';
  import GanttView from './views/GanttView.svelte';
  import WbsEditorView from './views/WbsEditorView.svelte';
  import TeamView from './views/TeamView.svelte';
  import WorklogReportView from './views/WorklogReportView.svelte';
  import OrdersView from './views/OrdersView.svelte';
  import ReportView from './views/ReportView.svelte';
</script>

<div class="wrap">
  <Topbar />
  <ProjectHeader />
  <Toolbar />
  <TabBar />

  {#if $activeTab === 'table'}
    <WbsEditorView />
  {:else if $activeTab === 'dash'}
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
  {:else if $activeTab === 'team'}
    <TeamView />
  {:else if $activeTab === 'report'}
    <ReportView />
  {:else if $activeTab === 'wlreport'}
    <WorklogReportView />
  {:else if $activeTab === 'orders'}
    <OrdersView />
  {/if}

  <StatusBar />
</div>
