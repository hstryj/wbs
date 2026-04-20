import type { TabName } from '../types';

export interface TabTone {
  solid: string;
  ink: string;
  tint: string;
  tintStrong: string;
  glow: string;
  heroFrom: string;
  heroTo: string;
}

const TAB_TONES: Record<TabName, TabTone> = {
  dash: {
    solid: '#2f7d6a',
    ink: '#1f5d50',
    tint: 'rgba(47, 125, 106, 0.12)',
    tintStrong: 'rgba(47, 125, 106, 0.22)',
    glow: 'rgba(47, 125, 106, 0.18)',
    heroFrom: '#184b43',
    heroTo: '#2f7d6a'
  },
  table: {
    solid: '#2e75b6',
    ink: '#1d4d8c',
    tint: 'rgba(46, 117, 182, 0.12)',
    tintStrong: 'rgba(46, 117, 182, 0.22)',
    glow: 'rgba(46, 117, 182, 0.18)',
    heroFrom: '#12345d',
    heroTo: '#2e75b6'
  },
  rank: {
    solid: '#c27a1b',
    ink: '#8d5a14',
    tint: 'rgba(194, 122, 27, 0.12)',
    tintStrong: 'rgba(194, 122, 27, 0.22)',
    glow: 'rgba(194, 122, 27, 0.18)',
    heroFrom: '#6f4a18',
    heroTo: '#c27a1b'
  },
  team: {
    solid: '#1f7a88',
    ink: '#145864',
    tint: 'rgba(31, 122, 136, 0.12)',
    tintStrong: 'rgba(31, 122, 136, 0.22)',
    glow: 'rgba(31, 122, 136, 0.18)',
    heroFrom: '#134b55',
    heroTo: '#1f7a88'
  },
  admin: {
    solid: '#365bb8',
    ink: '#28468d',
    tint: 'rgba(54, 91, 184, 0.12)',
    tintStrong: 'rgba(54, 91, 184, 0.22)',
    glow: 'rgba(54, 91, 184, 0.18)',
    heroFrom: '#243c7e',
    heroTo: '#365bb8'
  },
  gantt: {
    solid: '#6b5bd2',
    ink: '#5144a6',
    tint: 'rgba(107, 91, 210, 0.12)',
    tintStrong: 'rgba(107, 91, 210, 0.22)',
    glow: 'rgba(107, 91, 210, 0.18)',
    heroFrom: '#44398f',
    heroTo: '#6b5bd2'
  },
  personal: {
    solid: '#a45d88',
    ink: '#7d4967',
    tint: 'rgba(164, 93, 136, 0.12)',
    tintStrong: 'rgba(164, 93, 136, 0.22)',
    glow: 'rgba(164, 93, 136, 0.18)',
    heroFrom: '#6f415b',
    heroTo: '#a45d88'
  },
  wlreport: {
    solid: '#2e84a6',
    ink: '#215f76',
    tint: 'rgba(46, 132, 166, 0.12)',
    tintStrong: 'rgba(46, 132, 166, 0.22)',
    glow: 'rgba(46, 132, 166, 0.18)',
    heroFrom: '#174d62',
    heroTo: '#2e84a6'
  },
  orders: {
    solid: '#9a6a31',
    ink: '#744f24',
    tint: 'rgba(154, 106, 49, 0.12)',
    tintStrong: 'rgba(154, 106, 49, 0.22)',
    glow: 'rgba(154, 106, 49, 0.18)',
    heroFrom: '#63431f',
    heroTo: '#9a6a31'
  },
  risk: {
    solid: '#b1536d',
    ink: '#823a4f',
    tint: 'rgba(177, 83, 109, 0.12)',
    tintStrong: 'rgba(177, 83, 109, 0.22)',
    glow: 'rgba(177, 83, 109, 0.18)',
    heroFrom: '#753748',
    heroTo: '#b1536d'
  },
  report: {
    solid: '#4e6d93',
    ink: '#39516d',
    tint: 'rgba(78, 109, 147, 0.12)',
    tintStrong: 'rgba(78, 109, 147, 0.22)',
    glow: 'rgba(78, 109, 147, 0.18)',
    heroFrom: '#31455f',
    heroTo: '#4e6d93'
  },
  chart: {
    solid: '#4f7d44',
    ink: '#3a5e33',
    tint: 'rgba(79, 125, 68, 0.12)',
    tintStrong: 'rgba(79, 125, 68, 0.22)',
    glow: 'rgba(79, 125, 68, 0.18)',
    heroFrom: '#324f2d',
    heroTo: '#4f7d44'
  },
  wfall: {
    solid: '#5868a8',
    ink: '#404d7f',
    tint: 'rgba(88, 104, 168, 0.12)',
    tintStrong: 'rgba(88, 104, 168, 0.22)',
    glow: 'rgba(88, 104, 168, 0.18)',
    heroFrom: '#39446d',
    heroTo: '#5868a8'
  },
  log: {
    solid: '#6c5e86',
    ink: '#4f455f',
    tint: 'rgba(108, 94, 134, 0.12)',
    tintStrong: 'rgba(108, 94, 134, 0.22)',
    glow: 'rgba(108, 94, 134, 0.18)',
    heroFrom: '#463c56',
    heroTo: '#6c5e86'
  }
};

export function getTabTone(tab: TabName): TabTone {
  return TAB_TONES[tab] ?? TAB_TONES.table;
}

export function tabToneVars(tab: TabName): string {
  const tone = getTabTone(tab);
  return [
    `--tab-solid:${tone.solid}`,
    `--tab-ink:${tone.ink}`,
    `--tab-tint:${tone.tint}`,
    `--tab-tint-strong:${tone.tintStrong}`,
    `--tab-glow:${tone.glow}`,
    `--tab-hero-from:${tone.heroFrom}`,
    `--tab-hero-to:${tone.heroTo}`
  ].join(';');
}
