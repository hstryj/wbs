import { writable, derived, get } from 'svelte/store';
import type { WbsNode } from '../types';
import { mkNode, overallProgress, rootWeightSum, rootWeightedSum, findParentList as _findParentList } from '../utils/wbs';
import { persistStore } from './persistence';
import { logChange } from './changelog';
import { flashWarn } from './ui';

export const tree = writable<WbsNode[]>([]);
persistStore(tree, 'wbs_tree');

/** Aggregate metrics derived from the tree */
export const overallPct = derived(tree, ($t) => overallProgress($t));
export const totalWeight = derived(tree, ($t) => rootWeightSum($t));
export const weightedTotal = derived(tree, ($t) => rootWeightedSum($t));

/** Add a new top-level project */
export function addRoot(): void {
  tree.update(($t) => [...$t, mkNode('', 0, 0, '', true)]);
  logChange('edit', 'Dodano punkt główny');
}

/** Add a child under the given parent id */
export function addChild(parentId: number): void {
  tree.update(($t) => {
    const copy = structuredClone($t);
    const parent = findNode(copy, parentId);
    if (parent) parent.children.push(mkNode('', 0, 0, ''));
    return copy;
  });
  logChange('edit', 'Dodano podpunkt');
}

/** Add a sibling after the given node id */
export function addSibling(nodeId: number): void {
  tree.update(($t) => {
    const copy = structuredClone($t);
    const parent = findParent(copy, nodeId);
    const list = parent ? parent.children : copy;
    const idx = list.findIndex((n) => n.id === nodeId);
    if (idx >= 0) list.splice(idx + 1, 0, mkNode('', 0, 0, ''));
    return copy;
  });
  logChange('edit', 'Dodano element obok');
}

/** Delete a node by id */
export function delNode(id: number): void {
  let name = '';
  tree.update(($t) => {
    const copy = structuredClone($t);
    const n = findNode(copy, id);
    if (n) name = n.name || n._code || '';
    removeById(copy, id);
    return copy;
  });
  logChange('edit', 'Usunięto: ' + (name || '(bez nazwy)'));
}

/** Update a single field on a node */
export function setField<K extends keyof WbsNode>(id: number, field: K, value: WbsNode[K]): void {
  tree.update(($t) => {
    const copy = structuredClone($t);
    const n = findNode(copy, id);
    if (n) n[field] = value;
    return copy;
  });
  // Log selected structured changes (not every keystroke)
  if (field === 'done' || field === 'rag' || field === 'priority' || field === 'resp') {
    const n = findNode(get(tree), id);
    if (n) {
      const labels: Record<string, string> = {
        done: 'Ukończenie',
        rag: 'RAG',
        priority: 'Priorytet',
        resp: 'Odpowiedzialny'
      };
      logChange('edit', `[${n._code ?? ''}] ${String(n.name || '').slice(0, 40)}: ${labels[field as string]} → ${String(value).slice(0, 40)}`);
    }
  }
}

/** Set weight with sibling-sum validation; caps at remaining capacity */
export function setWeight(id: number, val: number): void {
  tree.update(($t) => {
    const copy = structuredClone($t);
    const siblings = _findParentList(copy, id) ?? copy;
    const n = siblings.find((s) => s.id === id);
    if (!n) return $t;
    let newW = isFinite(val) ? val : 0;
    const siblingsSum = siblings.filter((s) => s.id !== id).reduce((a, s) => a + (s.weight || 0), 0);
    if (siblingsSum + newW > 100.05) {
      const capped = Math.max(0, Math.round((100 - siblingsSum) * 10) / 10);
      flashWarn(`⚠ Suma wag przekroczyłaby 100% — ograniczono do ${capped.toFixed(1)}%`, 'bad');
      newW = capped;
    }
    n.weight = newW;
    return copy;
  });
}

export function toggleCollapse(id: number): void {
  tree.update(($t) => {
    const copy = structuredClone($t);
    const n = findNode(copy, id);
    if (n) n.collapsed = !n.collapsed;
    return copy;
  });
}

// ── helpers ──────────────────────────────────────────────────────────
function findNode(list: WbsNode[], id: number): WbsNode | null {
  for (const n of list) {
    if (n.id === id) return n;
    const c = findNode(n.children, id);
    if (c) return c;
  }
  return null;
}

function findParent(list: WbsNode[], childId: number, parent: WbsNode | null = null): WbsNode | null {
  for (const n of list) {
    if (n.id === childId) return parent;
    const found = findParent(n.children, childId, n);
    if (found !== null) return found;
  }
  return null;
}

function removeById(list: WbsNode[], id: number): boolean {
  const idx = list.findIndex((n) => n.id === id);
  if (idx >= 0) {
    list.splice(idx, 1);
    return true;
  }
  for (const n of list) {
    if (removeById(n.children, id)) return true;
  }
  return false;
}

/** Current snapshot of the tree — use sparingly, prefer subscriptions */
export function getTree(): WbsNode[] {
  return get(tree);
}
