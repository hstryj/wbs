import { writable } from 'svelte/store';
import { persistStore } from './persistence';
import type { Material } from '../types';

export interface BomItem {
  materialId?: string;
  code: string;
  name: string;
  unit: string;
  qty: number;
  price: number;
  currency: string;
  notes?: string;
}

export interface Bom {
  id: string;
  name: string;
  ts: string;
  items: BomItem[];
  /** Optional WBS task code association */
  wbsCode?: string;
}

export const materials = writable<Material[]>([]);
persistStore(materials, 'wbs_materials');

export const boms = writable<Bom[]>([]);
persistStore(boms, 'wbs_boms');

function genId(): string {
  return 'm_' + Math.random().toString(36).slice(2, 10);
}

// ── Material CRUD ──────────────────────────────────────────────────
export function addMaterial(m: Omit<Material, 'id'>): void {
  materials.update((list) => [...list, { id: genId(), ...m }]);
}

export function updateMaterial(id: string, patch: Partial<Material>): void {
  materials.update((list) => list.map((m) => (m.id === id ? { ...m, ...patch } : m)));
}

export function deleteMaterial(id: string): void {
  materials.update((list) => list.filter((m) => m.id !== id));
}

// ── BOM CRUD ───────────────────────────────────────────────────────
export function addBom(name: string, wbsCode?: string): string {
  const id = genId();
  const now = new Date();
  const ts = now.toLocaleDateString('pl-PL') + ' ' + now.toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' });
  boms.update((list) => [...list, { id, name: name.trim() || 'Nowa lista', ts, items: [], wbsCode }]);
  return id;
}

export function deleteBom(id: string): void {
  boms.update((list) => list.filter((b) => b.id !== id));
}

export function updateBom(id: string, patch: Partial<Bom>): void {
  boms.update((list) => list.map((b) => (b.id === id ? { ...b, ...patch } : b)));
}

export function addBomItem(bomId: string, item: BomItem): void {
  boms.update((list) =>
    list.map((b) => (b.id === bomId ? { ...b, items: [...b.items, item] } : b))
  );
}

export function deleteBomItem(bomId: string, index: number): void {
  boms.update((list) =>
    list.map((b) => (b.id === bomId ? { ...b, items: b.items.filter((_, i) => i !== index) } : b))
  );
}

export function updateBomItem(bomId: string, index: number, patch: Partial<BomItem>): void {
  boms.update((list) =>
    list.map((b) =>
      b.id === bomId
        ? { ...b, items: b.items.map((it, i) => (i === index ? { ...it, ...patch } : it)) }
        : b
    )
  );
}
