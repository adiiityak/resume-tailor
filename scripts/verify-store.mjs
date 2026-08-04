// Exercises the Postgres storage driver against embedded Postgres (PGlite), so the
// real query paths are verified with no live database and no credentials.
// Run: npm run db:verify-store
import { PGlite } from "@electric-sql/pglite";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/pglite";
import { readFileSync, readdirSync } from "fs";
import path from "path";
import * as schema from "../lib/db/schema.js";
import { __setTestDb } from "../lib/db/client.js";

process.env.RESUME_TAILOR_USER_ID = "user-1";

const client = new PGlite();
await client.waitReady;

const dir = path.join(process.cwd(), "drizzle");
for (const f of readdirSync(dir).filter((x) => x.endsWith(".sql")).sort()) {
  for (const stmt of readFileSync(path.join(dir, f), "utf8").split("--> statement-breakpoint")) {
    const s = stmt.trim();
    if (s) await client.exec(s);
  }
}

const db = drizzle(client, { schema });
__setTestDb(db);
const store = await import("../lib/store/applications.db.js");

let pass = 0, fail = 0;
const check = (name, cond, extra = "") => {
  if (cond) { pass++; console.log(`  ok   ${name}`); }
  else { fail++; console.log(`  FAIL ${name} ${extra}`); }
};

console.log("createApplication");
const app = await store.createApplication({
  company: "Google", role: "Product Designer",
  jobDescription: "Product Designer with Figma, prototyping, design systems. B2B SaaS.",
  originalResume: "ADITYA KANOJIYA\n- Ran user research and prototyping in Figma.",
  tailoredResume: "ADITYA KANOJIYA\n- Ran user research and prototyping in Figma.",
  matchReport: { matchScore: 45, matchedKeywords: ["figma"], missingKeywords: ["b2b"], notes: "n" },
  fitReport: { overall: 45, label: "Stretch Role", missing: ["b2b"] },
  resumeDiff: { changes: [], summary: { unsupported: 0 } },
  qualityReport: { warnings: [], counts: { critical: 0, important: 0, suggestion: 0 } },
  mode: "local", resumeVariant: "v2", matchScore: 45, priority: "High",
  submittedAt: "2026-08-04T09:30:00.000Z",
  submittedResumeVersion: "resume-r9",
  submittedCoverLetterVersion: "cover-letter-c4",
  applicationSource: "Referral",
  baseProfileId: "product-design",
});
check("id format preserved", /^google-product-designer-\d{4}-\d{2}-\d{2}-\d{6}$/.test(app.id), app.id);
check("status defaults to Ready to Apply", app.status === "Ready to Apply", app.status);
check("fitScore captured", app.fitScore === 45);
check(
  "submitted versions and analytics profile metadata survive create",
  app.submittedAt === "2026-08-04T09:30:00.000Z" &&
    app.submittedResumeVersion === "resume-r9" &&
    app.submittedCoverLetterVersion === "cover-letter-c4" &&
    app.applicationSource === "Referral" &&
    app.baseProfileId === "product-design",
  JSON.stringify(app)
);
check("files map populated", !!app.files.jobDescription && !!app.files.tailoredResume && !!app.files.resumeDocx);

console.log("getApplication(full)");
const full = await store.getApplication(app.id, { full: true });
check("jobDescription round-trips", full.jobDescription.includes("Figma"));
check("tailoredResume unwrapped from json", full.tailoredResume.startsWith("ADITYA"));
check("matchReport parsed", full.matchReport.matchScore === 45);
check("fitReport parsed", full.fitReport.label === "Stretch Role");
check("resumeDiff parsed", full.resumeDiff.summary.unsupported === 0);
check("qualityReport parsed", !!full.qualityReport.counts);
check("activity logged (created + tailored)", full.activity.length === 2, JSON.stringify(full.activity.map(e => e.type)));
check("fileList includes generated resume.docx", full.fileList.some((f) => f.name === "resume.docx"));
check("flags correct", full.hasResume && full.hasJobDescription && !full.hasCoverLetter);

console.log("changeStatus + timeline");
await store.changeStatus(app.id, "Applied");
const acts = await store.getActivity(app.id);
const statusEvent = acts.find((e) => e.type === "status_changed");
check("status_changed recorded with from/to", statusEvent?.from === "Ready to Apply" && statusEvent?.to === "Applied");
check("timeline newest-first", acts[0].type === "status_changed");
check("rejects unknown status", await store.changeStatus(app.id, "Nope").then(() => false).catch((e) => e.status === 400));

console.log("listApplications");
const list = await store.listApplications();
check("one company", list.companies.length === 1 && list.companies[0].slug === "google");
check("summary counts", list.summary.applicationCount === 1 && list.summary.averageMatchScore === 45);
check("recentRoles present", list.companies[0].recentRoles.includes("Product Designer"));
check("list flags present", list.companies[0].applications[0].hasResume === true);

console.log("getCompany");
const company = await store.getCompany("google");
check("company found by slug", company?.applicationCount === 1);
check("unknown company -> null", (await store.getCompany("nope")) === null);

console.log("saveApplicationFile (cover letter) + docx generation");
await store.saveApplicationFile(app.id, "cover-letter.txt", "Dear Hiring Manager,\n\nReal text.\n\nSincerely,\nAditya");
const afterCl = await store.getApplication(app.id, { full: true });
check("coverLetterText saved", afterCl.coverLetterText.includes("Real text"));
check("hasCoverLetter now true", afterCl.hasCoverLetter === true);
check("cover_letter_generated activity", afterCl.activity.some((e) => e.type === "cover_letter_generated"));
const docx = await store.readApplicationFile(app.id, "resume.docx");
check("resume.docx generated on demand", docx.buffer.length > 2000 && docx.contentType.includes("wordprocessingml"));
const clDocx = await store.readApplicationFile(app.id, "cover-letter.docx");
check("cover-letter.docx generated on demand", clDocx.buffer.length > 2000);
const metaFile = await store.readApplicationFile(app.id, "metadata.json");
check("metadata.json synthesized", JSON.parse(metaFile.buffer.toString()).id === app.id);
check("invalid filename rejected", await store.saveApplicationFile(app.id, "../evil.json", "x").then(() => false).catch((e) => e.status === 400));

console.log("interview");
await store.saveInterview(app.id, { questions: [{ id: "q-1", text: "Tell me about X", confidence: "Needs Work" }], rounds: [{ id: "r-1", name: "Recruiter call" }] });
const iv = await store.getInterview(app.id);
check("interview persisted", iv.questions.length === 1 && iv.rounds.length === 1);
check("interview_prep_started logged", (await store.getActivity(app.id)).some((e) => e.type === "interview_prep_started"));
await store.saveInterview(app.id, { questionsToAsk: [{ id: "a-1", text: "Q?" }] });
const iv2 = await store.getInterview(app.id);
check("partial save preserves questions", iv2.questions.length === 1 && iv2.questionsToAsk.length === 1);

console.log("messages");
const msg = await store.saveMessage(app.id, { type: "recruiter_outreach", subject: "Hi", body: "Body text", contactName: "Jordan" });
const msgs = await store.listMessages(app.id);
check("message saved and listed", msgs.messages.length === 1 && msgs.messages[0].subject === "Hi");
check("message_drafted activity", (await store.getActivity(app.id)).some((e) => e.type === "message_drafted"));
check("delete message", (await store.deleteMessage(app.id, msg.id)) === true);
check("message list now empty", (await store.listMessages(app.id)).messages.length === 0);
check("deleting unknown message -> false", (await store.deleteMessage(app.id, "msg-nope")) === false);

console.log("updateApplication + setNextFollowUp");
const upd = await store.updateApplication(app.id, { location: "Bengaluru, India", jobUrl: "https://x.test", notes: "kept in extra" });
check("column patch applied", upd.location === "Bengaluru, India" && upd.jobUrl === "https://x.test");
check("non-column patch kept in extra", upd.notes === "kept in extra");
const submittedUpdate = await store.updateApplication(app.id, {
  submittedAt: "2026-08-05T10:45:00.000Z",
  submittedResumeVersion: "resume-r10",
  submittedCoverLetterVersion: "cover-letter-c5",
  applicationSource: "Company site",
  baseProfileId: "senior-product-design",
});
check(
  "submitted versions and analytics profile metadata survive update",
  submittedUpdate.submittedAt === "2026-08-05T10:45:00.000Z" &&
    submittedUpdate.submittedResumeVersion === "resume-r10" &&
    submittedUpdate.submittedCoverLetterVersion === "cover-letter-c5" &&
    submittedUpdate.applicationSource === "Company site" &&
    submittedUpdate.baseProfileId === "senior-product-design",
  JSON.stringify(submittedUpdate)
);
const [submittedRow] = await db.select({
  submittedAt: schema.applications.submittedAt,
  submittedResumeVersion: schema.applications.submittedResumeVersion,
  submittedCoverLetterVersion: schema.applications.submittedCoverLetterVersion,
  applicationSource: schema.applications.applicationSource,
  extra: schema.applications.extra,
}).from(schema.applications).where(eq(schema.applications.id, app.id)).limit(1);
check(
  "submitted updates use database columns while base profile remains preserved metadata",
  submittedRow.submittedAt?.toISOString() === "2026-08-05T10:45:00.000Z" &&
    submittedRow.submittedResumeVersion === "resume-r10" &&
    submittedRow.submittedCoverLetterVersion === "cover-letter-c5" &&
    submittedRow.applicationSource === "Company site" &&
    submittedRow.extra?.baseProfileId === "senior-product-design",
  JSON.stringify(submittedRow)
);
const fu = await store.setNextFollowUp(app.id, "2026-08-10");
check("nextFollowUpAt set", fu.nextFollowUpAt === "2026-08-10");
check("nextFollowUpAt clearable", (await store.setNextFollowUp(app.id, null)).nextFollowUpAt === null);

console.log("duplicateApplication");
const dup = await store.duplicateApplication(app.id);
check("new id differs", dup.id !== app.id);
check("status reset to Tailored", dup.status === "Tailored");
const dupFull = await store.getApplication(dup.id, { full: true });
check("documents copied", dupFull.jobDescription.includes("Figma") && dupFull.tailoredResume.startsWith("ADITYA"));
check("original untouched", (await store.getApplication(app.id)).status === "Applied");

console.log("user scoping");
process.env.RESUME_TAILOR_USER_ID = "user-2";
check("other user sees nothing", (await store.listApplications()).summary.applicationCount === 0);
check("other user cannot read by id", (await store.getApplication(app.id)) === null);
check("other user cannot delete", (await store.deleteApplication(app.id)) === false);
process.env.RESUME_TAILOR_USER_ID = "user-1";

console.log("deleteApplication cascade");
check("delete returns true", (await store.deleteApplication(dup.id)) === true);
check("gone afterwards", (await store.getApplication(dup.id)) === null);
check("unknown id -> false", (await store.deleteApplication("nope")) === false);

await client.close();
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
