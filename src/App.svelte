<script lang="ts">
  import { Topbar, ProjectHeader, Toolbar, TabBar, StatusBar } from './components';
  import { VIEWS } from './views';
  import { activeTab } from './lib/state';
</script>

<div class="wrap">
  <Topbar />
  <ProjectHeader />
  <Toolbar />
  <TabBar />

  <svelte:component this={VIEWS[$activeTab]} />

  <StatusBar />
</div>
