/* Barrel + mapa widoków dla dict-driven routera w App.svelte.
   Dodanie nowego widoku: 1) zaimportuj komponent, 2) wpisz do VIEWS. */

import DashboardView from './DashboardView.svelte';
import WbsEditorView from './WbsEditorView.svelte';
import RankingView from './RankingView.svelte';
import TeamView from './TeamView.svelte';
import GanttView from './GanttView.svelte';
import WorklogReportView from './WorklogReportView.svelte';
import OrdersView from './OrdersView.svelte';
import RisksView from './RisksView.svelte';
import ReportView from './ReportView.svelte';
import TreeView from './TreeView.svelte';
import WaterfallView from './WaterfallView.svelte';
import ChangelogView from './ChangelogView.svelte';
import PersonalPlanView from './PersonalPlanView.svelte';
import type { ComponentType } from 'svelte';
import type { TabName } from '../lib/types';

export {
  DashboardView,
  WbsEditorView,
  RankingView,
  TeamView,
  GanttView,
  WorklogReportView,
  OrdersView,
  RisksView,
  ReportView,
  TreeView,
  WaterfallView,
  ChangelogView,
  PersonalPlanView
};

/** Mapa zakładka → komponent widoku. Używana przez <svelte:component> w App.svelte. */
export const VIEWS: Record<TabName, ComponentType> = {
  dash:     DashboardView,
  table:    WbsEditorView,
  rank:     RankingView,
  team:     TeamView,
  gantt:    GanttView,
  personal: PersonalPlanView,
  wlreport: WorklogReportView,
  orders:   OrdersView,
  risk:     RisksView,
  report:   ReportView,
  chart:    TreeView,
  wfall:    WaterfallView,
  log:      ChangelogView
};
