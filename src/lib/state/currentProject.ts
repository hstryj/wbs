/**
 * currentProject — store aktywnego projektu + status sync'u.
 * Gdy `id !== null`, aplikacja działa w trybie "cloud" (wszystkie
 * zmiany synchronizowane z Supabase). Gdy null — tryb lokalny.
 */
import { writable } from 'svelte/store';

export type SyncStatus = 'idle' | 'loading' | 'queued' | 'saving' | 'synced' | 'error';

export interface CurrentProjectState {
  id: string | null;
  name: string;
  status: SyncStatus;
  error: string | null;
  lastSyncedAt: Date | null;
}

export const currentProject = writable<CurrentProjectState>({
  id: null,
  name: '',
  status: 'idle',
  error: null,
  lastSyncedAt: null
});
