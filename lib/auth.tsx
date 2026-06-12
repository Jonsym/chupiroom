import type { Provider, Session, User } from '@supabase/supabase-js';
import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { Platform } from 'react-native';

import { isSupabaseConfigured, supabase } from './supabase';

// Lets the in-app browser auto-close after returning from an OAuth provider.
WebBrowser.maybeCompleteAuthSession();

/** Supabase project URL (from env) and the callback Google must allow-list. */
const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
const GOOGLE_CALLBACK = SUPABASE_URL ? `${SUPABASE_URL}/auth/v1/callback` : '';

/**
 * Where the OAuth provider returns to once the user authorizes:
 *  - web: the current origin (must be an allowed Redirect URL in Supabase).
 *  - native: a deep link back into the app via the configured scheme.
 */
export function getOAuthRedirectTo(): string {
  if (Platform.OS === 'web') {
    return typeof window !== 'undefined' ? window.location.origin : '';
  }
  return Linking.createURL('/');
}

type MaybeAuthError = {
  status?: number;
  code?: string;
  error?: string;
  error_description?: string;
  message?: string;
  name?: string;
};

/** Map Supabase / OAuth errors (esp. 400s) to clear Spanish copy for the UI. */
export function describeOAuthError(error: unknown): string {
  const e = (error ?? {}) as MaybeAuthError;
  const message = (e.message || e.error_description || '').toLowerCase();
  const code = (e.code || e.error || '').toLowerCase();
  const status = e.status;

  if (
    message.includes('provider is not enabled') ||
    message.includes('unsupported provider') ||
    message.includes('missing oauth')
  ) {
    return 'Google no está habilitado en Supabase (Authentication → Providers).';
  }
  if (message.includes('redirect') || message.includes('not allowed') || code.includes('redirect')) {
    return 'La URL de redirección no está permitida en Supabase (Authentication → URL Configuration).';
  }
  if (
    message.includes('bad_oauth_state') ||
    message.includes('flow state') ||
    message.includes('code verifier') ||
    code.includes('bad_oauth_state')
  ) {
    return 'La sesión de Google caducó. Inténtalo de nuevo.';
  }
  if (message.includes('access_denied') || code.includes('access_denied')) {
    return 'Cancelaste el inicio de sesión con Google.';
  }
  if (message.includes('network') || message.includes('fetch') || message.includes('failed to')) {
    return 'Sin conexión. Revisa tu internet e inténtalo de nuevo.';
  }
  if (status === 400) {
    return 'No se pudo iniciar sesión con Google. Revisa el proveedor y las URLs de redirección en Supabase.';
  }
  return 'No se pudo iniciar sesión con Google. Inténtalo de nuevo.';
}

/**
 * Web only: after returning from the provider, any error arrives as URL
 * query/hash params (e.g. ?error=...). Read it, clean the URL, and return a
 * clear Spanish message — otherwise the error is silently lost on redirect.
 */
export function getOAuthErrorFromUrl(): string | null {
  if (Platform.OS !== 'web' || typeof window === 'undefined') return null;
  const read = (s: string) => new URLSearchParams(s.replace(/^[?#]/, ''));
  const search = read(window.location.search);
  const hash = read(window.location.hash);
  const error = search.get('error') || hash.get('error');
  const description = search.get('error_description') || hash.get('error_description');
  if (!error && !description) return null;
  console.warn('[auth] OAuth redirect returned an error', { error, description });
  try {
    window.history.replaceState({}, '', window.location.origin + window.location.pathname);
  } catch {
    // non-critical URL cleanup
  }
  return describeOAuthError({
    status: 400,
    code: error ?? undefined,
    error_description: description ?? undefined,
  });
}

/**
 * Start an OAuth sign-in. On web Supabase performs a full-page redirect; on
 * native we open a secure auth session and exchange the returned code.
 *
 * The exact redirect + callback values (the usual cause of OAuth 400s) are
 * logged in dev, and failures are rethrown as a clear Spanish message.
 */
export async function signInWithProvider(provider: Provider) {
  if (!supabase) throw new Error('Supabase no está configurado.');
  const redirectTo = getOAuthRedirectTo();

  if (__DEV__) {
    console.info('[auth] OAuth start', {
      provider,
      platform: Platform.OS,
      redirectTo,
      supabaseUrl: SUPABASE_URL,
      googleCallbackToAllow: GOOGLE_CALLBACK,
    });
  }

  try {
    if (Platform.OS === 'web') {
      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: { redirectTo: redirectTo || undefined },
      });
      if (error) throw error;
      return; // full-page redirect + onAuthStateChange complete the flow
    }

    const { data, error } = await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo, skipBrowserRedirect: true },
    });
    if (error) throw error;
    if (!data?.url) throw new Error('No se pudo iniciar la sesión.');

    const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
    if (result.type !== 'success') return; // user dismissed/cancelled — not an error

    const params = Linking.parse(result.url).queryParams ?? {};
    if (typeof params.error === 'string' || typeof params.error_description === 'string') {
      const callbackError: MaybeAuthError = {
        status: 400,
        code: typeof params.error === 'string' ? params.error : undefined,
        error_description:
          typeof params.error_description === 'string' ? params.error_description : undefined,
      };
      const err = new Error('oauth_callback_error');
      Object.assign(err, callbackError);
      throw err;
    }
    const code = params.code;
    if (typeof code === 'string') {
      const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
      if (exchangeError) throw exchangeError;
    }
  } catch (error) {
    const e = error as MaybeAuthError;
    console.warn('[auth] OAuth failed', {
      provider,
      redirectTo,
      status: e?.status,
      code: e?.code ?? e?.error,
      name: e?.name,
      message: e?.message ?? e?.error_description,
    });
    throw new Error(describeOAuthError(error));
  }
}

/** Email + password sign-in. Throws the Supabase error on failure. */
export async function signInWithEmail(email: string, password: string) {
  if (!supabase) throw new Error('Supabase no está configurado.');
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
}

/** Guest access via Supabase anonymous sign-in (registered users get more later). */
export async function signInAsGuest() {
  if (!supabase) throw new Error('Supabase no está configurado.');
  const { error } = await supabase.auth.signInAnonymously();
  if (error) throw error;
}

/** Profile fields collected during registration. */
export type RegisterProfile = {
  firstName: string;
  lastName: string;
  phone: string;
};

/**
 * Email + password registration. The profile is stored on the auth user's
 * metadata (always) and — when a session is returned (email confirmation off) —
 * mirrored into the `profiles` table. The DB trigger handles the table
 * server-side regardless, so the client write is best-effort/non-fatal.
 *
 * Returns whether the account still needs email confirmation (no session yet).
 */
export async function signUpWithEmail(email: string, password: string, profile: RegisterProfile) {
  if (!supabase) throw new Error('Supabase no está configurado.');
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      // raw_user_meta_data — the DB trigger reads these to fill `profiles`.
      data: {
        first_name: profile.firstName,
        last_name: profile.lastName,
        phone: profile.phone,
      },
    },
  });
  if (error) throw error;

  if (data.session?.user) {
    try {
      const { error: profileError } = await supabase.from('profiles').upsert({
        id: data.session.user.id,
        first_name: profile.firstName,
        last_name: profile.lastName,
        phone: profile.phone,
        email,
        updated_at: new Date().toISOString(),
      });
      if (profileError) console.warn('[auth] profile upsert skipped:', profileError.message);
    } catch (e) {
      // Missing table / RLS / no network must never break a successful signup.
      console.warn('[auth] profile upsert error:', e);
    }
  }

  return { needsConfirmation: !data.session };
}

/** A user's display profile. */
export type Profile = {
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
};

/** Build a profile from the auth user's metadata + email (no network). */
export function profileFromUser(user: User | null): Profile {
  const meta = (user?.user_metadata ?? {}) as Record<string, unknown>;
  const str = (v: unknown) => (typeof v === 'string' ? v : '');
  return {
    firstName: str(meta.first_name),
    lastName: str(meta.last_name),
    phone: str(meta.phone),
    email: user?.email ?? '',
  };
}

/**
 * Validate the persisted session against the server.
 *  - 'valid'   : token + user OK
 *  - 'invalid' : token rejected or user deleted (401/403) — caller should sign out
 *  - 'unknown' : offline / other — keep the session (don't log out offline users)
 */
export async function validateSession(): Promise<'valid' | 'invalid' | 'unknown'> {
  if (!supabase) return 'unknown';
  try {
    const { data, error } = await supabase.auth.getUser();
    if (error) {
      const status = (error as { status?: number }).status;
      return status === 401 || status === 403 ? 'invalid' : 'unknown';
    }
    return data.user ? 'valid' : 'invalid';
  } catch {
    return 'unknown';
  }
}

/** Read the profile row from the `profiles` table (or null if unavailable). */
export async function fetchProfileRow(userId: string): Promise<Partial<Profile> | null> {
  if (!supabase) return null;
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('first_name,last_name,phone,email')
      .eq('id', userId)
      .maybeSingle();
    if (error || !data) return null;
    return {
      firstName: data.first_name ?? undefined,
      lastName: data.last_name ?? undefined,
      phone: data.phone ?? undefined,
      email: data.email ?? undefined,
    };
  } catch {
    return null;
  }
}

type AuthValue = {
  session: Session | null;
  user: User | null;
  loading: boolean;
  /** True only when valid Supabase env vars are present. */
  configured: boolean;
  /** True when the signed-in user is an anonymous guest. */
  isGuest: boolean;
  /** Spanish OAuth error captured from a web redirect (or null). */
  oauthError: string | null;
  clearOAuthError: () => void;
  signInWithGoogle: () => Promise<void>;
  signInAsGuest: () => Promise<void>;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  signUpWithEmail: (
    email: string,
    password: string,
    profile: RegisterProfile,
  ) => Promise<{ needsConfirmation: boolean }>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthValue>({
  session: null,
  user: null,
  loading: false,
  configured: false,
  isGuest: false,
  oauthError: null,
  clearOAuthError: () => {},
  signInWithGoogle: async () => {},
  signInAsGuest: async () => {},
  signInWithEmail: async () => {},
  signUpWithEmail: async () => ({ needsConfirmation: false }),
  signOut: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  // Only "loading" while we resolve a real session from a configured backend.
  const [loading, setLoading] = useState(isSupabaseConfigured);
  // Capture any OAuth error returned in the web redirect URL (once, on mount).
  const [oauthError, setOAuthError] = useState<string | null>(() => getOAuthErrorFromUrl());
  const clearOAuthError = useCallback(() => setOAuthError(null), []);

  useEffect(() => {
    if (!supabase) {
      setLoading(false);
      return;
    }
    let active = true;
    supabase.auth
      .getSession()
      .then(({ data }) => {
        if (!active) return;
        setSession(data.session);
        setLoading(false);
        // A persisted session may be stale (user deleted / token revoked).
        // Validate against the server and sign out only on a definitive
        // rejection — never on a mere network failure (keeps offline working).
        if (data.session) {
          validateSession().then((status) => {
            if (active && status === 'invalid') supabase?.auth.signOut();
          });
        }
      })
      .catch(() => {
        // Never let a transient session-restore failure brick the app.
        if (active) setLoading(false);
      });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next);
    });
    return () => {
      active = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  const signInWithGoogle = useCallback(() => signInWithProvider('google'), []);
  const signInGuest = useCallback(() => signInAsGuest(), []);
  const signInEmail = useCallback(
    (email: string, password: string) => signInWithEmail(email, password),
    [],
  );
  const signUpEmail = useCallback(
    (email: string, password: string, profile: RegisterProfile) =>
      signUpWithEmail(email, password, profile),
    [],
  );
  const signOut = useCallback(async () => {
    await supabase?.auth.signOut();
  }, []);

  const value = useMemo<AuthValue>(
    () => ({
      session,
      user: session?.user ?? null,
      loading,
      configured: isSupabaseConfigured,
      isGuest: Boolean((session?.user as { is_anonymous?: boolean } | undefined)?.is_anonymous),
      oauthError,
      clearOAuthError,
      signInWithGoogle,
      signInAsGuest: signInGuest,
      signInWithEmail: signInEmail,
      signUpWithEmail: signUpEmail,
      signOut,
    }),
    [
      session,
      loading,
      oauthError,
      clearOAuthError,
      signInWithGoogle,
      signInGuest,
      signInEmail,
      signUpEmail,
      signOut,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
