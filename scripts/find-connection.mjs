import postgres from "postgres";

const PASSWORD = "qn1oP4PKncd3Ijdy";
const REF      = "txznlbzrvbxjxujrmhee";

const candidates = [
  // Direct connection (older projects)
  `postgresql://postgres:${PASSWORD}@db.${REF}.supabase.co:5432/postgres`,
  // Session pooler — project-qualified user, all regions
  ...["us-east-1","us-east-2","us-west-1","us-west-2",
      "eu-west-1","eu-west-2","eu-central-1",
      "ap-southeast-1","ap-southeast-2","ap-northeast-1","ca-central-1","sa-east-1"]
    .flatMap(r => [
      `postgresql://postgres.${REF}:${PASSWORD}@aws-0-${r}.pooler.supabase.com:5432/postgres`,
      `postgresql://postgres.${REF}:${PASSWORD}@aws-0-${r}.pooler.supabase.com:6543/postgres`,
    ]),
];

for (const url of candidates) {
  const label = url.replace(PASSWORD, "***");
  try {
    const sql = postgres(url, { ssl: "require", max: 1, connect_timeout: 6, idle_timeout: 2 });
    const [row] = await sql`SELECT current_user AS u`;
    console.log(`\n✓ CONNECTED: ${label}`);
    console.log(`  current_user = ${row.u}`);
    await sql.end();
    process.exit(0);
  } catch (e) {
    console.log(`✗ ${label.split("@")[1].split("/")[0]} → ${e.message.slice(0, 70)}`);
  }
}

console.log("\n❌ No working connection found.");
process.exit(1);
