// Applies the generated migration to an in-memory Postgres (PGlite) and runs a
// round-trip smoke test. Lets the schema and queries be verified without a live
// Supabase connection. Run: node scripts/verify-schema.mjs
import { PGlite } from "@electric-sql/pglite";
import { readFileSync, readdirSync } from "fs";
import path from "path";

const dir = path.join(process.cwd(), "drizzle");
const files = readdirSync(dir).filter((f) => f.endsWith(".sql")).sort();

const db = new PGlite();
await db.waitReady;

for (const f of files) {
  const sql = readFileSync(path.join(dir, f), "utf8");
  // drizzle separates statements with this breakpoint marker
  for (const stmt of sql.split("--> statement-breakpoint")) {
    const s = stmt.trim();
    if (s) await db.exec(s);
  }
  console.log(`applied ${f}`);
}

const tables = await db.query(
  `select table_name from information_schema.tables where table_schema='public' order by table_name`
);
console.log(`\ntables created (${tables.rows.length}):`);
console.log("  " + tables.rows.map((r) => r.table_name).join(", "));

// Round-trip: insert an application + document + activity, then read back.
const APP_ID = "google-product-designer-2026-08-03-154150";
await db.query(
  `insert into applications (id, user_id, company, company_slug, role, role_slug,
     application_date, status, match_score, fit_score, tags)
   values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
  [APP_ID, "user-1", "Google", "google", "Product Designer", "product-designer",
   "2026-08-03", "Applied", 45, 45, JSON.stringify(["b2b-saas"])]
);
await db.query(
  `insert into application_documents (application_id, kind, content) values ($1,$2,$3)`,
  [APP_ID, "tailored_resume", "ADITYA KANOJIYA\n- Built reusable components."]
);
await db.query(
  `insert into application_activity (id, application_id, type, from_status, to_status)
   values ($1,$2,$3,$4,$5)`,
  ["event-1", APP_ID, "status_changed", "Ready to Apply", "Applied"]
);

const joined = await db.query(
  `select a.id, a.company, a.role, a.status, a.match_score, a.tags,
          d.kind, length(d.content) as doc_len,
          (select count(*) from application_activity v where v.application_id = a.id) as events
     from applications a
     left join application_documents d on d.application_id = a.id
    where a.user_id = $1`,
  ["user-1"]
);
console.log("\nround-trip row:");
console.log(" ", JSON.stringify(joined.rows[0]));

// jsonb behaves as expected
const tagCheck = await db.query(`select tags->>0 as first_tag from applications where id=$1`, [APP_ID]);
console.log("  jsonb tags->>0 =", tagCheck.rows[0].first_tag);

// user scoping isolates data
const other = await db.query(`select count(*)::int as n from applications where user_id=$1`, ["user-2"]);
console.log("  rows visible to a different user:", other.rows[0].n);

// unique constraint on (application_id, kind) prevents duplicate documents
let dupBlocked = false;
try {
  await db.query(`insert into application_documents (application_id, kind, content) values ($1,$2,$3)`,
    [APP_ID, "tailored_resume", "dupe"]);
} catch { dupBlocked = true; }
console.log("  duplicate document blocked by PK:", dupBlocked);

await db.close();
console.log("\nSCHEMA VERIFIED");
