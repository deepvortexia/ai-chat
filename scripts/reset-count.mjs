/**
 * scripts/reset-count.mjs
 * Reset message_count to 0 for a specific user email.
 * Usage: node scripts/reset-count.mjs your@email.com
 *
 * To reset ALL non-subscribed users (use carefully):
 *   node scripts/reset-count.mjs --all
 */
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const envPath   = resolve(__dirname, "../.env.local");

const env = Object.fromEntries(
  readFileSync(envPath, "utf8")
    .split("\n")
    .filter((l) => l.includes("=") && !l.startsWith("#"))
    .map((l) => {
      const idx = l.indexOf("=");
      return [l.slice(0, idx).trim(), l.slice(idx + 1).trim()];
    })
);

const svc = createClient(
  env.NEXT_PUBLIC_SUPABASE_URL,
  env.SUPABASE_SERVICE_ROLE_KEY
);

const target = process.argv[2];

if (!target) {
  console.error("Usage: node scripts/reset-count.mjs your@email.com");
  console.error("       node scripts/reset-count.mjs --all");
  process.exit(1);
}

if (target === "--all") {
  const { data, error } = await svc
    .from("profiles")
    .update({ message_count: 0 })
    .eq("is_subscribed", false)
    .select("email, message_count");

  if (error) { console.error("❌ Error:", error.message); process.exit(1); }
  console.log(`✓ Reset ${data.length} non-subscribed user(s) to message_count = 0`);
} else {
  const { data, error } = await svc
    .from("profiles")
    .update({ message_count: 0 })
    .eq("email", target)
    .select("email, message_count");

  if (error) { console.error("❌ Error:", error.message); process.exit(1); }
  if (!data?.length) { console.error(`❌ No user found with email: ${target}`); process.exit(1); }
  console.log(`✓ Reset message_count to 0 for ${data[0].email}`);
}
