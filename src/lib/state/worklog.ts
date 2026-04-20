import { writable, get } from 'svelte/store';
import { persistStore } from './persistence';
import { weekKey } from '../utils/dates';

/**
 * WORKLOG shape: { person: { 'YYYY-Wnn': { dayNum: { h, start, brk, desc, task } } } }
 * Also accepts legacy numeric day values (just hours), normalized on read.
 */
export interface WlDay {
  h: number;
  start?: string;
  brk?: number;
  desc?: string;
  task?: string;
}

export type WlWeek = Record<number, WlDay | number>;
export type WlPerson = Record<string, WlWeek>;
export type Worklog = Record<string, WlPerson>;

export const worklog = writable<Worklog>({});
persistStore(worklog, 'wbs_worklog');

export interface ProjectSettings {
  start: string;
  end: string;
  brk: number;
  /** Godziny pracy na tydzień per osoba (default 40). Używane w
   * szacowaniu liczby pracowników potrzebnych do ukończenia projektu
   * przy podanej sumie MD (osobodni) z zadań. */
  hrsPerWeek: number;
}

export const DEFAULT_PROJECT_SETTINGS: ProjectSettings = {
  start: '07:00',
  end: '15:30',
  brk: 30,
  hrsPerWeek: 40
};

export const projectSettings = writable<ProjectSettings>({ ...DEFAULT_PROJECT_SETTINGS });
persistStore(projectSettings, 'wbs_project_settings');

/** Patch legacy stored settings — fill missing hrsPerWeek if reading
 * older localStorage data that doesn't have it yet. */
projectSettings.update((s) => ({ ...DEFAULT_PROJECT_SETTINGS, ...s, hrsPerWeek: s?.hrsPerWeek || DEFAULT_PROJECT_SETTINGS.hrsPerWeek }));

// ── Read helpers (pure) ─────────────────────────────────────────────
export function wlGetHours(wl: Worklog, person: string, y: number, w: number, dow: number): number {
  const d = wl[person]?.[weekKey(y, w)]?.[dow];
  if (!d) return 0;
  return typeof d === 'object' ? d.h || 0 : d || 0;
}

export function wlGetDay(wl: Worklog, person: string, y: number, w: number, dow: number): WlDay {
  const raw = wl[person]?.[weekKey(y, w)]?.[dow];
  if (!raw) return { h: 0 };
  if (typeof raw === 'object') return raw;
  return { h: raw || 0 };
}

export function wlWeekTotal(wl: Worklog, person: string, y: number, w: number): number {
  let s = 0;
  for (let d = 1; d <= 7; d++) s += wlGetHours(wl, person, y, w, d);
  return s;
}

export function wlPersonTotal(wl: Worklog, person: string): number {
  const p = wl[person];
  if (!p) return 0;
  let s = 0;
  Object.values(p).forEach((week) => {
    Object.values(week).forEach((v) => {
      s += typeof v === 'object' ? (v as WlDay).h || 0 : (v as number) || 0;
    });
  });
  return s;
}

export function wlPersonTotalYear(wl: Worklog, person: string, year: number): number {
  const p = wl[person];
  if (!p) return 0;
  let s = 0;
  Object.keys(p).forEach((wk) => {
    if (!wk.startsWith(String(year) + '-W')) return;
    const week = p[wk];
    Object.values(week).forEach((v) => {
      s += typeof v === 'object' ? (v as WlDay).h || 0 : (v as number) || 0;
    });
  });
  return s;
}

/** All week keys present in worklog (across all people) — sorted ascending */
export function wlAllWeekKeys(wl: Worklog): string[] {
  const set = new Set<string>();
  Object.values(wl).forEach((p) => Object.keys(p).forEach((k) => set.add(k)));
  return [...set].sort();
}

/** Hours in year+month for a person */
export function wlPersonMonth(wl: Worklog, person: string, year: number, month: number): number {
  const p = wl[person];
  if (!p) return 0;
  let s = 0;
  Object.keys(p).forEach((wk) => {
    if (!wk.startsWith(String(year) + '-W')) return;
    const w = parseInt(wk.slice(6));
    // approximate: check if any day of that week falls in the target month
    // For simplicity, include the week if its Monday is in the target month OR
    // its Sunday is in the target month (crude but common approach).
    const monday = mondayOf(year, w);
    const sunday = new Date(monday);
    sunday.setUTCDate(monday.getUTCDate() + 6);
    if (monday.getUTCMonth() + 1 === month || sunday.getUTCMonth() + 1 === month) {
      const days = p[wk];
      Object.values(days).forEach((v) => {
        s += typeof v === 'object' ? (v as WlDay).h || 0 : (v as number) || 0;
      });
    }
  });
  return s;
}

/** Hours in date range (inclusive) for a person. Range: 'YYYY-MM-DD' .. 'YYYY-MM-DD' */
export function wlPersonRange(wl: Worklog, person: string, from: string, to: string): number {
  const p = wl[person];
  if (!p) return 0;
  let s = 0;
  Object.keys(p).forEach((wk) => {
    const y = parseInt(wk.slice(0, 4));
    const w = parseInt(wk.slice(6));
    const monday = mondayOf(y, w);
    const days = p[wk];
    for (let d = 1; d <= 7; d++) {
      const day = new Date(monday);
      day.setUTCDate(monday.getUTCDate() + (d - 1));
      const iso = day.toISOString().slice(0, 10);
      if (iso >= from && iso <= to) {
        const v = days[d];
        s += typeof v === 'object' ? (v as WlDay).h || 0 : (v as number) || 0;
      }
    }
  });
  return s;
}

/** Hours aggregated per WBS task (by task field in day entry) */
export function wlHoursByTask(wl: Worklog): Record<string, number> {
  const out: Record<string, number> = {};
  Object.values(wl).forEach((person) => {
    Object.values(person).forEach((week) => {
      Object.values(week).forEach((v) => {
        if (typeof v === 'object' && v.task) {
          out[v.task] = (out[v.task] || 0) + (v.h || 0);
        }
      });
    });
  });
  return out;
}

// ── Write helpers ───────────────────────────────────────────────────
export function wlSetHours(person: string, y: number, w: number, dow: number, hours: number): void {
  worklog.update((wl) => {
    const copy: Worklog = structuredClone(wl);
    const k = weekKey(y, w);
    if (!copy[person]) copy[person] = {};
    if (!copy[person][k]) copy[person][k] = {};
    const existing = copy[person][k][dow];
    const obj: WlDay =
      existing && typeof existing === 'object' ? { ...existing } : { h: 0 };
    obj.h = Math.max(0, hours);
    copy[person][k][dow] = obj;
    return copy;
  });
}

// ── private helper ──────────────────────────────────────────────────
function mondayOf(y: number, w: number): Date {
  const simple = new Date(Date.UTC(y, 0, 1 + (w - 1) * 7));
  const dow = simple.getUTCDay() || 7;
  const mon = new Date(simple);
  mon.setUTCDate(simple.getUTCDate() - (dow - 1));
  return mon;
}
