import { createServerClient } from "@supabase/ssr";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";

/**
 * Merge the shared-domain option into every cookie Supabase writes.
 * When NEXT_PUBLIC_COOKIE_DOMAIN = ".deepvortexai.art", the session cookie
 * is accessible to all subdomains so a login on any subdomain is recognized
 * everywhere without a second sign-in.
 */
function withDomain(options: Record<string, unknown>): Record<string, unknown> {
  const domain = process.env.NEXT_PUBLIC_COOKIE_DOMAIN;
  return domain ? { ...options, domain } : options;
}

export async function createClient() {
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              cookieStore.set(name, value, withDomain(options as any) as any)
            );
          } catch {
            // Called from a Server Component — can be ignored; middleware will
            // have already refreshed the session.
          }
        },
      },
    }
  );
}

/**
 * Admin client using the service role key.
 * Bypasses RLS — use only in server-side API routes.
 * Does NOT use cookies, so it works in all contexts (including Stripe webhooks).
 */
export function createServiceClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}
