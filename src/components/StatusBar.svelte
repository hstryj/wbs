<script lang="ts">
  import { tree } from '../lib/state/tree';
  import { changelog } from '../lib/state/changelog';
  import { collectLeaves } from '../lib/utils/wbs';
  import { theme } from '../lib/state/theme';
  import { currentProject } from '../lib/state/currentProject';
  import { pushToCloud } from '../lib/cloud/sync';
  import { onMount } from 'svelte';

  $: leavesCount = collectLeaves($tree).length;
  $: lastChange = $changelog[0]?.ts || null;
  $: syncLabel = (() => {
    if (!$currentProject.id) return null;
    switch ($currentProject.status) {
      case 'loading': return 'Ładowanie…';
      case 'saving':  return 'Zapisywanie…';
      case 'synced':  return $currentProject.lastSyncedAt
        ? 'Zsync. ' + $currentProject.lastSyncedAt.toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' })
        : 'Zsynchronizowane';
      case 'error':   return 'Błąd sync';
      default:        return 'Oczekuje';
    }
  })();

  async function forceSync() {
    if (!$currentProject.id) return;
    await pushToCloud($currentProject.id);
  }

  let online = typeof navigator !== 'undefined' ? navigator.onLine : true;
  let now = '';

  onMount(() => {
    const tick = () => {
      const d = new Date();
      now = d.toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' });
    };
    tick();
    const i = setInterval(tick, 30_000);
    const on = () => (online = true);
    const off = () => (online = false);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    return () => {
      clearInterval(i);
      window.removeEventListener('online', on);
      window.removeEventListener('offline', off);
    };
  });
</script>

<div class="status-bar">
  <div class="sb-cell">
    <span class="sb-dot" class:sb-dot-online={online} class:sb-dot-offline={!online}></span>
    {online ? 'Online' : 'Offline'}
  </div>
  <div class="sb-sep"></div>
  <div class="sb-cell">
    {$currentProject.id ? 'Cloud' : 'Tryb lokalny'}
  </div>
  <div class="sb-sep"></div>
  <div class="sb-cell">Zadania: <strong>{leavesCount}</strong></div>
  <div class="sb-sep"></div>
  <div class="sb-cell">
    {#if lastChange}
      Ostatnia zmiana: <strong>{lastChange}</strong>
    {:else}
      Brak zmian
    {/if}
  </div>
  {#if syncLabel}
    <div class="sb-sep"></div>
    <button class="sb-sync" class:sb-sync-err={$currentProject.status === 'error'} on:click={forceSync} title={$currentProject.name + ($currentProject.error ? ' — ' + $currentProject.error : '')}>
      <span class="sb-dot" class:sb-dot-online={$currentProject.status === 'synced'} class:sb-dot-saving={$currentProject.status === 'saving' || $currentProject.status === 'loading'} class:sb-dot-err={$currentProject.status === 'error'}></span>
      ☁ {syncLabel}
    </button>
  {/if}
  <div class="sb-cell sb-right">
    <span class="sb-muted">Motyw:</span> {$theme === 'dark' ? 'ciemny' : 'jasny'}
    <span class="sb-sep"></span>
    {now}
  </div>
</div>

<style>
  .status-bar {
    display: flex;
    align-items: center;
    gap: 0;
    padding: 0 14px;
    background: var(--bg-muted);
    border: 1px solid var(--border);
    border-top: none;
    border-radius: 0 0 4px 4px;
    font-size: 11px;
    color: var(--text-secondary);
    min-height: 28px;
    font-variant-numeric: tabular-nums;
  }
  .sb-cell {
    padding: 4px 12px;
    display: flex;
    align-items: center;
    gap: 4px;
    white-space: nowrap;
  }
  .sb-cell strong {
    color: var(--text-primary);
    font-weight: 600;
  }
  .sb-muted {
    color: var(--text-muted);
  }
  .sb-sep {
    width: 1px;
    height: 14px;
    background: var(--border);
  }
  .sb-right {
    margin-left: auto;
  }
  .sb-dot {
    width: 7px;
    height: 7px;
    border-radius: 50%;
    margin-right: 2px;
  }
  .sb-dot-online { background: var(--color-success); }
  .sb-dot-offline { background: var(--text-muted); }
  .sb-dot-saving { background: var(--brand-primary); animation: sb-pulse 1s ease-in-out infinite; }
  .sb-dot-err { background: var(--color-danger); }
  @keyframes sb-pulse { 50% { opacity: .4; } }

  .sb-sync {
    background: transparent;
    border: none;
    color: var(--text-secondary);
    font-family: inherit;
    font-size: 11px;
    padding: 4px 12px;
    display: flex;
    align-items: center;
    gap: 4px;
    cursor: pointer;
    white-space: nowrap;
  }
  .sb-sync:hover { color: var(--text-primary); background: var(--bg-subtle); }
  .sb-sync-err { color: var(--color-danger); }
</style>
