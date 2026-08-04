// Copies existing filesystem data (history/, jobs/, master-resume/, achievements/,
// reminders/, contacts/) into the database.
//
//   npm run db:import                 # imports as user "local"
//   npm run db:import -- --user=<id>  # imports as a specific user (see npm run db:users)
//   npm run db:import -- --dry-run    # report what would be imported, write nothing
//
// Safe to re-run: existing rows are skipped, never overwritten. Original ids and
// timestamps are preserved, so URLs and history stay intact. Source files are left
// untouched.
import { eq } from "drizzle-orm";

// Read through the filesystem drivers (they already fold in the legacy flat-history
// migration and parse everything), so this script only has to write.
process.env.STORAGE_DRIVER = "fs";
process.env.RESUME_TAILOR_USER_ID = "local";

const [
  appsFs, jobsFs, mrFs, achFs, remFs, conFs,
  { getDb }, schema,
] = await Promise.all([
  import("../lib/store/applications.fs.js"),
  import("../lib/store/jobs.fs.js"),
  import("../lib/store/masterResume.fs.js"),
  import("../lib/store/achievements.fs.js"),
  import("../lib/store/reminders.fs.js"),
  import("../lib/store/contacts.fs.js"),
  import("../lib/db/client.js"),
  import("../lib/db/schema.js"),
]);

export async function runImport({ userId = "local", dryRun = false } = {}) {
  const USER_ID = userId;
  const DRY = dryRun;
  const db = await getDb();
  const stats = {};
const bump = (k, n = 1) => { stats[k] = (stats[k] || 0) + n; };

async function exists(table, idCol, id) {
  const rows = await db.select({ id: idCol }).from(table).where(eq(idCol, id)).limit(1);
  return !!rows[0];
}

const d = (v) => (v ? new Date(v) : null);

// --- applications ----------------------------------------------------------
const { companies } = await appsFs.listApplications();
const allApps = companies.flatMap((c) => c.applications);
console.log(`found ${allApps.length} applications across ${companies.length} companies`);

for (const summary of allApps) {
  if (await exists(schema.applications, schema.applications.id, summary.id)) {
    bump("applications skipped");
    continue;
  }
  const app = await appsFs.getApplication(summary.id, { full: true });
  if (!app) continue;

  if (!DRY) {
    await db.insert(schema.applications).values({
      id: app.id,
      userId: USER_ID,
      company: app.company,
      // companySlug comes from metadata, so the on-disk folder-case difference
      // (history/Razorpay vs history/google) does not leak into the database.
      companySlug: app.companySlug,
      role: app.role,
      roleSlug: app.roleSlug,
      location: app.location || "",
      jobUrl: app.jobUrl || "",
      workMode: app.workMode || "",
      applicationDate: app.applicationDate || null,
      status: app.status || "Saved",
      statusUpdatedAt: d(app.statusUpdatedAt) || d(app.updatedAt),
      priority: app.priority || "Medium",
      mode: app.mode || "local",
      resumeVariant: app.resumeVariant || "v1",
      matchScore: typeof app.matchScore === "number" ? app.matchScore : null,
      fitScore: typeof app.fitScore === "number" ? app.fitScore : null,
      nextFollowUpAt: app.nextFollowUpAt || null,
      submittedAt: d(app.submittedAt),
      submittedResumeVersion: app.submittedResumeVersion || null,
      submittedCoverLetterVersion: app.submittedCoverLetterVersion || null,
      applicationSource: app.applicationSource || "",
      tags: app.tags || [],
      migrated: !!app.migrated,
      extra: app.baseProfileId ? { baseProfileId: app.baseProfileId } : {},
      createdAt: d(app.createdAt) || new Date(),
      updatedAt: d(app.updatedAt) || new Date(),
    });

    const docs = [
      ["job_description", app.jobDescription],
      ["original_resume", app.originalResume],
      ["tailored_resume", app.tailoredResume
        ? JSON.stringify({ tailoredResume: app.tailoredResume, mode: app.mode, resumeVariant: app.resumeVariant }, null, 2)
        : null],
      ["cover_letter", app.coverLetterText],
      ["match_report", app.matchReport ? JSON.stringify(app.matchReport, null, 2) : null],
      ["fit_report", app.fitReport ? JSON.stringify(app.fitReport, null, 2) : null],
      ["resume_diff", app.resumeDiff ? JSON.stringify(app.resumeDiff, null, 2) : null],
      ["quality_report", app.qualityReport ? JSON.stringify(app.qualityReport, null, 2) : null],
    ];
    for (const [kind, content] of docs) {
      if (content) {
        await db.insert(schema.applicationDocuments)
          .values({ applicationId: app.id, kind, content, updatedAt: d(app.updatedAt) || new Date() })
          .onConflictDoNothing();
        bump("documents");
      }
    }

    const interview = await appsFs.getInterview(app.id);
    if (interview && (interview.questions?.length || interview.rounds?.length || interview.questionsToAsk?.length)) {
      await db.insert(schema.applicationDocuments)
        .values({ applicationId: app.id, kind: "interview", content: JSON.stringify(interview, null, 2), updatedAt: new Date() })
        .onConflictDoNothing();
      bump("interview docs");
    }

    for (const e of (app.activity || [])) {
      await db.insert(schema.applicationActivity).values({
        id: e.id,
        applicationId: app.id,
        type: e.type,
        fromStatus: e.from || null,
        toStatus: e.to || null,
        detail: e.detail || null,
        createdAt: d(e.createdAt) || new Date(),
      }).onConflictDoNothing();
      bump("activity events");
    }

    const msgs = await appsFs.listMessages(app.id);
    for (const m of (msgs?.messages || [])) {
      await db.insert(schema.applicationMessages).values({
        id: m.id, applicationId: app.id, type: m.type,
        subject: m.subject || "", body: m.body,
        contactId: m.contactId || null, contactName: m.contactName || "",
        status: m.status || "draft",
        createdAt: d(m.createdAt) || new Date(), updatedAt: d(m.updatedAt) || new Date(),
      }).onConflictDoNothing();
      bump("messages");
    }
  }
  bump("applications imported");
}

// --- jobs ------------------------------------------------------------------
const { jobs: jobList } = await jobsFs.listJobs();
for (const j of jobList) {
  if (await exists(schema.jobs, schema.jobs.id, j.id)) { bump("jobs skipped"); continue; }
  if (!DRY) {
    await db.insert(schema.jobs).values({
      id: j.id, userId: USER_ID,
      company: j.company || "", companySlug: j.companySlug || "",
      role: j.role || "", roleSlug: j.roleSlug || "",
      location: j.location || "", workMode: j.workMode || "", jobUrl: j.jobUrl || "",
      source: j.source || "", salaryRange: j.salaryRange || "", closingDate: j.closingDate || "",
      priority: j.priority || "Medium", interest: j.interest || "Medium",
      status: j.status || "Saved", notes: j.notes || "", jobDescription: j.jobDescription || "",
      tags: j.tags || [], applicationId: j.applicationId || null,
      dateSaved: d(j.dateSaved) || new Date(), updatedAt: d(j.updatedAt) || new Date(),
    });
  }
  bump("jobs imported");
}

// --- master resume ---------------------------------------------------------
const master = await mrFs.getMaster();
if (master && (master.entries.length || master.summary || master.contact?.name)) {
  if (!DRY) {
    await db.insert(schema.masterResume).values({
      userId: USER_ID,
      contact: master.contact || {},
      summary: master.summary || "",
      updatedAt: d(master.updatedAt) || new Date(),
    }).onConflictDoNothing();
    for (const e of master.entries) {
      if (await exists(schema.masterResumeEntries, schema.masterResumeEntries.id, e.id)) {
        bump("master entries skipped");
        continue;
      }
      await db.insert(schema.masterResumeEntries).values({
        id: e.id, userId: USER_ID,
        section: e.section, title: e.title || "", org: e.org || "", dates: e.dates || "",
        bullets: e.bullets || [], skills: e.skills || [], tags: e.tags || [],
        metrics: e.metrics || "", status: e.status, sortOrder: 0,
        updatedAt: d(e.updatedAt) || new Date(),
      });
      bump("master entries imported");
    }
  } else {
    bump("master entries imported", master.entries.length);
  }
  bump("master resume header");
}

// --- achievements ----------------------------------------------------------
const { achievements: achList } = await achFs.listAchievements();
for (const a of achList) {
  if (await exists(schema.achievements, schema.achievements.id, a.id)) { bump("achievements skipped"); continue; }
  if (!DRY) {
    await db.insert(schema.achievements).values({
      id: a.id, userId: USER_ID,
      title: a.title || "", context: a.context || "", action: a.action || "",
      result: a.result || "", metric: a.metric || "", company: a.company || "",
      project: a.project || "", date: a.date || "",
      skills: a.skills || [], tags: a.tags || [],
      evidence: a.evidence || "", resumeBullet: a.resumeBullet || "",
      createdAt: d(a.createdAt) || new Date(), updatedAt: d(a.updatedAt) || new Date(),
    });
  }
  bump("achievements imported");
}

// --- reminders -------------------------------------------------------------
const { reminders: remList } = await remFs.listReminders();
for (const r of remList) {
  if (await exists(schema.reminders, schema.reminders.id, r.id)) { bump("reminders skipped"); continue; }
  if (!DRY) {
    await db.insert(schema.reminders).values({
      id: r.id, userId: USER_ID, applicationId: r.applicationId || null,
      title: r.title, type: r.type, company: r.company || "", role: r.role || "",
      dueDate: r.dueDate || "", dueTime: r.dueTime || "",
      status: r.status, notes: r.notes || "",
      completedAt: d(r.completedAt),
      createdAt: d(r.createdAt) || new Date(), updatedAt: d(r.updatedAt) || new Date(),
    });
  }
  bump("reminders imported");
}

// --- contacts --------------------------------------------------------------
const { contacts: conList } = await conFs.listContacts();
for (const c of conList) {
  if (await exists(schema.contacts, schema.contacts.id, c.id)) { bump("contacts skipped"); continue; }
  if (!DRY) {
    await db.insert(schema.contacts).values({
      id: c.id, userId: USER_ID, applicationId: c.applicationId || null,
      companySlug: c.companySlug || "", name: c.name, role: c.role || "",
      company: c.company || "", email: c.email || "", phone: c.phone || "",
      linkedin: c.linkedin || "", relationship: c.relationship,
      source: c.source || "", notes: c.notes || "",
      lastContacted: c.lastContacted || "", nextFollowUp: c.nextFollowUp || "",
      createdAt: d(c.createdAt) || new Date(), updatedAt: d(c.updatedAt) || new Date(),
    });
  }
  bump("contacts imported");
}

  console.log(`\n${DRY ? "DRY RUN — nothing written" : `imported as user "${USER_ID}"`}`);
  for (const [k, v] of Object.entries(stats).sort()) console.log(`  ${k}: ${v}`);
  console.log("\nSource files were not modified.");
  return stats;
}

// CLI entry point
if (process.argv[1] && process.argv[1].endsWith("import-to-db.mjs")) {
  const args = process.argv.slice(2);
  const userArg = args.find((a) => a.startsWith("--user="));
  await runImport({
    userId: userArg ? userArg.split("=")[1] : process.env.IMPORT_USER_ID || "local",
    dryRun: args.includes("--dry-run"),
  });
  process.exit(0);
}
