<script lang="ts">
  import { onDestroy } from 'svelte';
  import { Topbar, ProjectHeader, Toolbar, TabBar, StatusBar } from './components';
  import AuthGate from './components/AuthGate.svelte';
  import { VIEWS } from './views';
  import { activeTab, auth } from './lib/state';
  import { currentProject } from './lib/state/currentProject';
  import { acceptAllPendingOrganizationInvitations } from './lib/cloud/admin';
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

    <svelte:component this={VIEWS[$activeTab]} />

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

  @media (max-width: 520px) {
    .app-boot {
      padding: 14px;
    }

    .app-boot-card {
      padding: 22px 18px;
      border-radius: 24px;
    }
  }
</style>
