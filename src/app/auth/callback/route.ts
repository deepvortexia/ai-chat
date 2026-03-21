import { createServerClient } from "@supabase/ssr";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

/**
 * Supabase PKCE callback handler.
 *
 * After Google OAuth or magic-link sign-in, Supabase redirects here with a
 * one-time `code` query param.  We:
 *   1. Exchange the code for a session and write the session cookie with the
 *      shared domain so all subdomains (chat, hub, etc.) recognise the login.
 *   2. Auto-upsert the user's profile row so message_count is always tracked.
 *   3. Redirect to home (or the `next` param).
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/";

  if (code) {
    const cookieStore  = await cookies();
    const cookieDomain = process.env.NEXT_PUBLIC_COOKIE_DOMAIN;

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookieOptions: { name: "deepvortex-auth" },
        cookies: {
          getAll() { return cookieStore.getAll(); },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(
                name,
                value,
                cookieDomain ? { ...options, domain: cookieDomain } : options
              )
            );
          },
        },
      }
    );

    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      // Auto-create the profile row for new users so message_count is always
      // tracked correctly. ignoreDuplicates means existing profiles are untouched.
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const svc = createSupabaseClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!
          );
          await svc.from("profiles").upsert(
            {
              id:            user.id,
              email:         user.email         ?? null,
              full_name:     user.user_metadata?.full_name  ?? null,
              avatar_url:    user.user_metadata?.avatar_url ?? null,
              is_subscribed: false,
              message_count: 0,
              last_reset_at: new Date().toISOString(),
            },
            { onConflict: "id", ignoreDuplicates: true }
          );
        }
      } catch (profileErr) {
        // Non-fatal — log but don't block the redirect
        console.warn("Profile upsert failed:", profileErr);
      }

      return NextResponse.redirect(`${origin}${next}`);
    }

    console.error("Auth callback error:", error.message);
  }

  return NextResponse.redirect(`${origin}/?auth_error=1`);
}
