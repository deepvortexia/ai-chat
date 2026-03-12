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

export function createClient(): SupabaseClient {
  if (_client) return _client;

  const domain = process.env.NEXT_PUBLIC_COOKIE_DOMAIN; // ".deepvortexai.art"

  _client = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    domain
      ? {
          cookieOptions: {
            domain,
            path:     "/",
            sameSite: "lax" as const,
            secure:   true,
            maxAge:   60 * 60 * 24 * 365, // 1 year
          },
        }
      : undefined
  );

  return _client;
}
