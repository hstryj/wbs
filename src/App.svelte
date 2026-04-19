<script lang="ts">
  import { onDestroy } from 'svelte';
  import { Topbar, ProjectHeader, Toolbar, TabBar, StatusBar } from './components';
  import { VIEWS } from './views';
  import { activeTab, auth } from './lib/state';
  import { currentProject } from './lib/state/currentProject';
  import { autoOpenProject, startCloudSync, stopCloudSync } from './lib/cloud/sync';

  let currentUserId: string | null = null;

  /* Obserwuj zmiany auth. Przy zalogowaniu → otwórz projekt + start sync.
     Przy wylogowaniu → zatrzymaj sync (dane zostają w localStorage). */
  const unsubAuth = auth.subscribe(async ($a) => {
    const newId = $a.user?.id ?? null;
    if (newId === currentUserId) return;
    currentUserId = newId;

    if ($a.user) {
      // Świeżo zalogowany — otwórz lub stwórz projekt
      const res = await autoOpenProject($a.user.email || 'user');
      if (res.projectId) {
        startCloudSync(res.projectId);
      }
    } else {
      // Wylogowany — stop sync, zresetuj currentProject
      stopCloudSync();
      currentProject.set({
        id: null,
        name: '',
        status: 'idle',
        error: null,
        lastSyncedAt: null
      });
    }
  });

  onDestroy(() => {
    unsubAuth();
    stopCloudSync();
  });
</script>

<div class="wrap">
  <Topbar />
  <ProjectHeader />
  <Toolbar />
  <TabBar />

  <svelte:component this={VIEWS[$activeTab]} />

  <StatusBar />
</div>
