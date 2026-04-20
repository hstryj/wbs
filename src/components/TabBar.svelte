<script lang="ts">
  import type { TabName } from '../lib/types';
  import { activeTab } from '../lib/state/ui';
  import { auth } from '../lib/state/auth';
  import { createEventDispatcher } from 'svelte';

  const baseTabs: Array<{ id: TabName; label: string; done: boolean }> = [
    { id: 'dash',     label: 'Dashboard',       done: true },
    { id: 'table',    label: 'Edytor WBS',      done: true },
    { id: 'rank',     label: 'Zadania',         done: true },
    { id: 'team',     label: 'Zespół',          done: true },
    { id: 'gantt',    label: 'Harmonogram',     done: true },
    { id: 'personal', label: 'Personal Plan',   done: true },
    { id: 'wlreport', label: 'Raport godzin',   done: true },
    { id: 'orders',   label: 'Zamówienia',      done: true },
    { id: 'risk',     label: 'Ryzyka',          done: true },
    { id: 'report',   label: 'Raport',          done: true },
    { id: 'chart',    label: 'Drzewo',          done: true },
    { id: 'wfall',    label: 'Waterfall wag',   done: true },
    { id: 'log',      label: 'Dziennik',        done: true }
  ];

  const adminTab = { id: 'admin' as TabName, label: 'Admin', done: true };

  const dispatch = createEventDispatcher();

  let menuOpen = false;
  let tabs = baseTabs;

  $: tabs = $auth.configured
    ? baseTabs.flatMap((tab) => (tab.id === 'team' ? [tab, adminTab] : [tab]))
    : baseTabs;
  $: if (!$auth.configured && $activeTab === 'admin') {
    activeTab.set('table');
  }

  $: active = tabs.find((tab) => tab.id === $activeTab) ?? tabs[0];

  function selectTab(id: TabName) {
    activeTab.set(id);
    menuOpen = false;
    dispatch('select', { id });
  }

  function tabMark(label: string) {
    return label
      .split(/\s+/)
      .map((part) => part[0] ?? '')
      .join('')
      .slice(0, 2)
      .toUpperCase();
  }
</script>

<div class="view-tabs desktop-tabs">
  {#each tabs as tab}
    <button
      type="button"
      class="view-tab"
      class:active={$activeTab === tab.id}
      class:admin-tab={tab.id === 'admin'}
      on:click={() => selectTab(tab.id)}
      title={tab.done ? 'Zmigrowany' : 'Nie zmigrowany — widok stub'}
    >
      {tab.label}
    </button>
  {/each}
</div>

<section class="mobile-nav-shell mobile-only">
  <div class="mobile-nav-hero">
    <div class="mobile-nav-copy">
      <span class="mobile-nav-eyebrow">Sekcje projektu</span>
      <strong>{active.label}</strong>
      <span>{tabs.length} widoków gotowych do przełączania w telefonie</span>
    </div>
    <button
      type="button"
      class="mobile-nav-trigger"
      aria-expanded={menuOpen}
      aria-controls="mobile-tab-menu"
      on:click={() => (menuOpen = !menuOpen)}
    >
      {menuOpen ? 'Zwiń menu' : 'Menu'}
    </button>
  </div>

  <div class="mobile-nav-rail" aria-label="Sekcje projektu">
    {#each tabs as tab}
      <button
        type="button"
        class="mobile-nav-card"
        class:active={$activeTab === tab.id}
        class:admin-tab={tab.id === 'admin'}
        on:click={() => selectTab(tab.id)}
      >
        <span class="mobile-nav-mark">{tabMark(tab.label)}</span>
        <span class="mobile-nav-card-copy">
          <span class="mobile-nav-card-label">{tab.label}</span>
          <span class="mobile-nav-card-meta">{tab.done ? 'Gotowe do pracy' : 'Widok roboczy'}</span>
        </span>
      </button>
    {/each}
  </div>

  {#if menuOpen}
    <button
      type="button"
      class="mobile-nav-scrim"
      aria-label="Zamknij mobilne menu sekcji"
      on:click={() => (menuOpen = false)}
    ></button>
  {/if}

  <div id="mobile-tab-menu" class:open={menuOpen} class="mobile-tab-menu">
    <div class="mobile-tab-menu-head">
      <span>Przejdź do sekcji</span>
      <strong>{active.label}</strong>
    </div>
    <div class="mobile-tab-menu-list">
      {#each tabs as tab}
        <button
          type="button"
          class="mobile-tab-menu-item"
          class:active={$activeTab === tab.id}
          class:admin-tab={tab.id === 'admin'}
          on:click={() => selectTab(tab.id)}
        >
          <span class="mobile-tab-menu-icon">{tabMark(tab.label)}</span>
          <span class="mobile-tab-menu-copy">
            <span>{tab.label}</span>
            <small>{tab.done ? 'Widok gotowy' : 'Widok tymczasowy'}</small>
          </span>
        </button>
      {/each}
    </div>
  </div>
</section>

<style>
  .mobile-only {
    display: none;
  }

  :global(.desktop-tabs .view-tab.admin-tab) {
    color: #1d4d8c;
    background: rgba(46, 117, 182, 0.08);
  }

  :global(.desktop-tabs .view-tab.admin-tab:hover) {
    background: rgba(46, 117, 182, 0.14);
  }

  :global(.desktop-tabs .view-tab.admin-tab.active) {
    background: linear-gradient(180deg, rgba(227, 239, 250, 0.98) 0%, rgba(255, 255, 255, 0.98) 100%);
    border-bottom-color: #1d4d8c;
    color: #163e72;
  }

  @media (max-width: 820px) {
    .desktop-tabs {
      display: none;
    }

    .mobile-only {
      display: block;
    }

    .mobile-nav-shell {
      position: relative;
      padding: 14px 14px 16px;
      background:
        radial-gradient(circle at top right, rgba(46, 117, 182, 0.18), transparent 45%),
        linear-gradient(180deg, #f7fbff 0%, #eef5fb 100%);
      border-bottom: 1px solid var(--border);
      overflow: clip;
    }

    .mobile-nav-hero {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 12px;
      padding: 14px;
      border-radius: 24px;
      background: linear-gradient(135deg, #12345d 0%, #255488 100%);
      color: #fff;
      box-shadow: 0 16px 32px rgba(17, 53, 94, 0.16);
    }

    .mobile-nav-copy {
      display: flex;
      flex-direction: column;
      gap: 3px;
      min-width: 0;
    }

    .mobile-nav-eyebrow {
      font-size: 11px;
      font-weight: 700;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      color: rgba(255, 255, 255, 0.7);
    }

    .mobile-nav-copy strong {
      font-size: 20px;
      line-height: 1.1;
      letter-spacing: -0.02em;
    }

    .mobile-nav-copy span:last-child {
      font-size: 13px;
      line-height: 1.35;
      color: rgba(255, 255, 255, 0.76);
    }

    .mobile-nav-trigger {
      border: 1px solid rgba(255, 255, 255, 0.22);
      background: rgba(255, 255, 255, 0.12);
      color: #fff;
      border-radius: 999px;
      padding: 10px 14px;
      min-height: 42px;
      font-size: 12px;
      font-weight: 700;
      white-space: nowrap;
      cursor: pointer;
    }

    .mobile-nav-rail {
      display: flex;
      gap: 10px;
      margin-top: 12px;
      overflow-x: auto;
      padding-bottom: 2px;
      scroll-snap-type: x proximity;
      -webkit-overflow-scrolling: touch;
    }

    .mobile-nav-card {
      flex: 0 0 min(72vw, 228px);
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 12px;
      border: 1px solid rgba(37, 84, 136, 0.12);
      border-radius: 20px;
      background: rgba(255, 255, 255, 0.92);
      color: var(--text-primary);
      box-shadow: 0 12px 24px rgba(31, 56, 100, 0.08);
      scroll-snap-align: start;
      cursor: pointer;
      text-align: left;
      min-height: 84px;
    }

    .mobile-nav-card.active {
      border-color: rgba(46, 117, 182, 0.4);
      background: linear-gradient(135deg, rgba(46, 117, 182, 0.14), rgba(255, 255, 255, 0.98));
      box-shadow: 0 16px 28px rgba(46, 117, 182, 0.14);
    }

    .mobile-nav-card.admin-tab {
      border-color: rgba(18, 52, 93, 0.16);
      background: linear-gradient(135deg, rgba(18, 52, 93, 0.1), rgba(255, 255, 255, 0.98));
    }

    .mobile-nav-mark {
      width: 42px;
      height: 42px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      border-radius: 14px;
      background: #12345d;
      color: #fff;
      font-size: 14px;
      font-weight: 800;
      flex-shrink: 0;
    }

    .mobile-nav-card.active .mobile-nav-mark {
      background: linear-gradient(135deg, #12345d 0%, #2e75b6 100%);
    }

    .mobile-nav-card-copy {
      display: flex;
      flex-direction: column;
      gap: 4px;
      min-width: 0;
    }

    .mobile-nav-card-label {
      font-size: 15px;
      font-weight: 700;
      line-height: 1.15;
    }

    .mobile-nav-card-meta {
      font-size: 12px;
      color: var(--text-secondary);
    }

    .mobile-nav-scrim {
      position: fixed;
      inset: 0;
      border: none;
      background: rgba(15, 23, 42, 0.34);
      z-index: 40;
      cursor: pointer;
    }

    .mobile-tab-menu {
      position: absolute;
      left: 14px;
      right: 14px;
      top: 86px;
      display: grid;
      gap: 12px;
      padding: 14px;
      border-radius: 24px;
      background: rgba(255, 255, 255, 0.98);
      border: 1px solid rgba(37, 84, 136, 0.12);
      box-shadow: 0 24px 40px rgba(15, 23, 42, 0.18);
      z-index: 41;
      transform: translateY(-8px);
      opacity: 0;
      pointer-events: none;
      transition: opacity 0.16s ease, transform 0.16s ease;
    }

    .mobile-tab-menu.open {
      opacity: 1;
      pointer-events: auto;
      transform: translateY(0);
    }

    .mobile-tab-menu-head {
      display: flex;
      flex-direction: column;
      gap: 3px;
      padding-bottom: 4px;
    }

    .mobile-tab-menu-head span {
      font-size: 11px;
      font-weight: 700;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      color: var(--text-muted);
    }

    .mobile-tab-menu-head strong {
      font-size: 18px;
      color: #12345d;
      letter-spacing: -0.02em;
    }

    .mobile-tab-menu-list {
      display: flex;
      flex-direction: column;
      gap: 8px;
      max-height: min(58vh, 460px);
      overflow-y: auto;
    }

    .mobile-tab-menu-item {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 12px;
      border-radius: 18px;
      border: 1px solid rgba(37, 84, 136, 0.1);
      background: #f6f9fc;
      color: var(--text-primary);
      cursor: pointer;
      text-align: left;
    }

    .mobile-tab-menu-item.active {
      border-color: rgba(46, 117, 182, 0.35);
      background: rgba(46, 117, 182, 0.1);
    }

    .mobile-tab-menu-item.admin-tab {
      border-color: rgba(18, 52, 93, 0.14);
      background: linear-gradient(135deg, rgba(18, 52, 93, 0.06), rgba(246, 249, 252, 0.98));
    }

    .mobile-tab-menu-icon {
      width: 36px;
      height: 36px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      border-radius: 12px;
      background: #12345d;
      color: #fff;
      font-size: 12px;
      font-weight: 800;
      flex-shrink: 0;
    }

    .mobile-tab-menu-copy {
      display: flex;
      flex-direction: column;
      gap: 2px;
      min-width: 0;
    }

    .mobile-tab-menu-copy span {
      font-size: 14px;
      font-weight: 700;
    }

    .mobile-tab-menu-copy small {
      font-size: 12px;
      color: var(--text-secondary);
    }
  }
</style>
