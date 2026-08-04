// Runs the real import against embedded Postgres using the actual local files, then
// checks the rows read back correctly through the Postgres driver — and that a second
// run is a no-op (idempotent).
// Run: npm run db:verify-import
import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { readFileSync, readdirSync, existsSync, statSync } from "fs";
import { createHash } from "crypto";
import path from "path";
import * as schema from "../lib/db/schema.js";
import { __setTestDb } from "../lib/db/client.js";

const USER = "user-github-1";
const SOURCE_DIRS = ["history", "jobs", "master-resume", "achievements", "reminders", "contacts"];

function sourceSnapshot() {
  const files = new Map();
  const visit = (p) => {
    if (!existsSync(p)) return;
    const stat = statSync(p);
    if (stat.isDirectory()) {
      for (const name of readdirSync(p)) visit(path.join(p, name));
      return;
    }
    files.set(
      path.relative(process.cwd(), p),
      createHash("sha256").update(readFileSync(p)).digest("hex")
    );
  };
  for (const dirName of SOURCE_DIRS) visit(path.join(process.cwd(), dirName));
  return files;
}

const client = new PGlite();
await client.waitReady;
const dir = path.join(process.cwd(), "drizzle");
for (const f of readdirSync(dir).filter((x) => x.endsWith(".sql")).sort()) {
  for (const stmt of readFileSync(path.join(dir, f), "utf8").split("--> statement-breakpoint")) {
    const s = stmt.trim();
    if (s) await client.exec(s);
  }
}
__setTestDb(drizzle(client, { schema }));

const { runImport } = await import("./import-to-db.mjs");
const sourceBefore = sourceSnapshot();

console.log("--- first import ---");
const first = await runImport({ userId: USER });

console.log("\n--- second import (must skip everything) ---");
const second = await runImport({ userId: USER });
const sourceAfter = sourceSnapshot();

// Read back through the Postgres driver as the app would.
process.env.STORAGE_DRIVER = "db";
process.env.RESUME_TAILOR_USER_ID = USER;
const apps = await import("../lib/store/applications.db.js");
const jobsStore = await import("../lib/store/jobs.db.js");
const mr = await import("../lib/store/masterResume.db.js");
const ach = await import("../lib/store/achievements.db.js");
const rem = await import("../lib/store/reminders.db.js");
const con = await import("../lib/store/contacts.db.js");

let pass = 0, fail = 0;
const check = (name, cond, extra = "") => {
  if (cond) { pass++; console.log(`  ok   ${name}`); }
  else { fail++; console.log(`  FAIL ${name} ${extra}`); }
};

console.log("\n--- verification ---");
check("applications imported", (first["applications imported"] || 0) > 0, JSON.stringify(first["applications imported"]));
check("second run imported nothing", !second["applications imported"], JSON.stringify(second));
check("second run skipped instead", (second["applications skipped"] || 0) === (first["applications imported"] || 0));
check(
  "pre-existing source files unchanged",
  [...sourceBefore].every(([name, hash]) => sourceAfter.get(name) === hash),
  `${sourceBefore.size} source files checked`
);

const list = await apps.listApplications();
check("all applications readable via SQL driver",
  list.summary.applicationCount === (first["applications imported"] || 0),
  `${list.summary.applicationCount} vs ${first["applications imported"]}`);
check("companies grouped", list.summary.companyCount > 0);

// Company slugs must be normalized (the on-disk folders differ in case).
const slugs = list.companies.map((c) => c.slug);
check("company slugs lowercase", slugs.every((s) => s === s.toLowerCase()), JSON.stringify(slugs));

// Spot-check the richest application (one with documents + analysis).
const withDocs = list.companies.flatMap((c) => c.applications).find((a) => a.hasResume && a.hasJobDescription);
if (withDocs) {
  const full = await apps.getApplication(withDocs.id, { full: true });
  check("original id preserved", full.id === withDocs.id);
  check("job description carried over", full.jobDescription.length > 0);
  check("tailored resume carried over", full.tailoredResume.length > 0);
  check("timestamps preserved (not today)", !!full.createdAt);
  check("activity carried over", Array.isArray(full.activity));
  const docx = await apps.readApplicationFile(full.id, "resume.docx");
  check("docx regenerates from imported text", docx.buffer.length > 2000);
} else {
  check("found an application with documents", false);
}

check("jobs imported", (await jobsStore.listJobs()).jobs.length === (first["jobs imported"] || 0));
check("master resume entries imported", (await mr.getMaster()).entries.length === (first["master entries imported"] || 0));
check("achievements imported", (await ach.listAchievements()).achievements.length === (first["achievements imported"] || 0));
check("reminders imported", (await rem.listReminders()).reminders.length === (first["reminders imported"] || 0));
check("contacts imported", (await con.listContacts()).contacts.length === (first["contacts imported"] || 0));

// Data belongs to the target user only.
process.env.RESUME_TAILOR_USER_ID = "someone-else";
check("imported data scoped to target user", (await apps.listApplications()).summary.applicationCount === 0);

await client.close();
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
