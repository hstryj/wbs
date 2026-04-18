import { writable } from 'svelte/store';
import type { ChangelogEntry } from '../types';
import { persistStore } from './persistence';

const MAX_ENTRIES = 500;

export const changelog = writable<ChangelogEntry[]>([]);
persistStore(changelog, 'wbs_changelog');

export function logChange(type: ChangelogEntry['type'], msg: string): void {
  const now = new Date();
  const ts =
    now.toLocaleDateString('pl-PL') +
    ' ' +
    now.toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  changelog.update((list) => {
    const next = [{ type, msg: String(msg || '').substring(0, 200), ts }, ...list];
    return next.length > MAX_ENTRIES ? next.slice(0, MAX_ENTRIES) : next;
  });
}
