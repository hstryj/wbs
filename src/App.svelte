<script lang="ts">
  import { onDestroy } from 'svelte';
  import type { ComponentType } from 'svelte';
  import { Topbar, ProjectHeader, Toolbar, TabBar, StatusBar } from './components';
  import AuthGate from './components/AuthGate.svelte';
  import { loadView } from './views';
  import { activeTab, auth } from './lib/state';
  import type { TabName } from './lib/types';
  import { currentProject } from './lib/state/currentProject';
  import { acceptAllPendingOrganizationInvitations } from './lib/cloud/admin';
  import { autoOpenProject, startCloudSync, stopCloudSync } from './lib/cloud/sync';

  let currentUserId: string | null = null;
  let activeView: ComponentType | null = null;
  let activeViewLoading = true;
  let activeViewError: string | null = null;
  let viewLoadSeq = 0;

  /* Obserwuj zmiany auth. Przy zalogowaniu → otwórz projekt + start sync.
     Przy wylogowaniu → zatrzymaj sync (dane zostają w localStorage). */
  const unsubAuth = auth.subscribe(async ($a) => {
    const newId = $a.user?.id ?? null;
    if (newId === currentUserId) return;
    currentUserId = newId;

    if ($a.user) {
      // Świeżo zalogowany — otwórz lub stwórz projekt
      try {
        const orgInvites = await acceptAllPendingOrganizationInvitations();
        if (orgInvites.error) {
          console.warn('[cloud] organization invites auto-accept skipped:', orgInvites.error);
        } else if (orgInvites.accepted > 0) {
          console.log('[cloud] accepted organization invitations:', orgInvites.accepted);
        }
        console.log('[cloud] auth change → autoOpenProject for', $a.user.email);
        const res = await autoOpenProject($a.user.email || 'user');
        if (res.error) {
          console.error('[cloud] autoOpenProject error:', res.error);
        } else if (res.projectId) {
          console.log('[cloud] project ready:', res.projectId, '→ startCloudSync');
          startCloudSync(res.projectId);
        }
      } catch (err) {
        console.error('[cloud] auto-open threw:', err);
        currentProject.update((s) => ({ ...s, status: 'error', error: String(err) }));
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

  async function syncActiveView(tabName: TabName) {
    const seq = ++viewLoadSeq;
    activeViewError = null;
    if (!activeView) {
      activeViewLoading = true;
    }

    try {
      const nextView = await loadView(tabName);
      if (seq !== viewLoadSeq) return;
      activeView = nextView;
    } catch (err) {
      if (seq !== viewLoadSeq) return;
      activeViewError = err instanceof Error ? err.message : String(err);
    } finally {
      if (seq === viewLoadSeq) {
        activeViewLoading = false;
      }
    }
  }

  $: void syncActiveView($activeTab);
</script>

{#if $auth.configured && $auth.loading}
  <section class="app-boot">
    <div class="app-boot-card">
      <span class="app-boot-eyebrow">WBS Workspace</span>
      <strong>Ładowanie sesji…</strong>
      <p>Sprawdzamy dostęp do projektu i przygotowujemy dane.</p>
    </div>
  </section>
{:else if $auth.configured && !$auth.user}
  <AuthGate />
{:else}
  <div class="wrap">
    <Topbar />
    <ProjectHeader />
    <Toolbar />
    <TabBar />

    {#if activeView}
      <svelte:component this={activeView} />
    {:else if activeViewError}
      <section class="app-view-state app-view-state-error">
        <div class="app-view-state-card">
          <span class="app-boot-eyebrow">WBS Workspace</span>
          <strong>Nie udało się załadować widoku</strong>
          <p>{activeViewError}</p>
        </div>
      </section>
    {:else if activeViewLoading}
      <section class="app-view-state">
        <div class="app-view-state-card">
          <span class="app-boot-eyebrow">WBS Workspace</span>
          <strong>Ładowanie widoku…</strong>
          <p>Przygotowujemy aktywną zakładkę bez dociągania całej aplikacji na start.</p>
        </div>
      </section>
    {/if}

    <StatusBar />
  </div>
{/if}

<style>
  .app-boot {
    min-height: 100vh;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 24px;
    background:
      radial-gradient(circle at top left, rgba(46, 117, 182, 0.22), transparent 34%),
      linear-gradient(180deg, #f3f8fc 0%, #e8f0f8 100%);
  }

  .app-boot-card {
    width: min(420px, 100%);
    display: flex;
    flex-direction: column;
    gap: 8px;
    padding: 28px;
    border-radius: 28px;
    background: rgba(255, 255, 255, 0.96);
    border: 1px solid rgba(20, 53, 95, 0.08);
    box-shadow: 0 22px 40px rgba(15, 23, 42, 0.1);
    color: var(--text-primary);
  }

  .app-boot-eyebrow {
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    color: var(--text-muted);
  }

  .app-boot-card strong {
    font-size: 28px;
    line-height: 1;
    letter-spacing: -0.04em;
    color: #12345d;
  }

  .app-boot-card p {
    margin: 0;
    font-size: 14px;
    line-height: 1.5;
    color: var(--text-secondary);
  }

  .app-view-state {
    padding: 18px;
  }

  .app-view-state-card {
    display: flex;
    flex-direction: column;
    gap: 8px;
    padding: 20px 22px;
    border-radius: 28px;
    background: rgba(255, 255, 255, 0.92);
    border: 1px solid rgba(20, 53, 95, 0.08);
    box-shadow: 0 16px 32px rgba(15, 23, 42, 0.06);
  }

  .app-view-state-card strong {
    font-size: 22px;
    line-height: 1.05;
    letter-spacing: -0.04em;
    color: #12345d;
  }

  .app-view-state-card p {
    margin: 0;
    font-size: 14px;
    line-height: 1.5;
    color: var(--text-secondary);
  }

  .app-view-state-error .app-view-state-card {
    border-color: rgba(220, 38, 38, 0.16);
    background: linear-gradient(180deg, rgba(255, 247, 247, 0.96) 0%, rgba(255, 255, 255, 0.98) 100%);
  }

  @media (max-width: 520px) {
    .app-boot {
      padding: 14px;
    }

    .app-boot-card,
    .app-view-state-card {
      padding: 22px 18px;
      border-radius: 24px;
    }

    .app-view-state {
      padding: 14px;
    }
  }
</style>
