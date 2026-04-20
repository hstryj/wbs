import { writable } from 'svelte/store';
import type { TabName } from '../types';
import { persistStore } from './persistence';

export const activeTab = writable<TabName>('table');
persistStore(activeTab, 'wbs_active_tab');

/** Which optional columns are visible in the WBS editor table */
export type ColName = 'waga' | 'waz' | 'rag' | 'md' | 'start' | 'end' | 'pri' | 'note';

export const colVis = writable<Record<ColName, boolean>>({
  waga: true,
  waz: false,
  rag: true,
  md: false,
  start: false,
  end: true,
  pri: true,
  note: false
});
persistStore(colVis, 'wbs_col_vis');

export const colPanelOpen = writable<boolean>(false);

/** transient focus target for newly created WBS nodes */
export const pendingFocusNodeId = writable<number | null>(null);

/** transient warning (e.g. weight cap) */
export const warnMsg = writable<{ text: string; kind: 'bad' | 'ok' | 'info' } | null>(null);
let _warnTimer: ReturnType<typeof setTimeout> | null = null;
export function flashWarn(text: string, kind: 'bad' | 'ok' | 'info' = 'bad', ms = 4000): void {
  warnMsg.set({ text, kind });
  if (_warnTimer) clearTimeout(_warnTimer);
  _warnTimer = setTimeout(() => warnMsg.set(null), ms);
}
