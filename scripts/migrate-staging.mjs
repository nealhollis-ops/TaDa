// Apply supabase/migrations/*.sql to the STAGING database, in order.
//   npm run migrate:staging            (every file; each is idempotent)
//   npm run migrate:staging -- 0014    (only files starting with 0014)
// Reads STAGING_DB_URL from .env.staging (the session pooler URL; the direct
// host is IPv6-only). Production migrations are still pasted into the SQL
// editor by hand; this script refuses to run against a prod-looking URL.
import fs from "node:fs";
import path from "node:path";
import pg from "pg";

const url = process.env.STAGING_DB_URL;
const only = process.argv[2];
if (!url) {
  console.error("STAGING_DB_URL is not set. Run with --env-file=.env.staging.");
  process.exit(1);
}
if (/kbaorflxhudwlzhbieol/.test(url)) {
  console.error("That is the production database. Apply prod migrations in the SQL editor.");
  process.exit(1);
}

const dir = path.join(process.cwd(), "supabase", "migrations");
const client = new pg.Client({ connectionString: url, ssl: { rejectUnauthorized: false } });
await client.connect();
const files = fs
  .readdirSync(dir)
  .filter((f) => f.endsWith(".sql"))
  .sort()
  .filter((f) => !only || f.startsWith(only));
for (const f of files) {
  const sql = fs.readFileSync(path.join(dir, f), "utf8");
  // `alter type ... add value` cannot run inside a transaction block.
  const noTx = /alter type .* add value/i.test(sql);
  const t0 = Date.now();
  try {
    if (!noTx) await client.query("begin");
    await client.query(sql);
    if (!noTx) await client.query("commit");
    console.log(`ok   ${f} (${Date.now() - t0} ms)`);
  } catch (e) {
    if (!noTx) await client.query("rollback").catch(() => {});
    console.error(`FAIL ${f}: ${e.message}`);
    await client.end();
    process.exit(1);
  }
}
await client.query("notify pgrst, 'reload schema'");
const { rows } = await client.query(
  "select count(*)::int as tables from information_schema.tables where table_schema = 'public'",
);
console.log("public tables:", rows[0].tables);
await client.end();
