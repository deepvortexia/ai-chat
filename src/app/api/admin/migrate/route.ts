import { NextRequest, NextResponse } from "next/server";

/**
 * One-time migration endpoint.
 * Protected by SUPABASE_SERVICE_ROLE_KEY as bearer token.
 *
 * Call once after deploy:
 *   curl -X POST https://chat.deepvortexai.com/api/admin/migrate \
 *     -H "Authorization: Bearer <SUPABASE_SERVICE_ROLE_KEY>"
 */
export async function POST(req: NextRequest) {
  // Protect with a dedicated migration secret
  const auth = req.headers.get("authorization")?.replace("Bearer ", "").trim();
  if (!auth || auth !== process.env.MIGRATION_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Dynamic import — `postgres` is a devDependency but Vercel bundles all imports
  const { default: postgres } = await import("postgres");

  const REF      = "txznlbzrvbxjxujrmhee";
  const PASSWORD = process.env.DB_PASSWORD ?? "qn1oP4PKncd3Ijdy";

  // Try pooler regions until one connects (direct DNS may not resolve in serverless)
  const regions = [
    "us-east-1","us-east-2","us-west-1","us-west-2",
    "eu-west-1","eu-west-2","eu-west-3","eu-central-1","eu-central-2","eu-north-1",
    "ap-southeast-1","ap-southeast-2","ap-northeast-1","ap-northeast-2","ap-south-1","ap-east-1",
    "ca-central-1","sa-east-1","me-south-1","af-south-1",
  ];
  const candidates = [
    process.env.DATABASE_URL,
    ...regions.flatMap(r => [
      `postgresql://postgres.${REF}:${PASSWORD}@aws-0-${r}.pooler.supabase.com:5432/postgres`,
      `postgresql://postgres.${REF}:${PASSWORD}@aws-0-${r}.pooler.supabase.com:6543/postgres`,
    ]),
  ].filter(Boolean) as string[];

  let sql: ReturnType<typeof postgres> | null = null;
  let connectedUrl = "";
  const log: string[] = [];

  for (const url of candidates) {
    const label = url.replace(PASSWORD, "***");
    try {
      const client = postgres(url, { ssl: "require", max: 1, connect_timeout: 8 });
      await client`SELECT 1`;
      sql = client;
      connectedUrl = label;
      log.push(`✓ Connected via: ${connectedUrl}`);
      break;
    } catch (e) {
      const msg = e instanceof Error ? e.message.slice(0, 100) : String(e).slice(0, 100);
      log.push(`✗ ${label.split("@")[1]?.split("/")[0] ?? label}: ${msg}`);
    }
  }

  if (!sql) {
    return NextResponse.json({ error: "Could not connect to database.", log }, { status: 500 });
  }

  try {
    // ── Check current columns ─────────────────────────────────────────────
    const cols = await sql`
      SELECT column_name FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'profiles'
      ORDER BY ordinal_position
    `;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const existing = cols.map((c: any) => c.column_name as string);
    log.push(`Existing columns: ${existing.join(", ")}`);

    // ── Add missing columns ───────────────────────────────────────────────
    const toAdd: [string, string][] = [
      ["is_subscribed",          "boolean NOT NULL DEFAULT false"],
      ["subscription_status",    "text NOT NULL DEFAULT 'inactive'"],
      ["stripe_customer_id",     "text"],
      ["stripe_subscription_id", "text"],
      ["message_count",          "integer NOT NULL DEFAULT 0"],
      ["last_reset_at",          "timestamptz NOT NULL DEFAULT now()"],
    ];

    for (const [col, def] of toAdd) {
      if (!existing.includes(col)) {
        await sql.unsafe(`ALTER TABLE public.profiles ADD COLUMN ${col} ${def}`);
        log.push(`✓ Added column: ${col}`);
      } else {
        log.push(`  Skipped (exists): ${col}`);
      }
    }

    // ── Indexes ───────────────────────────────────────────────────────────
    await sql`
      CREATE UNIQUE INDEX IF NOT EXISTS profiles_stripe_customer_id_key
      ON public.profiles(stripe_customer_id) WHERE stripe_customer_id IS NOT NULL
    `;
    await sql`
      CREATE UNIQUE INDEX IF NOT EXISTS profiles_stripe_subscription_id_key
      ON public.profiles(stripe_subscription_id) WHERE stripe_subscription_id IS NOT NULL
    `;
    log.push("✓ Indexes ensured");

    // ── Functions ─────────────────────────────────────────────────────────
    await sql`
      CREATE OR REPLACE FUNCTION public.increment_message_count(user_id uuid)
      RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $fn$
      BEGIN
        UPDATE public.profiles
        SET message_count = message_count + 1, updated_at = now()
        WHERE id = user_id;
      END; $fn$
    `;
    log.push("✓ Function: increment_message_count");

    await sql`
      CREATE OR REPLACE FUNCTION public.activate_subscription(
        p_user_id uuid, p_stripe_customer_id text, p_stripe_sub_id text
      ) RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $fn$
      BEGIN
        UPDATE public.profiles
        SET is_subscribed          = true,
            subscription_status    = 'active',
            stripe_customer_id     = p_stripe_customer_id,
            stripe_subscription_id = p_stripe_sub_id,
            updated_at             = now()
        WHERE id = p_user_id;
      END; $fn$
    `;
    log.push("✓ Function: activate_subscription");

    await sql`
      CREATE OR REPLACE FUNCTION public.deactivate_subscription(p_user_id uuid)
      RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $fn$
      BEGIN
        UPDATE public.profiles
        SET is_subscribed       = false,
            subscription_status = 'canceled',
            updated_at          = now()
        WHERE id = p_user_id;
      END; $fn$
    `;
    log.push("✓ Function: deactivate_subscription");

    // ── Updated_at trigger ────────────────────────────────────────────────
    await sql`
      CREATE OR REPLACE FUNCTION public.set_updated_at()
      RETURNS trigger LANGUAGE plpgsql AS $fn$
      BEGIN new.updated_at = now(); RETURN new; END; $fn$
    `;
    await sql`DROP TRIGGER IF EXISTS profiles_updated_at ON public.profiles`;
    await sql`
      CREATE TRIGGER profiles_updated_at
      BEFORE UPDATE ON public.profiles
      FOR EACH ROW EXECUTE PROCEDURE public.set_updated_at()
    `;
    log.push("✓ Trigger: set_updated_at");

    // ── Final verification ────────────────────────────────────────────────
    const finalCols = await sql`
      SELECT column_name FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'profiles'
      ORDER BY ordinal_position
    `;
    const profiles = await sql`
      SELECT email, message_count, is_subscribed FROM public.profiles ORDER BY created_at DESC
    `;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    log.push(`Final columns: ${finalCols.map((c: any) => c.column_name).join(", ")}`);
    log.push(`Total users: ${profiles.length}`);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    for (const p of profiles as any[]) {
      log.push(`  · ${p.email} | count=${p.message_count} | subscribed=${p.is_subscribed}`);
    }

    return NextResponse.json({ success: true, log });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    log.push(`ERROR: ${msg}`);
    return NextResponse.json({ success: false, log, error: msg }, { status: 500 });
  } finally {
    await sql!.end();
  }
}
