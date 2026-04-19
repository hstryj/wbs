/**
 * Auth store — abstrakcja nad Supabase Auth.
 * App działa bez logowania (anonymous mode), ale zalogowany użytkownik
 * dostaje cloud sync (w następnej sesji podpiniemy stores do Supabase).
 */
import { writable } from 'svelte/store';
import type { User, Session } from '@supabase/supabase-js';
import { supabase, isConfigured } from '../supabase/client';

export interface AuthState {
  user: User | null;
  session: Session | null;
  loading: boolean;
  /** True jeśli env vars są ustawione i klient odpalony. Gdy false,
   * UI powinno ukryć przyciski logowania i pokazać info o trybie lokalnym. */
  configured: boolean;
}

export const auth = writable<AuthState>({
  user: null,
  session: null,
  loading: isConfigured,
  configured: isConfigured
});

if (supabase) {
  // Initial session load
  supabase.auth.getSession().then(({ data }) => {
    auth.update((s) => ({
      ...s,
      user: data.session?.user ?? null,
      session: data.session,
      loading: false
    }));
  });

  // Subscribe do wszystkich zmian stanu (login, logout, token refresh, itd.)
  supabase.auth.onAuthStateChange((_event, session) => {
    auth.update((s) => ({
      ...s,
      user: session?.user ?? null,
      session,
      loading: false
    }));
  });
}

// ── Actions ───────────────────────────────────────────────────────

export async function signIn(email: string, password: string): Promise<{ error: string | null }> {
  if (!supabase) return { error: 'Supabase nie skonfigurowany' };
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  return { error: error?.message ?? null };
}

export async function signUp(email: string, password: string): Promise<{ error: string | null; needsConfirmation: boolean }> {
  if (!supabase) return { error: 'Supabase nie skonfigurowany', needsConfirmation: false };
  const { data, error } = await supabase.auth.signUp({ email, password });
  return {
    error: error?.message ?? null,
    needsConfirmation: !error && !data.session // gdy brak session po signUp → Supabase czeka na email confirmation
  };
}

export async function signOut(): Promise<void> {
  if (!supabase) return;
  await supabase.auth.signOut();
}

export async function sendMagicLink(email: string): Promise<{ error: string | null }> {
  if (!supabase) return { error: 'Supabase nie skonfigurowany' };
  const { error } = await supabase.auth.signInWithOtp({ email });
  return { error: error?.message ?? null };
}
