import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { AppState, Platform } from 'react-native';

/**
 * Supabase client.
 *
 * Credentials come exclusively from public env vars (never hardcoded):
 *   EXPO_PUBLIC_SUPABASE_URL
 *   EXPO_PUBLIC_SUPABASE_ANON_KEY
 *
 * When they are absent the client is `null` and the app stays fully usable
 * offline — auth is simply disabled (see `isSupabaseConfigured`).
 */
const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = Boolean(url && anonKey);

/**
 * The Supabase client eagerly resolves a WebSocket transport at construction,
 * which throws on Node < 22 (e.g. Metro's web prerender). Provide one
 * explicitly: the real global when present (used by online Realtime), else a
 * harmless stub for prerender where no channels are opened.
 */
const realtimeTransport = (globalThis as { WebSocket?: unknown }).WebSocket ?? class {};

export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(url as string, anonKey as string, {
      auth: {
        storage: AsyncStorage,
        autoRefreshToken: true,
        persistSession: true,
        // Only the web build comes back to a URL carrying the auth response.
        detectSessionInUrl: Platform.OS === 'web',
        flowType: 'pkce',
      },
      realtime: { transport: realtimeTransport as never },
    })
  : null;

// Keep tokens fresh while the app is foregrounded (recommended for native).
if (supabase && Platform.OS !== 'web') {
  AppState.addEventListener('change', (state) => {
    if (state === 'active') supabase.auth.startAutoRefresh();
    else supabase.auth.stopAutoRefresh();
  });
}
