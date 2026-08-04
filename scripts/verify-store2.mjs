// Exercises the Postgres drivers for jobs, master resume, achievements, reminders
// and contacts against embedded Postgres (PGlite).
// Run: npm run db:verify-store2
import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { readFileSync, readdirSync } from "fs";
import path from "path";
import * as schema from "../lib/db/schema.js";
import { __setTestDb } from "../lib/db/client.js";

process.env.RESUME_TAILOR_USER_ID = "user-1";
process.env.STORAGE_DRIVER = "db";

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

const jobsStore = await import("../lib/store/jobs.db.js");
const mr = await import("../lib/store/masterResume.db.js");
const ach = await import("../lib/store/achievements.db.js");
const rem = await import("../lib/store/reminders.db.js");
const con = await import("../lib/store/contacts.db.js");
const apps = await import("../lib/store/applications.db.js");

let pass = 0, fail = 0;
const check = (name, cond, extra = "") => {
  if (cond) { pass++; console.log(`  ok   ${name}`); }
  else { fail++; console.log(`  FAIL ${name} ${extra}`); }
};

console.log("jobs");
const JD = "Product Designer with Figma, prototyping, design systems, user research. B2B SaaS and responsive web design required.";
const { job: j1, similar: sim1 } = await jobsStore.createJob({
  company: "Google", role: "Product Designer", location: "Bengaluru", workMode: "Hybrid",
  priority: "High", jobDescription: JD,
});
check("job created with slugs", j1.companySlug === "google" && j1.roleSlug === "product-designer");
check("no duplicates on first save", sim1.length === 0);
const { job: j2, similar: sim2 } = await jobsStore.createJob({
  company: "Google", role: "Senior Product Designer", location: "Bengaluru",
  jobDescription: JD + " Leadership a plus.",
});
check("duplicate detected", sim2.length === 1 && sim2[0].similarity >= 65, JSON.stringify(sim2));
check("ids unique in same second", j1.id !== j2.id);
const listed = await jobsStore.listJobs();
check("both jobs listed", listed.jobs.length === 2 && listed.corrupted === 0);
check("newest first", listed.jobs[0].dateSaved >= listed.jobs[1].dateSaved);
const updatedJob = await jobsStore.updateJob(j1.id, { status: "Apply Soon", notes: "Referral via Jordan" });
check("job updated", updatedJob.status === "Apply Soon" && updatedJob.notes === "Referral via Jordan");
check("unknown job update -> null", (await jobsStore.updateJob("nope", { status: "Saved" })) === null);
const cmp = await jobsStore.compareJobs(j2.id, j1.id);
check("compare similarity", typeof cmp.similarity === "number" && cmp.similarity > 0);
check("compare finds new requirement", cmp.newInA.includes("leadership"), JSON.stringify(cmp.newInA));
check("compare unknown -> null", (await jobsStore.compareJobs(j1.id, "nope")) === null);
check("delete job", (await jobsStore.deleteJob(j2.id)) === true);
check("deleted job gone", (await jobsStore.getJob(j2.id)) === null);
check("delete unknown -> false", (await jobsStore.deleteJob("nope")) === false);

console.log("master resume");
const empty = await mr.getMaster();
check("empty master has contact shape", "email" in empty.contact && empty.entries.length === 0);
const imported = await mr.importFromResume(`ADITYA KANOJIYA
+91 8433527871 | aditya@example.com | linkedin.com/in/aditya

PROFESSIONAL SUMMARY
Product designer focused on SaaS.

PROFESSIONAL EXPERIENCE
LeadSquared Oct 2025 - Present
Associate UI/UX Designer
- Built reusable components with React.
- Ran user research and prototyping.

EDUCATION
IIIT Surat 2021 - 2025
B.Tech ECE

SKILLS
Tools: Figma, Framer, Notion`);
check("entries imported", imported.added === 3, `added=${imported.added}`);
check("contact extracted", imported.master.contact.email === "aditya@example.com" && imported.master.contact.name === "ADITYA KANOJIYA");
check("summary extracted", imported.master.summary.includes("Product designer"));
check("all imported entries Needs Review", imported.master.entries.every((e) => e.status === "Needs Review"));
const expEntry = imported.master.entries.find((e) => e.section === "Experience");
check("experience bullets captured", expEntry.bullets.length === 2 && expEntry.org === "LeadSquared");
const approved = await mr.updateEntry(expEntry.id, { status: "Approved", metrics: "24 pages" });
check("entry approved + metric", approved.status === "Approved" && approved.metrics === "24 pages");
const hdr = await mr.patchHeader({ contact: { location: "Mumbai" }, summary: "Updated summary" });
check("header patched, existing contact preserved", hdr.contact.location === "Mumbai" && hdr.contact.email === "aditya@example.com");
check("summary patched", hdr.summary === "Updated summary");
const added = await mr.addEntry({ section: "Projects", title: "Landing Page Builder", bullets: "Reusable components\nResponsive" });
check("entry added with bullet splitting", added.bullets.length === 2 && added.section === "Projects");
check("delete entry", (await mr.deleteEntry(added.id)) === true);
check("delete unknown entry -> false", (await mr.deleteEntry("nope")) === false);
const reimport = await mr.importFromResume("JANE OTHER\njane@other.com\n\nPROFESSIONAL SUMMARY\nDifferent summary.");
check("re-import does not overwrite curated contact", reimport.master.contact.email === "aditya@example.com");
check("re-import does not overwrite summary", reimport.master.summary === "Updated summary");

console.log("achievements");
const a1 = await ach.createAchievement({ title: "Component library", context: "Internal tools", action: "Built components", result: "Less repeat work", skills: "React, CSS" });
check("achievement created, skills split", a1.skills.length === 2 && a1.title === "Component library");
check("metric stays empty when unknown", a1.metric === "");
const a2 = await ach.updateAchievement(a1.id, { metric: "24 pages in 6 months" });
check("metric added on confirmation", a2.metric === "24 pages in 6 months");
check("achievements listed", (await ach.listAchievements()).achievements.length === 1);
check("delete achievement", (await ach.deleteAchievement(a1.id)) === true);
check("unknown achievement update -> null", (await ach.updateAchievement("nope", {})) === null);

console.log("reminders + application follow-up sync");
const app = await apps.createApplication({ company: "Google", role: "Product Designer", tailoredResume: "R", jobDescription: JD });
const r1 = await rem.createReminder({ title: "Follow up", type: "Recruiter follow-up", dueDate: "2026-08-10", applicationId: app.id });
check("reminder created", r1.title === "Follow up" && r1.status === "Pending");
check("app nextFollowUpAt synced", (await apps.getApplication(app.id)).nextFollowUpAt === "2026-08-10");
await rem.createReminder({ title: "Earlier task", dueDate: "2026-08-05", applicationId: app.id });
check("sync picks soonest pending", (await apps.getApplication(app.id)).nextFollowUpAt === "2026-08-05");
const done = await rem.updateReminder(r1.id, { status: "Completed" });
check("completing sets completedAt", done.status === "Completed" && !!done.completedAt);
check("reminders listed", (await rem.listReminders()).reminders.length === 2);
const all = (await rem.listReminders()).reminders;
const earlier = all.find((r) => r.title === "Earlier task");
check("delete reminder", (await rem.deleteReminder(earlier.id)) === true);
check("sync clears when no pending remain", (await apps.getApplication(app.id)).nextFollowUpAt === null);
check("delete unknown reminder -> false", (await rem.deleteReminder("nope")) === false);

console.log("contacts");
const c1 = await con.createContact({ name: "Jordan Lee", role: "Technical Recruiter", relationship: "Recruiter", email: "jordan@google.com", applicationId: app.id, company: "Google" });
check("contact created", c1.name === "Jordan Lee" && c1.relationship === "Recruiter");
check("invalid relationship falls back", (await con.createContact({ name: "X", relationship: "Wizard" })).relationship === "Recruiter");
const c2 = await con.updateContact(c1.id, { notes: "Replied on LinkedIn", relationship: "Hiring Manager" });
check("contact updated", c2.notes === "Replied on LinkedIn" && c2.relationship === "Hiring Manager");
check("contacts listed", (await con.listContacts()).contacts.length === 2);
check("delete contact", (await con.deleteContact(c1.id)) === true);
check("unknown contact update -> null", (await con.updateContact("nope", {})) === null);

console.log("user scoping across all modules");
process.env.RESUME_TAILOR_USER_ID = "user-2";
check("jobs scoped", (await jobsStore.listJobs()).jobs.length === 0);
check("master resume scoped", (await mr.getMaster()).entries.length === 0);
check("achievements scoped", (await ach.listAchievements()).achievements.length === 0);
check("reminders scoped", (await rem.listReminders()).reminders.length === 0);
check("contacts scoped", (await con.listContacts()).contacts.length === 0);
check("other user cannot read job by id", (await jobsStore.getJob(j1.id)) === null);
check("other user cannot delete job", (await jobsStore.deleteJob(j1.id)) === false);

await client.close();
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
