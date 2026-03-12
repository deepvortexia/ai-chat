/**
 * scripts/verify-counts.mjs
 * Verify message_count for every user in the profiles table.
 * Run from the ai-chat directory: node scripts/verify-counts.mjs
 */
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

// Load .env.local manually (no dotenv dependency needed)
const envPath = resolve(__dirname, "../.env.local");
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

const FREE_TRIAL_LIMIT = 8;

const { data: profiles, error } = await svc
  .from("profiles")
  .select("id, email, message_count, is_subscribed, created_at, updated_at")
  .order("created_at", { ascending: false });

if (error) {
  if (error.message.includes("does not exist")) {
    console.error("❌ Schema not migrated yet.");
    console.error("   Run: node scripts/migrate.mjs");
    console.error("   (Requires DATABASE_URL in .env.local)");
  } else {
    console.error("❌ Query failed:", error.message);
  }
  process.exit(1);
}

console.log("\n═══════════════════════════════════════════════════════");
console.log("  Deep Vortex AI — profiles.message_count verification");
console.log("═══════════════════════════════════════════════════════\n");

for (const p of profiles) {
  const status = p.is_subscribed
    ? "✦ subscriber"
    : p.message_count >= FREE_TRIAL_LIMIT
    ? "🚫 trial ended"
    : p.message_count === 0
    ? "🆕 fresh"
    : `🎁 trial (${FREE_TRIAL_LIMIT - p.message_count} left)`;

  console.log(
    `${status.padEnd(22)} | count: ${String(p.message_count).padStart(3)} | ${p.email ?? "(no email)"}`
  );
}

console.log(`\n─── Summary ───────────────────────────────────────────`);
console.log(`  Total users    : ${profiles.length}`);
console.log(`  Subscribers    : ${profiles.filter((p) => p.is_subscribed).length}`);
console.log(`  Trial exhausted: ${profiles.filter((p) => !p.is_subscribed && p.message_count >= FREE_TRIAL_LIMIT).length}`);
console.log(`  Trial active   : ${profiles.filter((p) => !p.is_subscribed && p.message_count > 0 && p.message_count < FREE_TRIAL_LIMIT).length}`);
console.log(`  Count = 0      : ${profiles.filter((p) => p.message_count === 0).length}`);
console.log(`───────────────────────────────────────────────────────\n`);
