import { writable, derived, get } from 'svelte/store';
import type { WbsNode } from '../types';
import { mkNode, overallProgress, rootWeightSum, rootWeightedSum } from '../utils/wbs';
import { persistStore } from './persistence';

export const tree = writable<WbsNode[]>([]);
persistStore(tree, 'wbs_tree');

/** Aggregate metrics derived from the tree */
export const overallPct = derived(tree, ($t) => overallProgress($t));
export const totalWeight = derived(tree, ($t) => rootWeightSum($t));
export const weightedTotal = derived(tree, ($t) => rootWeightedSum($t));

/** Add a new top-level project */
export function addRoot(): void {
  tree.update(($t) => [...$t, mkNode('', 0, 0, '', true)]);
}

/** Add a child under the given parent id */
export function addChild(parentId: number): void {
  tree.update(($t) => {
    const copy = structuredClone($t);
    const parent = findNode(copy, parentId);
    if (parent) parent.children.push(mkNode('', 0, 0, ''));
    return copy;
  });
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
}

/** Delete a node by id */
export function delNode(id: number): void {
  tree.update(($t) => {
    const copy = structuredClone($t);
    removeById(copy, id);
    return copy;
  });
}

/** Update a single field on a node */
export function setField<K extends keyof WbsNode>(id: number, field: K, value: WbsNode[K]): void {
  tree.update(($t) => {
    const copy = structuredClone($t);
    const n = findNode(copy, id);
    if (n) n[field] = value;
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
