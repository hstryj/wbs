/* Lazy loader widoków. Dzięki temu start aplikacji nie ładuje wszystkich zakładek naraz. */

import type { ComponentType } from 'svelte';
import type { TabName } from '../lib/types';

type ViewModule = { default: ComponentType };
type ViewLoader = () => Promise<ViewModule>;

const VIEW_LOADERS: Record<TabName, ViewLoader> = {
  dash: () => import('./DashboardView.svelte') as Promise<ViewModule>,
  table: () => import('./WbsEditorView.svelte') as Promise<ViewModule>,
  rank: () => import('./RankingView.svelte') as Promise<ViewModule>,
  team: () => import('./TeamView.svelte') as Promise<ViewModule>,
  gantt: () => import('./GanttView.svelte') as Promise<ViewModule>,
  personal: () => import('./PersonalPlanView.svelte') as Promise<ViewModule>,
  wlreport: () => import('./WorklogReportView.svelte') as Promise<ViewModule>,
  orders: () => import('./OrdersView.svelte') as Promise<ViewModule>,
  admin: () => import('./AdminView.svelte') as Promise<ViewModule>,
  risk: () => import('./RisksView.svelte') as Promise<ViewModule>,
  report: () => import('./ReportView.svelte') as Promise<ViewModule>,
  chart: () => import('./TreeView.svelte') as Promise<ViewModule>,
  wfall: () => import('./WaterfallView.svelte') as Promise<ViewModule>,
  log: () => import('./ChangelogView.svelte') as Promise<ViewModule>
};

const viewCache = new Map<TabName, ComponentType>();

export async function loadView(tab: TabName): Promise<ComponentType> {
  const cached = viewCache.get(tab);
  if (cached) return cached;

  const mod = await VIEW_LOADERS[tab]();
  viewCache.set(tab, mod.default);
  return mod.default;
}
