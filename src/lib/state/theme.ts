import { writable } from 'svelte/store';

export type Theme = 'light' | 'dark';

function getInitialTheme(): Theme {
  if (typeof document === 'undefined') return 'light';
  try {
    const stored = localStorage.getItem('wbs_theme');
    if (stored === 'light' || stored === 'dark') return stored;
  } catch {}
  if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) return 'dark';
  return 'light';
}

function applyTheme(t: Theme): void {
  if (typeof document === 'undefined') return;
  document.documentElement.setAttribute('data-theme', t);
  // Also update the meta[name=theme-color] for mobile address bar
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute('content', t === 'dark' ? '#020617' : '#1e293b');
}

export const theme = writable<Theme>(getInitialTheme());

if (typeof document !== 'undefined') {
  theme.subscribe((t) => {
    applyTheme(t);
    try { localStorage.setItem('wbs_theme', t); } catch {}
  });
}

export function toggleTheme(): void {
  theme.update((t) => (t === 'light' ? 'dark' : 'light'));
}
