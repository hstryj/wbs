/**
 * Singleton klient Supabase — reads credentials z Vite env vars.
 * Jeśli brak .env.local, klient.isConfigured === false i app działa
 * bez cloud sync (tylko localStorage).
 */
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const anon = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

export const isConfigured: boolean = Boolean(url && anon && url !== 'https://xxxxxxxxxxxx.supabase.co');

let _client: SupabaseClient | null = null;

if (isConfigured) {
  _client = createClient(url!, anon!, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true
    }
  });
}

/** Get the Supabase client. Throws if not configured — wołaj tylko po `isConfigured` check. */
export function getClient(): SupabaseClient {
  if (!_client) {
    throw new Error('Supabase nie skonfigurowany — brak VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY w .env.local');
  }
  return _client;
}

/** Safe accessor — zwraca null jeśli nie skonfigurowany (dla komponentów które działają w obu trybach). */
export const supabase: SupabaseClient | null = _client;
