<script lang="ts">
  import { tree } from '../lib/state/tree';
  import { changelog } from '../lib/state/changelog';
  import { collectLeaves } from '../lib/utils/wbs';
  import { theme } from '../lib/state/theme';
  import { onMount } from 'svelte';

  $: leavesCount = collectLeaves($tree).length;
  $: lastChange = $changelog[0]?.ts || null;

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
  <div class="sb-cell">Zadania: <strong>{leavesCount}</strong></div>
  <div class="sb-sep"></div>
  <div class="sb-cell">
    {#if lastChange}
      Ostatnia zmiana: <strong>{lastChange}</strong>
    {:else}
      Brak zmian
    {/if}
  </div>
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
</style>
