import { writable, get } from 'svelte/store';
import type { WbsNode } from '../types';
import { persistStore } from './persistence';
import { tree } from './tree';
import { mkNode } from '../utils/wbs';
import { uid } from '../utils/id';
import { logChange } from './changelog';

export interface WbsTemplate {
  id: string;
  name: string;
  category: string;
  description: string;
  ts: string;
  /** Serialized WbsNode[] — to deep-copy when inserting. */
  nodes: WbsNode[];
}

export const templates = writable<WbsTemplate[]>([]);
persistStore(templates, 'wbs_templates');

export const templateCategories = writable<string[]>(['Ogólne', 'Elektryka', 'Automatyka', 'Mechaniczne']);
persistStore(templateCategories, 'wbs_template_categories');

function genId(): string {
  return 't_' + Math.random().toString(36).slice(2, 10);
}

function nowLabel(): string {
  const d = new Date();
  return d.toLocaleDateString('pl-PL') + ' ' + d.toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' });
}

/** Deep-clone a section (WbsNode subtree) into a "zeroed out" template —
 * optionally wyzeruj `done`, `dateStart`, `dateEnd` i `md`.
 * Zawsze resetuje `id`, `_code`, `collapsed`. */
function cloneForTemplate(n: WbsNode, resetProgress: boolean, resetDates: boolean): WbsNode {
  return {
    id: 0, // re-id on insert
    name: n.name,
    weight: n.weight,
    done: resetProgress ? 0 : (n.done || 0),
    resp: n.resp || '',
    priority: n.priority || '',
    rag: n.rag || '',
    note: n.note || '',
    dateStart: resetDates ? '' : (n.dateStart || ''),
    dateEnd: resetDates ? '' : (n.dateEnd || ''),
    md: n.md || 0,
    isProject: false,
    children: (n.children || []).map((c) => cloneForTemplate(c, resetProgress, resetDates)),
    collapsed: false
  };
}

/** Create a template from an existing section (non-project node). */
export function createTemplate(params: {
  name: string;
  category: string;
  description?: string;
  fromNode: WbsNode;
  resetProgress?: boolean;
  resetDates?: boolean;
}): string {
  const id = genId();
  const clone = cloneForTemplate(params.fromNode, params.resetProgress ?? true, params.resetDates ?? true);
  templates.update((list) => [
    ...list,
    {
      id,
      name: params.name.trim() || 'Szablon',
      category: params.category || 'Ogólne',
      description: params.description || '',
      ts: nowLabel(),
      nodes: [clone]
    }
  ]);
  logChange('edit', 'Utworzono szablon: ' + params.name);
  return id;
}

export function deleteTemplate(id: string): void {
  templates.update((list) => list.filter((t) => t.id !== id));
}

/** Insert a template into the tree — dołącza jako dziecko wskazanego
 * węzła, albo jako nowa sekcja w pierwszym projekcie, albo jako nowy
 * projekt gdy tree jest puste. Generuje nowe ID rekurencyjnie. */
function regenerateIds(n: WbsNode): WbsNode {
  return {
    ...n,
    id: uid(),
    children: (n.children || []).map(regenerateIds)
  };
}

export function insertTemplate(templateId: string, parentId?: number): boolean {
  const tpl = get(templates).find((t) => t.id === templateId);
  if (!tpl) return false;
  tree.update((t) => {
    const copy = structuredClone(t);
    const newNodes = tpl.nodes.map(regenerateIds);

    if (parentId !== undefined) {
      const parent = findById(copy, parentId);
      if (parent) {
        parent.children.push(...newNodes);
        return copy;
      }
    }

    // Dołącz do pierwszego projektu, albo utwórz nowy projekt-wrapper
    const firstProject = copy.find((n) => n.isProject);
    if (firstProject) {
      firstProject.children.push(...newNodes);
    } else {
      const wrap = mkNode('Nowy projekt', 0, 0, '', true);
      wrap.children = newNodes;
      copy.push(wrap);
    }
    return copy;
  });
  logChange('load', 'Wstawiono szablon: ' + tpl.name);
  return true;
}

function findById(list: WbsNode[], id: number): WbsNode | null {
  for (const n of list) {
    if (n.id === id) return n;
    const c = findById(n.children, id);
    if (c) return c;
  }
  return null;
}

export function addCategory(name: string): void {
  const trimmed = name.trim();
  if (!trimmed) return;
  templateCategories.update((list) => (list.includes(trimmed) ? list : [...list, trimmed]));
}

export function deleteCategory(name: string): void {
  // Nie pozwalamy usunąć "Ogólne"
  if (name === 'Ogólne') return;
  templateCategories.update((list) => list.filter((c) => c !== name));
  // Przenieś szablony tej kategorii do "Ogólne"
  templates.update((list) => list.map((t) => (t.category === name ? { ...t, category: 'Ogólne' } : t)));
}
