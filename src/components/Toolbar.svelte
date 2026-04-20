<script lang="ts">
  import { quickAddTask } from '../lib/state/tree';
  import { activeTab, pendingFocusNodeId } from '../lib/state/ui';
  import { auth } from '../lib/state/auth';
  import TemplatesModal from './TemplatesModal.svelte';

  let templatesOpen = false;

  function addTask() {
    const createdId = quickAddTask();
    if (createdId !== null) pendingFocusNodeId.set(createdId);
    activeTab.set('table');
  }

  function exportReport() {
    activeTab.set('report');
  }

  function openAdmin() {
    activeTab.set('admin');
  }

  function openTemplates() {
    templatesOpen = true;
  }
</script>

<div class="toolbar">
  <button class="btn btn-blue" on:click={addTask}>
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
      <rect x="5.25" y="1" width="1.5" height="10" rx=".75" fill="#fff"/>
      <rect x="1" y="5.25" width="10" height="1.5" rx=".75" fill="#fff"/>
    </svg>
    Dodaj zadanie
  </button>

  <button class="btn btn-secondary" on:click={openTemplates}>
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
      <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/>
      <polyline points="17 21 17 13 7 13 7 21"/>
      <polyline points="7 3 7 8 15 8"/>
    </svg>
    Szablony
  </button>

  <button class="btn btn-secondary" on:click={exportReport}>
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
      <polyline points="7 10 12 15 17 10"/>
      <line x1="12" y1="15" x2="12" y2="3"/>
    </svg>
    Eksportuj
  </button>

  {#if $auth.configured}
    <button class="btn btn-secondary btn-admin-shortcut" on:click={openAdmin}>
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <path d="M12 3l7 4v5c0 5-3.5 8-7 9-3.5-1-7-4-7-9V7l7-4z"/>
        <path d="M9.5 12.5l1.8 1.8 3.2-3.6"/>
      </svg>
      Admin
    </button>
  {/if}
</div>

<section class="mobile-toolbar mobile-only">
  <div class="mobile-toolbar-hero">
    <div class="mobile-toolbar-copy">
      <span class="mobile-toolbar-eyebrow">Szybkie akcje</span>
      <strong>{$activeTab === 'table' ? 'Mobilny edytor WBS' : 'Sterowanie projektem'}</strong>
      <span>Najczęstsze ruchy trzymamy pod kciukiem, bez wracania do szerokiego paska narzędzi.</span>
    </div>
  </div>

  <div class="mobile-toolbar-rail">
    <button type="button" class="mobile-action-card primary" on:click={addTask}>
      <span class="mobile-action-icon">+</span>
      <span class="mobile-action-copy">
        <strong>Dodaj zadanie</strong>
        <small>Nowy punkt lub przejście do edytora</small>
      </span>
    </button>

    <button type="button" class="mobile-action-card" on:click={openTemplates}>
      <span class="mobile-action-icon">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/>
          <polyline points="17 21 17 13 7 13 7 21"/>
          <polyline points="7 3 7 8 15 8"/>
        </svg>
      </span>
      <span class="mobile-action-copy">
        <strong>Szablony</strong>
        <small>Załaduj gotowy układ projektu</small>
      </span>
    </button>

    <button type="button" class="mobile-action-card" on:click={exportReport}>
      <span class="mobile-action-icon">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
          <polyline points="7 10 12 15 17 10"/>
          <line x1="12" y1="15" x2="12" y2="3"/>
        </svg>
      </span>
      <span class="mobile-action-copy">
        <strong>Eksport</strong>
        <small>Przejdź do raportu i podsumowań</small>
      </span>
    </button>
  </div>
</section>

<TemplatesModal bind:open={templatesOpen} />

<style>
  .mobile-only {
    display: none;
  }

  .btn-secondary {
    background: var(--bg-surface);
    color: var(--text-primary);
    border-color: var(--border-strong);
  }
  .btn-secondary:hover {
    background: var(--brand-primary-bg);
    color: var(--brand-primary-dark);
    border-color: var(--brand-primary);
  }

  .btn-admin-shortcut {
    color: #163e72;
    background: linear-gradient(180deg, rgba(231, 240, 249, 0.96) 0%, rgba(245, 249, 253, 0.98) 100%);
    border-color: rgba(46, 117, 182, 0.22);
  }

  .btn-admin-shortcut:hover {
    background: linear-gradient(180deg, rgba(215, 232, 247, 0.98) 0%, rgba(236, 244, 251, 0.98) 100%);
    color: #12345d;
  }

  @media (max-width: 820px) {
    .toolbar {
      display: none;
    }

    .mobile-only {
      display: block;
    }

    .mobile-toolbar {
      padding: 14px;
      background:
        radial-gradient(circle at bottom left, rgba(37, 84, 136, 0.16), transparent 40%),
        linear-gradient(180deg, #f9fbfd 0%, #f3f8fc 100%);
      border-bottom: 1px solid var(--border);
    }

    .mobile-toolbar-hero {
      padding: 14px;
      border-radius: 24px;
      background: rgba(255, 255, 255, 0.94);
      border: 1px solid rgba(37, 84, 136, 0.12);
      box-shadow: 0 14px 28px rgba(31, 56, 100, 0.08);
    }

    .mobile-toolbar-copy {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .mobile-toolbar-eyebrow {
      font-size: 11px;
      font-weight: 700;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      color: var(--text-muted);
    }

    .mobile-toolbar-copy strong {
      font-size: 18px;
      line-height: 1.15;
      color: #12345d;
      letter-spacing: -0.02em;
    }

    .mobile-toolbar-copy span:last-child {
      font-size: 13px;
      line-height: 1.4;
      color: var(--text-secondary);
    }

    .mobile-toolbar-rail {
      display: flex;
      gap: 10px;
      overflow-x: auto;
      padding-top: 12px;
      padding-bottom: 2px;
      scroll-snap-type: x proximity;
      -webkit-overflow-scrolling: touch;
    }

    .mobile-action-card {
      flex: 0 0 min(76vw, 250px);
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 13px;
      border-radius: 22px;
      border: 1px solid rgba(37, 84, 136, 0.12);
      background: rgba(255, 255, 255, 0.96);
      box-shadow: 0 14px 24px rgba(31, 56, 100, 0.08);
      text-align: left;
      cursor: pointer;
      scroll-snap-align: start;
      color: var(--text-primary);
      min-height: 90px;
    }

    .mobile-action-card.primary {
      background: linear-gradient(135deg, #12345d 0%, #2e75b6 100%);
      color: #fff;
      border-color: transparent;
    }

    .mobile-action-icon {
      width: 44px;
      height: 44px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      border-radius: 16px;
      background: rgba(18, 52, 93, 0.08);
      color: #12345d;
      flex-shrink: 0;
      font-size: 22px;
      font-weight: 800;
    }

    .mobile-action-card.primary .mobile-action-icon {
      background: rgba(255, 255, 255, 0.16);
      color: #fff;
    }

    .mobile-action-copy {
      display: flex;
      flex-direction: column;
      gap: 3px;
      min-width: 0;
    }

    .mobile-action-copy strong {
      font-size: 15px;
      line-height: 1.15;
    }

    .mobile-action-copy small {
      font-size: 12px;
      line-height: 1.35;
      color: var(--text-secondary);
    }

    .mobile-action-card.primary .mobile-action-copy small {
      color: rgba(255, 255, 255, 0.76);
    }
  }
</style>
