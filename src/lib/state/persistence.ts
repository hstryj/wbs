import type { Writable } from 'svelte/store';

/**
 * Persist a Svelte store to localStorage.
 * Reads initial value on first call, then writes on every change.
 */
export function persistStore<T>(store: Writable<T>, key: string): void {
  if (typeof localStorage === 'undefined') return;
  try {
    const raw = localStorage.getItem(key);
    if (raw !== null) {
      store.set(JSON.parse(raw));
    }
  } catch {
    // stale or corrupt — ignore, keep default
  }
  store.subscribe((value) => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {
      // quota exceeded or unavailable — silent
    }
  });
}
