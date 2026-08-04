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
if (tables.rows.length !== 15 || !tables.rows.some((row) => row.table_name === "skill_gaps")) {
  throw new Error(`Expected 15 tables including skill_gaps; found ${tables.rows.length}.`);
}

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

// Skill-gap roadmap round-trip, including JSONB and user-scoped composite identity.
await db.query(
  `insert into skill_gaps
     (id, user_id, skill, skill_slug, category, frequency, percentage,
      evidence_level, evidence_explanation, related_jobs)
   values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
  ["skill-gap-product-analytics", "user-1", "Product analytics", "product-analytics",
   "Tools", 3, 60, "None", "No verified evidence found.",
   JSON.stringify([{ id: "j1", company: "A", role: "Designer" }])]
);
const gapRoundTrip = await db.query(
  `select id, user_id, frequency, importance, importance_source, learning_status,
          related_jobs->0->>'id' as related_job_id
     from skill_gaps
    where user_id=$1 and id=$2`,
  ["user-1", "skill-gap-product-analytics"]
);
const gap = gapRoundTrip.rows[0];
if (!gap || gap.frequency !== 3 || gap.importance !== "Low" ||
    gap.importance_source !== "derived" || gap.learning_status !== "Not Started" ||
    gap.related_job_id !== "j1") {
  throw new Error(`Skill-gap round-trip failed: ${JSON.stringify(gap)}`);
}
console.log("  skill-gap round-trip:", JSON.stringify(gap));

await db.close();
console.log("\nSCHEMA VERIFIED");
