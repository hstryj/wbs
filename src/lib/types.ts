// Core domain types ported from monolith (legacy/index.html)

export type Priority = '' | 'Krytyczny' | 'Wysoki' | 'Średni' | 'Niski';
export type RAG = '' | 'G' | 'A' | 'R';
export type RiskLevel = 'H' | 'M' | 'L';

/** WBS node — can be a project (isProject=true), section, sub-section, or leaf task */
export interface WbsNode {
  id: number;
  name: string;
  weight: number;
  done: number;
  resp: string;
  priority: Priority;
  rag: RAG;
  note: string;
  dateStart: string;
  dateEnd: string;
  md: number;
  isProject: boolean;
  children: WbsNode[];
  collapsed: boolean;
  /** assigned in assignCodes() — e.g. "1.2.3" */
  _code?: string;
}

export interface Person {
  id: number | string;
  name?: string;
  email?: string;
  phone?: string;
  role?: string;
  company?: string;
  group?: string;
  color?: string;
  avatar?: string;
}

export interface Risk {
  id: number;
  desc: string;
  prob: RiskLevel;
  impact: RiskLevel;
  owner: string;
  mitigation: string;
}

export interface Material {
  id: string;
  code?: string;
  name: string;
  cat?: string;
  unit?: string;
  price?: number;
  currency?: string;
}

export interface ChangelogEntry {
  type: 'edit' | 'snap' | 'load';
  msg: string;
  ts: string;
}

export interface Snapshot {
  id: number;
  name: string;
  ts: string;
  tree: string;
  people: string;
  overall: string | number;
}

/* Worklog type lives w src/lib/state/worklog.ts (ma bogatszy kształt z WlDay). */

export type TabName =
  | 'table' | 'dash' | 'chart' | 'wfall' | 'team' | 'rank'
  | 'gantt' | 'risk' | 'report' | 'log' | 'wlreport' | 'orders' | 'admin'
  | 'personal';
