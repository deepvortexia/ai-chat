import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Refresh the Supabase session on every request so:
 *  - Server components always see a valid session
 *  - Expired tokens are silently refreshed before they hit an API route
 *
 * Cookies are written with NEXT_PUBLIC_COOKIE_DOMAIN (e.g. ".deepvortexai.art")
 * so the same session is shared across all subdomains.
 */
export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request });

  const cookieDomain = process.env.NEXT_PUBLIC_COOKIE_DOMAIN;

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          // 1. Forward refreshed cookies into the outgoing request
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          // 2. Rebuild the response with those cookies
          response = NextResponse.next({ request });
          // 3. Write to the response with the shared domain
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(
              name,
              value,
              cookieDomain ? { ...options, domain: cookieDomain } : options
            )
          );
        },
      },
    }
  );

  // getUser() triggers a token refresh if the access token is expired
  await supabase.auth.getUser();

  return response;
}

export const config = {
  matcher: [
    /*
     * Run on all routes except Next.js internals and static assets.
     * This ensures sessions are refreshed before every page and API call.
     */
    "/((?!_next/static|_next/image|favicon.ico|logo\\.png|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
