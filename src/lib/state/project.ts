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

export const DEFAULT_PROJECT_META: ProjectMeta = {
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
};

function coerceNumber(value: unknown, fallback = 0): number {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return fallback;
}

export function normalizeProjectMeta(
  value: Partial<ProjectMeta> | null | undefined,
  fallback: Partial<ProjectMeta> = {}
): ProjectMeta {
  const merged = {
    ...DEFAULT_PROJECT_META,
    ...fallback,
    ...(value || {})
  };

  return {
    name: String(merged.name || '').trim(),
    code: String(merged.code || '').trim(),
    client: String(merged.client || '').trim(),
    dateStart: String(merged.dateStart || ''),
    dateEnd: String(merged.dateEnd || ''),
    status: (['aktywny', 'wstrzymany', 'zakończony', 'planowany'].includes(String(merged.status))
      ? merged.status
      : DEFAULT_PROJECT_META.status) as ProjectStatus,
    plannedBudget: coerceNumber(merged.plannedBudget, DEFAULT_PROJECT_META.plannedBudget),
    actualBudget: coerceNumber(merged.actualBudget, DEFAULT_PROJECT_META.actualBudget),
    currency: String(merged.currency || DEFAULT_PROJECT_META.currency).trim() || DEFAULT_PROJECT_META.currency,
    manager: String(merged.manager || '').trim()
  };
}

export const projectMeta = writable<ProjectMeta>(normalizeProjectMeta(DEFAULT_PROJECT_META));
persistStore(projectMeta, 'wbs_project_meta');
projectMeta.update((meta) => normalizeProjectMeta(meta));

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
