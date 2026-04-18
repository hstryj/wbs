import { writable } from 'svelte/store';
import { persistStore } from './persistence';

export type ProjectStatus = 'aktywny' | 'wstrzymany' | 'zakończony' | 'planowany';

export interface ProjectMeta {
  name: string;
  code: string;
  client: string;
  dateStart: string;
  dateEnd: string;
  status: ProjectStatus;
  plannedBudget: number;   // PLN
  actualBudget: number;    // PLN (realizacja)
  currency: string;
  manager: string;
}

export const projectMeta = writable<ProjectMeta>({
  name: '',
  code: '',
  client: '',
  dateStart: '',
  dateEnd: '',
  status: 'aktywny',
  plannedBudget: 0,
  actualBudget: 0,
  currency: 'PLN',
  manager: ''
});
persistStore(projectMeta, 'wbs_project_meta');

export const STATUS_LABEL: Record<ProjectStatus, string> = {
  aktywny: 'Aktywny',
  wstrzymany: 'Wstrzymany',
  zakończony: 'Zakończony',
  planowany: 'Planowany'
};

export function fmtPln(n: number): string {
  if (!n) return '0';
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1).replace(/\.0$/, '') + ' mln';
  if (n >= 1_000) return Math.round(n / 1_000) + ' k';
  return String(Math.round(n));
}
