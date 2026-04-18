import { writable, get } from 'svelte/store';
import type { Snapshot } from '../types';
import { persistStore } from './persistence';
import { tree, getTree } from './tree';
import { people } from './people';
import { overallProgress } from '../utils/wbs';
import { logChange } from './changelog';

export const snapshots = writable<Snapshot[]>([]);
persistStore(snapshots, 'wbs_snapshots');

let _uid = 1;

export function takeSnapshot(name: string): void {
  const trimmed = name.trim();
  if (!trimmed) return;
  const t = getTree();
  const now = new Date();
  const snap: Snapshot = {
    id: _uid++,
    name: trimmed,
    ts: now.toLocaleDateString('pl-PL') + ' ' + now.toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' }),
    tree: JSON.stringify(t),
    people: JSON.stringify(get(people)),
    overall: overallProgress(t).toFixed(1)
  };
  snapshots.update((list) => [snap, ...list]);
  logChange('snap', 'Snapshot: ' + trimmed);
}

export function restoreSnapshot(id: number): void {
  const s = get(snapshots).find((sn) => sn.id === id);
  if (!s) return;
  try {
    tree.set(JSON.parse(s.tree));
    people.set(JSON.parse(s.people));
    logChange('load', 'Przywrócono snapshot: ' + s.name);
  } catch {
    // corrupt — do nothing
  }
}

export function deleteSnapshot(id: number): void {
  snapshots.update((list) => list.filter((s) => s.id !== id));
}
