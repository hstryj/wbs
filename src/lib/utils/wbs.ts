import type { WbsNode } from '../types';
import { uid, resetUid } from './id';

export function mkNode(
  name = '',
  weight = 0,
  done = 0,
  resp = '',
  isProject = false
): WbsNode {
  return {
    id: uid(),
    name,
    weight,
    done,
    resp,
    priority: '',
    rag: '',
    note: '',
    dateStart: '',
    dateEnd: '',
    md: 0,
    isProject,
    children: [],
    collapsed: false
  };
}

export function isLeaf(n: WbsNode): boolean {
  return !n.isProject && (!n.children || n.children.length === 0);
}

/** Walk the tree and assign WBS codes like "1.2.3" to each node. Mutates. */
export function assignCodes(tree: WbsNode[]): void {
  let projIdx = 0;
  for (const n of tree) {
    if (n.isProject) {
      projIdx++;
      n._code = '';
      assignCodesChildren(n.children, '');
    } else {
      // shouldn't happen with normal data model but be safe
      assignCodesChildren([n], '');
    }
  }
  if (projIdx === 0) {
    // flat tree (no projects)
    assignCodesChildren(tree, '');
  }
  // also keep uid counter past max id to avoid collisions
  let maxId = 0;
  const walk = (ns: WbsNode[]) => {
    for (const n of ns) {
      if (n.id > maxId) maxId = n.id;
      if (n.children.length) walk(n.children);
    }
  };
  walk(tree);
  resetUid(maxId);
}

function assignCodesChildren(list: WbsNode[], prefix: string): void {
  let idx = 0;
  for (const n of list) {
    idx++;
    n._code = prefix ? prefix + '.' + idx : String(idx);
    if (n.children.length) assignCodesChildren(n.children, n._code);
  }
}

export function collectLeaves(tree: WbsNode[], out: WbsNode[] = []): WbsNode[] {
  for (const n of tree) {
    if (n.isProject) {
      collectLeaves(n.children, out);
    } else if (isLeaf(n)) {
      out.push(n);
    } else {
      collectLeaves(n.children, out);
    }
  }
  return out;
}

export function childWeightSum(children: WbsNode[]): number {
  return children.reduce((a, n) => a + (n.weight || 0), 0);
}

export function childWeightedSum(children: WbsNode[]): number {
  return children.reduce((a, n) => {
    const w = n.weight || 0;
    const d = nodeDonePct(n);
    return a + (w * d) / 100;
  }, 0);
}

/** Effective % done of a node — leaf uses .done; parent derives from children */
export function nodeDonePct(n: WbsNode): number {
  if (isLeaf(n)) return n.done || 0;
  const cw = childWeightSum(n.children);
  if (cw < 0.001) return 0;
  return (childWeightedSum(n.children) / cw) * 100;
}

/** weighted contribution of a node to its parent's progress */
export function nodeWtd(n: WbsNode): number {
  const w = n.weight || 0;
  return (w * nodeDonePct(n)) / 100;
}

export function rootWeightSum(tree: WbsNode[]): number {
  // sum weights of top-level non-project nodes, or children of projects
  let sum = 0;
  for (const n of tree) {
    if (n.isProject) {
      sum += childWeightSum(n.children);
    } else {
      sum += n.weight || 0;
    }
  }
  return sum;
}

export function rootWeightedSum(tree: WbsNode[]): number {
  let sum = 0;
  for (const n of tree) {
    if (n.isProject) {
      sum += childWeightedSum(n.children);
    } else {
      sum += nodeWtd(n);
    }
  }
  return sum;
}

export function overallProgress(tree: WbsNode[]): number {
  const rw = rootWeightSum(tree);
  if (rw <= 0) return 0;
  return (rootWeightedSum(tree) / rw) * 100;
}

export function barColor(pct: number): string {
  if (pct >= 100) return '#3B7A1E';
  if (pct >= 75) return '#6CA538';
  if (pct >= 50) return '#2E75B6';
  if (pct >= 25) return '#ED7D31';
  return '#C65911';
}

/** Depth-based visual config — darker/bigger for top-level, lighter/smaller deeper */
const BG = ['#B8D4EC', '#D5E8F7', '#E8F3FC', '#F3F9FE', '#F8FCFF', '#FCFEFF'];
const IND = [0, 14, 26, 38, 50, 62];
const FS  = ['14px', '13px', '12px', '12px', '12px', '11px'];
const FW  = ['700', '700', '600', '400', '400', '400'];
const FC  = ['#0d2a4a', '#1a3a6a', '#1e4478', '#333', '#444', '#555'];

export function depthCfg(depth: number): { bg: string; ind: number; fs: string; fw: string; fc: string } {
  const i = Math.min(depth, BG.length - 1);
  return { bg: BG[i], ind: IND[i], fs: FS[i], fw: FW[i], fc: FC[i] };
}

export function depthOf(code: string | undefined): number {
  return ((code || '').match(/\./g) || []).length;
}

/** Find the parent list (siblings) for a given node id */
export function findParentList(list: WbsNode[], id: number): WbsNode[] | null {
  for (const n of list) {
    if (n.id === id) return list;
    const f = findParentList(n.children, id);
    if (f) return f;
  }
  return null;
}

/** Find a node by id (depth-first) */
export function findNodeById(list: WbsNode[], id: number): WbsNode | null {
  for (const n of list) {
    if (n.id === id) return n;
    const c = findNodeById(n.children, id);
    if (c) return c;
  }
  return null;
}

/** Derived status dla leaf'a, używany w widokach operacyjnych (Jira-style badge). */
export type TaskStatus = 'nowe' | 'w-trakcie' | 'opoznione' | 'krytyczne' | 'ukonczone';

export function taskStatus(n: WbsNode, todayISO: string): TaskStatus {
  const done = n.done || 0;
  if (done >= 100) return 'ukonczone';
  if (n.priority === 'Krytyczny') return 'krytyczne';
  if (n.dateEnd && n.dateEnd < todayISO) return 'opoznione';
  if (done > 0) return 'w-trakcie';
  return 'nowe';
}

export const TASK_STATUS_LABEL: Record<TaskStatus, string> = {
  'nowe':       'Nowe',
  'w-trakcie':  'W trakcie',
  'opoznione':  'Opóźnione',
  'krytyczne':  'Krytyczne',
  'ukonczone':  'Ukończone'
};

/** Znajduje nazwę sekcji głównej (root section / pierwszego poziomu) dla danego leafa.
 * Struktura drzewa: Project (isProject=true) → Sekcje → Podsekcje → Leafy.
 * Sekcja dla leafa = nazwa jego rootowego przodka wewnątrz projektu. */
export function findSectionName(tree: WbsNode[], leafId: number): string {
  function walk(list: WbsNode[], currentSection: string | null): string | null {
    for (const n of list) {
      if (n.id === leafId) return currentSection;
      if (n.isProject) {
        const r = walk(n.children, null);
        if (r !== null) return r;
      } else {
        // first non-project ancestor becomes the section name
        const nextSection = currentSection ?? (n.name || n._code || '');
        const r = walk(n.children, nextSection);
        if (r !== null) return r;
      }
    }
    return null;
  }
  return walk(tree, null) ?? '—';
}
