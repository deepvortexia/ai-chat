import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Module-level singleton — every import gets the exact same Supabase client
 * instance, so there is only one in-memory session cache and one
 * onAuthStateChange event bus for the whole browser tab.
 *
 * Cookie domain is set to NEXT_PUBLIC_COOKIE_DOMAIN (.deepvortexai.art) so
 * auth cookies are readable by all subdomains.  A login on deepvortexai.art
 * (Hub) is therefore automatically visible on chat.deepvortexai.art.
 */
let _client: SupabaseClient | null = null;

let _pkceCleanupDone = false;

export function createClient(): SupabaseClient {
  const domain = process.env.NEXT_PUBLIC_COOKIE_DOMAIN; // ".deepvortexai.art"
  console.log("[supabase/client] NEXT_PUBLIC_COOKIE_DOMAIN =", domain);

  // One-time cleanup: remove stale PKCE code-verifier cookies left over from
  // before the implicit flow migration — they confuse the Supabase auth state machine.
  if (!_pkceCleanupDone && typeof document !== 'undefined') {
    document.cookie.split(';').forEach((c) => {
      const name = c.trim().split('=')[0];
      if (name.includes('code-verifier')) {
        document.cookie = `${name}=; path=/; max-age=0; secure; samesite=lax${domain ? `; domain=${domain}` : ''}`;
      }
    });
    _pkceCleanupDone = true;
  }

  if (_client) return _client;

  const cookieStorage = {
    getItem: (key: string) => {
      if (typeof document === 'undefined') return null;
      const match = document.cookie.match(new RegExp('(^| )' + key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '=([^;]+)'));
      return match ? decodeURIComponent(match[2]) : null;
    },
    setItem: (key: string, value: string) => {
      if (typeof document === 'undefined') return;
      document.cookie = `${key}=${encodeURIComponent(value)}; path=/; max-age=${60 * 60 * 24 * 365}; secure; samesite=lax${domain ? `; domain=${domain}` : ''}`;
    },
    removeItem: (key: string) => {
      if (typeof document === 'undefined') return;
      document.cookie = `${key}=; path=/; max-age=0; secure; samesite=lax${domain ? `; domain=${domain}` : ''}`;
    },
  };

  _client = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookieOptions: {
        name:    "deepvortex-auth",
        ...(domain ? {
          domain,
          path:     "/",
          sameSite: "lax" as const,
          secure:   true,
          maxAge:   60 * 60 * 24 * 365, // 1 year
        } : {}),
      },
      auth: {
        storage:  cookieStorage,
        flowType: "pkce",
      },
    } as any
  );

  return _client;
}
