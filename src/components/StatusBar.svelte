<script lang="ts">
  import { tree } from '../lib/state/tree';
  import { changelog } from '../lib/state/changelog';
  import { collectLeaves } from '../lib/utils/wbs';
  import { theme } from '../lib/state/theme';
  import { currentProject } from '../lib/state/currentProject';
  import { flushCloudSync } from '../lib/cloud/sync';
  import { onMount } from 'svelte';

  $: leavesCount = collectLeaves($tree).length;
  $: lastChange = $changelog[0]?.ts || null;
  $: syncLabel = (() => {
    if (!$currentProject.id) return null;
    switch ($currentProject.status) {
      case 'loading': return 'Ładowanie…';
      case 'queued':  return 'Oczekuje zapisu';
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
    await flushCloudSync();
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
      <span class="sb-dot" class:sb-dot-online={$currentProject.status === 'synced'} class:sb-dot-saving={$currentProject.status === 'saving' || $currentProject.status === 'loading' || $currentProject.status === 'queued'} class:sb-dot-err={$currentProject.status === 'error'}></span>
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
    background:
      linear-gradient(180deg, rgba(248, 251, 254, 0.98) 0%, rgba(238, 244, 250, 0.98) 100%);
    border: 1px solid rgba(20, 53, 95, 0.14);
    border-top: none;
    border-radius: 0 0 14px 14px;
    font-size: 11px;
    color: #607189;
    min-height: 34px;
    font-variant-numeric: tabular-nums;
    box-shadow:
      0 14px 28px rgba(15, 23, 42, 0.05),
      inset 0 1px 0 rgba(255, 255, 255, 0.9);
  }
  .sb-cell {
    padding: 6px 12px;
    display: flex;
    align-items: center;
    gap: 4px;
    white-space: nowrap;
  }
  .sb-cell strong {
    color: #22395d;
    font-weight: 600;
  }
  .sb-muted {
    color: #7a8ba5;
  }
  .sb-sep {
    width: 1px;
    height: 14px;
    background: rgba(20, 53, 95, 0.14);
  }
  .sb-right {
    margin-left: auto;
  }
  .sb-dot {
    width: 7px;
    height: 7px;
    border-radius: 50%;
    margin-right: 2px;
    box-shadow: 0 0 0 3px rgba(255, 255, 255, 0.72);
  }
  .sb-dot-online { background: var(--color-success); }
  .sb-dot-offline { background: var(--text-muted); }
  .sb-dot-saving { background: var(--brand-primary); animation: sb-pulse 1s ease-in-out infinite; }
  .sb-dot-err { background: var(--color-danger); }
  @keyframes sb-pulse { 50% { opacity: .4; } }

  .sb-sync {
    background: rgba(255, 255, 255, 0.74);
    border: 1px solid rgba(20, 53, 95, 0.1);
    border-radius: 999px;
    color: #4f6280;
    font-family: inherit;
    font-size: 11px;
    padding: 5px 12px;
    display: flex;
    align-items: center;
    gap: 4px;
    cursor: pointer;
    white-space: nowrap;
    transition: background .16s ease, color .16s ease, border-color .16s ease, box-shadow .16s ease;
  }
  .sb-sync:hover {
    color: #1d4d8c;
    background: rgba(231, 240, 249, 0.96);
    border-color: rgba(46, 117, 182, 0.18);
    box-shadow: 0 8px 18px rgba(31, 56, 100, 0.08);
  }
  .sb-sync-err {
    color: var(--color-danger);
    border-color: rgba(220, 38, 38, 0.18);
    background: rgba(254, 242, 242, 0.94);
  }

  @media (max-width: 900px) {
    .status-bar {
      border-radius: 0;
      box-shadow: none;
    }

    .sb-sync {
      background: transparent;
      border: none;
      border-radius: 0;
      padding: 4px 12px;
      box-shadow: none;
    }
  }
</style>
