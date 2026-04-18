import { writable } from 'svelte/store';
import type { Risk, RiskLevel } from '../types';
import { persistStore } from './persistence';

export const risks = writable<Risk[]>([]);
persistStore(risks, 'wbs_risks');

let _riskUid = 1;

export function computeLevel(prob: RiskLevel, impact: RiskLevel): RiskLevel {
  if (prob === 'H' || impact === 'H') return 'H';
  if (prob === 'L' && impact === 'L') return 'L';
  return 'M';
}

export function addRisk(desc: string, prob: RiskLevel, impact: RiskLevel, owner: string, mitigation: string): void {
  const trimmed = desc.trim();
  if (!trimmed) return;
  risks.update((list) => [
    ...list,
    { id: _riskUid++, desc: trimmed, prob, impact, owner: owner.trim(), mitigation: mitigation.trim() }
  ]);
}

export function delRisk(id: number): void {
  risks.update((list) => list.filter((r) => r.id !== id));
}
