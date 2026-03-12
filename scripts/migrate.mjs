/**
 * scripts/migrate.mjs
 * Apply the full subscription + usage schema migration to the live Supabase DB.
 *
 * Prerequisites:
 *   1. Add DATABASE_URL to .env.local:
 *      DATABASE_URL=postgresql://postgres:[YOUR-PASSWORD]@db.txznlbzrvbxjxujrmhee.supabase.co:5432/postgres
 *      (Supabase Dashboard → Settings → Database → Connection string → URI)
 *
 *   2. Run:
 *      node scripts/migrate.mjs
 */
import postgres from "postgres";
import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

// ── Load .env.local ──────────────────────────────────────────────────────────
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

const dbUrl = env.DATABASE_URL;
if (!dbUrl) {
  console.error("❌ DATABASE_URL not found in .env.local");
  console.error("   Get it from: Supabase Dashboard → Settings → Database → Connection string → URI");
  process.exit(1);
}

// ── Connect ──────────────────────────────────────────────────────────────────
const sql = postgres(dbUrl, { ssl: "require", max: 1 });

console.log("\n═══════════════════════════════════════════════════════");
console.log("  Deep Vortex AI — Database Migration");
console.log("═══════════════════════════════════════════════════════\n");

try {
  // ── Step 1: Check current state ───────────────────────────────────────────
  console.log("1. Checking current profiles table columns...");
  const cols = await sql`
    select column_name, data_type
    from information_schema.columns
    where table_schema = 'public' and table_name = 'profiles'
    order by ordinal_position
  `;
  console.log("   Current columns:", cols.map((c) => c.column_name).join(", "));

  const has = (col) => cols.some((c) => c.column_name === col);

  // ── Step 2: Add missing columns ───────────────────────────────────────────
  console.log("\n2. Adding missing columns...");

  if (!has("is_subscribed")) {
    await sql`alter table public.profiles add column is_subscribed boolean not null default false`;
    console.log("   ✓ is_subscribed");
  } else { console.log("   ✓ is_subscribed (already exists)"); }

  if (!has("subscription_status")) {
    await sql`alter table public.profiles add column subscription_status text not null default 'inactive'`;
    console.log("   ✓ subscription_status");
  } else { console.log("   ✓ subscription_status (already exists)"); }

  if (!has("stripe_customer_id")) {
    await sql`alter table public.profiles add column stripe_customer_id text`;
    console.log("   ✓ stripe_customer_id");
  } else { console.log("   ✓ stripe_customer_id (already exists)"); }

  if (!has("stripe_subscription_id")) {
    await sql`alter table public.profiles add column stripe_subscription_id text`;
    console.log("   ✓ stripe_subscription_id");
  } else { console.log("   ✓ stripe_subscription_id (already exists)"); }

  if (!has("message_count")) {
    await sql`alter table public.profiles add column message_count integer not null default 0`;
    console.log("   ✓ message_count");
  } else { console.log("   ✓ message_count (already exists)"); }

  if (!has("last_reset_at")) {
    await sql`alter table public.profiles add column last_reset_at timestamptz not null default now()`;
    console.log("   ✓ last_reset_at");
  } else { console.log("   ✓ last_reset_at (already exists)"); }

  // ── Step 3: Create indexes ─────────────────────────────────────────────────
  console.log("\n3. Creating indexes...");
  await sql`
    create unique index if not exists profiles_stripe_customer_id_key
    on public.profiles(stripe_customer_id) where stripe_customer_id is not null
  `;
  await sql`
    create unique index if not exists profiles_stripe_subscription_id_key
    on public.profiles(stripe_subscription_id) where stripe_subscription_id is not null
  `;
  console.log("   ✓ Stripe ID indexes");

  // ── Step 4: Create / replace functions ────────────────────────────────────
  console.log("\n4. Creating database functions...");

  await sql`
    create or replace function public.increment_message_count(user_id uuid)
    returns void language plpgsql security definer as $fn$
    begin
      update public.profiles
      set message_count = message_count + 1, updated_at = now()
      where id = user_id;
    end;
    $fn$
  `;
  console.log("   ✓ increment_message_count");

  await sql`
    create or replace function public.activate_subscription(
      p_user_id uuid, p_stripe_customer_id text, p_stripe_sub_id text
    )
    returns void language plpgsql security definer as $fn$
    begin
      update public.profiles
      set is_subscribed          = true,
          subscription_status    = 'active',
          stripe_customer_id     = p_stripe_customer_id,
          stripe_subscription_id = p_stripe_sub_id,
          updated_at             = now()
      where id = p_user_id;
    end;
    $fn$
  `;
  console.log("   ✓ activate_subscription");

  await sql`
    create or replace function public.deactivate_subscription(p_user_id uuid)
    returns void language plpgsql security definer as $fn$
    begin
      update public.profiles
      set is_subscribed       = false,
          subscription_status = 'canceled',
          updated_at          = now()
      where id = p_user_id;
    end;
    $fn$
  `;
  console.log("   ✓ deactivate_subscription");

  await sql`
    create or replace function public.set_updated_at()
    returns trigger language plpgsql as $fn$
    begin new.updated_at = now(); return new; end;
    $fn$
  `;
  await sql`drop trigger if exists profiles_updated_at on public.profiles`;
  await sql`
    create trigger profiles_updated_at
    before update on public.profiles
    for each row execute procedure public.set_updated_at()
  `;
  console.log("   ✓ set_updated_at trigger");

  // ── Step 5: Verify final state ─────────────────────────────────────────────
  console.log("\n5. Verifying final state...");
  const finalCols = await sql`
    select column_name from information_schema.columns
    where table_schema = 'public' and table_name = 'profiles'
    order by ordinal_position
  `;
  console.log("   Columns:", finalCols.map((c) => c.column_name).join(", "));

  const profiles = await sql`select id, email, message_count, is_subscribed from public.profiles`;
  console.log(`   Total users: ${profiles.length}`);
  if (profiles.length > 0) {
    for (const p of profiles) {
      console.log(`   · ${(p.email ?? "no-email").padEnd(35)} | count=${p.message_count} | subscribed=${p.is_subscribed}`);
    }
  }

  console.log("\n✓ Migration complete. All subscription + usage columns and functions are live.\n");
} catch (err) {
  console.error("\n❌ Migration failed:", err.message);
  process.exit(1);
} finally {
  await sql.end();
}
