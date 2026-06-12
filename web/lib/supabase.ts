import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Supabase browser client for the ChupiRoom web companion.
 *
 * Credentials come only from public env vars (never hardcoded):
 *   NEXT_PUBLIC_SUPABASE_URL
 *   NEXT_PUBLIC_SUPABASE_ANON_KEY
 *
 * The companion is read-only (Phase 2): it connects to the SAME Supabase
 * backend as the mobile app and only reads rooms/state. The mobile RLS SELECT
 * policies are `to authenticated`, so a viewer needs a session — we sign in
 * anonymously (the same mechanism mobile guests use). No schema/SQL changes.
 */
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = Boolean(url && anonKey);

let client: SupabaseClient | null = null;

/** Lazily create the browser client (only in the browser; null on the server). */
export function getSupabase(): SupabaseClient | null {
  if (!isSupabaseConfigured || typeof window === "undefined") return null;
  if (!client) {
    client = createClient(url as string, anonKey as string, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: false,
      },
    });
  }
  return client;
}

/**
 * Ensure an (anonymous) session exists so reads pass the `authenticated` RLS
 * policies. Throws if anonymous sign-in is rejected (e.g. disabled in Supabase)
 * so callers can surface a clear connection error.
 */
export async function ensureSession(): Promise<void> {
  const supabase = getSupabase();
  if (!supabase) return;
  const { data } = await supabase.auth.getSession();
  if (data.session) return;
  const { error } = await supabase.auth.signInAnonymously();
  if (error) throw error;
}
