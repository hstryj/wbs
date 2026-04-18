import { writable } from 'svelte/store';
import type { Person } from '../types';
import { persistStore } from './persistence';

export const people = writable<Person[]>([]);
persistStore(people, 'wbs_people');

export function pName(p: Person | string): string {
  if (typeof p === 'string') return p;
  return p?.name || '';
}

export function pRole(p: Person | string): string {
  if (typeof p === 'string') return '';
  return p?.role || '';
}

export function initials(name: string): string {
  const parts = String(name || '').trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  return String(name || '').substring(0, 2).toUpperCase();
}
