import type { Priority } from '../types';

export const PRIORITIES: Priority[] = ['', 'Krytyczny', 'Wysoki', 'Średni', 'Niski'];

export const PRIORITY_ORDER: Record<Priority, number> = {
  'Krytyczny': 0,
  'Wysoki': 1,
  'Średni': 2,
  'Niski': 3,
  '': 4
};

export const PRIORITY_COLOR: Record<Priority, string> = {
  'Krytyczny': '#cc0000',
  'Wysoki':    '#cc5500',
  'Średni':    '#2E75B6',
  'Niski':     '#3B7A1E',
  '':          '#5a7aaa'
};

export const PRIORITY_DOT: Record<Priority, string> = {
  'Krytyczny': '🔴',
  'Wysoki':    '🟠',
  'Średni':    '🔵',
  'Niski':     '🟢',
  '':          ''
};
