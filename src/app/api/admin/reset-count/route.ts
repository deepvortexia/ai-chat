import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/server";

/**
 * POST /api/admin/reset-count
 * Resets the authenticated user's message_count to 0.
 * Protected: only works for the signed-in user (resets their own count).
 * Useful for testing the 8-message trial flow without creating new accounts.
 *
 * Call from the browser console or Postman:
 *   fetch('/api/admin/reset-count', { method: 'POST' }).then(r => r.json()).then(console.log)
 */
export async function POST() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  const svc = createServiceClient();

  const { error } = await svc
    .from("profiles")
    .update({ message_count: 0 })
    .eq("id", user.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    success: true,
    message: `message_count reset to 0 for ${user.email}`,
  });
}
