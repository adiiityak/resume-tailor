import { and, eq, sql } from "drizzle-orm";
import { Packer } from "docx";
import { buildResumeDoc, buildLetterDoc } from "@/lib/docxBuilder";
import { getDb } from "@/lib/db/client";
import {
  applications, applicationDocuments, applicationActivity, applicationMessages,
} from "@/lib/db/schema";
import { STATUSES, createSlug, currentUserId } from "@/lib/store/shared";

export { STATUSES, createSlug };

// filename (the old on-disk name, still used by the API) <-> document kind
const FILE_TO_KIND = {
  "job-description.txt": "job_description",
  "original-resume.txt": "original_resume",
  "tailored-resume.json": "tailored_resume",
  "cover-letter.txt": "cover_letter",
  "match-report.json": "match_report",
  "fit-report.json": "fit_report",
  "resume-diff.json": "resume_diff",
  "resume-quality-report.json": "quality_report",
  "interview.json": "interview",
};
const KIND_TO_FILE = Object.fromEntries(Object.entries(FILE_TO_KIND).map(([f, k]) => [k, f]));

// Regenerated on demand from stored text rather than stored as blobs.
const GENERATED = { "resume.docx": "resume", "cover-letter.docx": "coverLetter" };

const CONTENT_TYPES = {
  ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ".txt": "text/plain; charset=utf-8",
  ".json": "application/json",
};

let seq = 0;
function nextId(prefix) {
  seq = (seq + 1) % 100000;
  return `${prefix}-${Date.now().toString(36)}-${seq}`;
}

function nowParts(date = new Date()) {
  const iso = date.toISOString();
  return { iso, date: iso.slice(0, 10), hhmmss: iso.slice(11, 19).replace(/:/g, "") };
}

function parseJson(raw) {
  if (!raw) return null;
  try { return JSON.parse(raw); } catch { return null; }
}

// Shapes a DB row into the metadata object the API and UI already expect.
function toMetadata(row, files = {}) {
  return {
    id: row.id,
    company: row.company,
    companySlug: row.companySlug,
    role: row.role,
    roleSlug: row.roleSlug,
    createdAt: row.createdAt instanceof Date ? row.createdAt.toISOString() : row.createdAt,
    updatedAt: row.updatedAt instanceof Date ? row.updatedAt.toISOString() : row.updatedAt,
    applicationDate: row.applicationDate,
    location: row.location || "",
    jobUrl: row.jobUrl || "",
    workMode: row.workMode || "",
    priority: row.priority || "Medium",
    tags: row.tags || [],
    mode: row.mode || "local",
    resumeVariant: row.resumeVariant || "v1",
    matchScore: row.matchScore ?? null,
    fitScore: row.fitScore ?? null,
    status: row.status || "Saved",
    statusUpdatedAt: row.statusUpdatedAt instanceof Date ? row.statusUpdatedAt.toISOString() : row.statusUpdatedAt,
    nextFollowUpAt: row.nextFollowUpAt || null,
    submittedAt: row.submittedAt instanceof Date ? row.submittedAt.toISOString() : row.submittedAt,
    applicationSource: row.applicationSource || "",
    migrated: !!row.migrated,
    files,
    ...(row.extra || {}),
  };
}

// Ids embed only HH:MM:SS, so two applications created (or duplicated) inside the
// same second would collide. Append a counter until the id is free.
async function uniqueApplicationId(db, base) {
  let candidate = base;
  let n = 1;
  for (;;) {
    const rows = await db.select({ id: applications.id }).from(applications)
      .where(eq(applications.id, candidate)).limit(1);
    if (!rows[0]) return candidate;
    n += 1;
    candidate = `${base}-${n}`;
  }
}

async function getRow(db, id) {
  const userId = await currentUserId();
  const rows = await db.select().from(applications)
    .where(and(eq(applications.id, id), eq(applications.userId, userId))).limit(1);
  return rows[0] || null;
}

async function getDocs(db, id) {
  const rows = await db.select().from(applicationDocuments)
    .where(eq(applicationDocuments.applicationId, id));
  return Object.fromEntries(rows.map((r) => [r.kind, r]));
}

// Rebuilds the metadata.files map the UI reads, from which documents exist.
function filesMapFromDocs(docs) {
  const files = {};
  for (const kind of Object.keys(docs)) {
    const name = KIND_TO_FILE[kind];
    if (!name) continue;
    const key = {
      job_description: "jobDescription",
      original_resume: "originalResume",
      tailored_resume: "tailoredResume",
      cover_letter: "coverLetterText",
      match_report: "matchReport",
      fit_report: "fitReport",
      resume_diff: "resumeDiff",
      quality_report: "qualityReport",
    }[kind];
    if (key) files[key] = name;
  }
  if (docs.tailored_resume) files.resumeDocx = "resume.docx";
  if (docs.cover_letter) files.coverLetterDocx = "cover-letter.docx";
  return files;
}

function flagsFromDocs(docs) {
  return {
    hasResume: !!docs.tailored_resume,
    hasCoverLetter: !!docs.cover_letter,
    hasJobDescription: !!docs.job_description,
    hasMatchReport: !!docs.match_report,
  };
}

async function upsertDoc(db, id, kind, content) {
  await db.insert(applicationDocuments)
    .values({ applicationId: id, kind, content, updatedAt: new Date() })
    .onConflictDoUpdate({
      target: [applicationDocuments.applicationId, applicationDocuments.kind],
      set: { content, updatedAt: new Date() },
    });
}

async function addActivity(db, id, event) {
  await db.insert(applicationActivity).values({
    id: nextId("event"),
    applicationId: id,
    type: event.type,
    fromStatus: event.from || null,
    toStatus: event.to || null,
    detail: event.detail || null,
    createdAt: new Date(),
  });
}

async function touch(db, id, patch = {}) {
  await db.update(applications).set({ ...patch, updatedAt: new Date() }).where(eq(applications.id, id));
}

// ---------------------------------------------------------------------------

export async function listApplications() {
  const db = await getDb();
  const userId = await currentUserId();

  const rows = await db.select().from(applications).where(eq(applications.userId, userId));
  const docRows = await db.select({
    applicationId: applicationDocuments.applicationId,
    kind: applicationDocuments.kind,
  }).from(applicationDocuments);

  const docsByApp = new Map();
  for (const d of docRows) {
    if (!docsByApp.has(d.applicationId)) docsByApp.set(d.applicationId, {});
    docsByApp.get(d.applicationId)[d.kind] = true;
  }

  const byCompany = new Map();
  for (const row of rows) {
    const docs = docsByApp.get(row.id) || {};
    const slug = row.companySlug || createSlug(row.company) || "uncategorized";
    if (!byCompany.has(slug)) byCompany.set(slug, { name: row.company || slug, slug, applications: [] });
    const meta = toMetadata(row, filesMapFromDocs(docs));
    byCompany.get(slug).applications.push({ ...meta, ...flagsFromDocs(docs) });
  }

  const companies = [...byCompany.values()].map((c) => {
    c.applications.sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""));
    const lastUpdated = c.applications.map((a) => a.updatedAt || a.createdAt).sort().slice(-1)[0] || null;
    return {
      name: c.name,
      slug: c.slug,
      applicationCount: c.applications.length,
      lastUpdated,
      recentRoles: [...new Set(c.applications.map((a) => a.role))].slice(0, 3),
      applications: c.applications,
    };
  });
  companies.sort((a, b) => (b.lastUpdated || "").localeCompare(a.lastUpdated || ""));

  const allApps = companies.flatMap((c) => c.applications);
  const now = new Date();
  const thisMonth = allApps.filter((a) => {
    const d = new Date(a.createdAt);
    return d.getUTCFullYear() === now.getUTCFullYear() && d.getUTCMonth() === now.getUTCMonth();
  }).length;
  const scored = allApps.filter((a) => typeof a.matchScore === "number");
  const avg = scored.length ? Math.round(scored.reduce((s, a) => s + a.matchScore, 0) / scored.length) : 0;

  return {
    summary: {
      companyCount: companies.length,
      applicationCount: allApps.length,
      applicationsThisMonth: thisMonth,
      averageMatchScore: avg,
      corrupted: 0,
    },
    companies,
  };
}

export async function getCompany(companySlug) {
  const { companies } = await listApplications();
  return companies.find((c) => c.slug === companySlug) || null;
}

export async function createApplication(input) {
  const db = await getDb();
  const userId = await currentUserId();

  const companyName = (input.company || "").trim() || "Uncategorized";
  const companySlug = createSlug(companyName) || "uncategorized";
  const roleName = (input.role || "").trim() || "Unknown Role";
  const roleSlug = createSlug(roleName) || "unknown-role";
  const { iso, date, hhmmss } = nowParts();
  const id = await uniqueApplicationId(db, `${companySlug}-${roleSlug}-${date}-${hhmmss}`);
  const mode = input.mode || "local";
  const resumeVariant = input.resumeVariant || "v1";

  await db.insert(applications).values({
    id, userId,
    company: companyName, companySlug, role: roleName, roleSlug,
    location: input.location || "",
    jobUrl: input.jobUrl || "",
    workMode: input.workMode || "",
    applicationDate: date,
    status: input.status || "Ready to Apply",
    statusUpdatedAt: new Date(iso),
    priority: input.priority || "Medium",
    tags: input.tags || [],
    mode, resumeVariant,
    matchScore: typeof input.matchScore === "number" ? input.matchScore : null,
    fitScore: input.fitScore ?? input.fitReport?.overall ?? null,
    migrated: false,
    extra: {},
    createdAt: new Date(iso), updatedAt: new Date(iso),
  });

  const docs = [
    ["job_description", input.jobDescription],
    ["original_resume", input.originalResume],
    ["tailored_resume", input.tailoredResume ? JSON.stringify({ tailoredResume: input.tailoredResume, mode, resumeVariant }, null, 2) : null],
    ["match_report", input.matchReport ? JSON.stringify(input.matchReport, null, 2) : null],
    ["fit_report", input.fitReport ? JSON.stringify(input.fitReport, null, 2) : null],
    ["resume_diff", input.resumeDiff ? JSON.stringify(input.resumeDiff, null, 2) : null],
    ["quality_report", input.qualityReport ? JSON.stringify(input.qualityReport, null, 2) : null],
  ];
  for (const [kind, content] of docs) {
    if (content) await upsertDoc(db, id, kind, content);
  }

  await addActivity(db, id, { type: "application_created", detail: `${companyName} — ${roleName}` });
  if (input.tailoredResume) {
    await addActivity(db, id, { type: "resume_tailored", detail: `Tailored resume (${mode === "api" ? "Claude API" : "Local"} mode)` });
  }

  const row = await getRow(db, id);
  const stored = await getDocs(db, id);
  return toMetadata(row, filesMapFromDocs(stored));
}

export async function getApplication(id, { full = false } = {}) {
  const db = await getDb();
  const row = await getRow(db, id);
  if (!row) return null;
  const docs = await getDocs(db, id);
  const meta = { ...toMetadata(row, filesMapFromDocs(docs)), ...flagsFromDocs(docs) };
  if (!full) return meta;

  const tailored = parseJson(docs.tailored_resume?.content);
  const events = await db.select().from(applicationActivity)
    .where(eq(applicationActivity.applicationId, id));

  // Virtual file listing: stored documents, the generatable .docx files, metadata.
  const fileList = [];
  for (const [kind, rec] of Object.entries(docs)) {
    const name = KIND_TO_FILE[kind];
    if (!name) continue;
    fileList.push({
      name,
      size: Buffer.byteLength(rec.content || "", "utf8"),
      updatedAt: rec.updatedAt instanceof Date ? rec.updatedAt.toISOString() : rec.updatedAt,
    });
  }
  if (docs.tailored_resume) fileList.push({ name: "resume.docx", size: null, updatedAt: meta.updatedAt, generated: true });
  if (docs.cover_letter) fileList.push({ name: "cover-letter.docx", size: null, updatedAt: meta.updatedAt, generated: true });
  fileList.sort((a, b) => a.name.localeCompare(b.name));

  return {
    ...meta,
    jobDescription: docs.job_description?.content || "",
    originalResume: docs.original_resume?.content || "",
    coverLetterText: docs.cover_letter?.content || "",
    tailoredResume: tailored?.tailoredResume || "",
    matchReport: parseJson(docs.match_report?.content),
    fitReport: parseJson(docs.fit_report?.content),
    resumeDiff: parseJson(docs.resume_diff?.content),
    qualityReport: parseJson(docs.quality_report?.content),
    fileList,
    activity: events
      .map((e) => ({
        id: e.id, type: e.type, from: e.fromStatus || undefined, to: e.toStatus || undefined,
        detail: e.detail || undefined,
        createdAt: e.createdAt instanceof Date ? e.createdAt.toISOString() : e.createdAt,
      }))
      .sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || "")),
  };
}

export async function updateApplication(id, patch = {}) {
  const db = await getDb();
  const row = await getRow(db, id);
  if (!row) return null;

  const columns = ["status", "jobUrl", "location", "role", "company", "matchScore", "resumeVariant", "priority", "workMode"];
  const set = {};
  for (const k of columns) if (k in patch && patch[k] !== undefined) set[k] = patch[k];
  if ("company" in set) set.companySlug = createSlug(set.company) || "uncategorized";
  if ("role" in set) set.roleSlug = createSlug(set.role) || "unknown-role";
  // Anything not a column (e.g. notes) is preserved in extra.
  const extraKeys = Object.keys(patch).filter((k) => !columns.includes(k) && k !== "company" && k !== "role");
  if (extraKeys.length) {
    set.extra = { ...(row.extra || {}), ...Object.fromEntries(extraKeys.map((k) => [k, patch[k]])) };
  }
  await touch(db, id, set);

  const updated = await getRow(db, id);
  const docs = await getDocs(db, id);
  return toMetadata(updated, filesMapFromDocs(docs));
}

export async function changeStatus(id, toStatus) {
  if (!STATUSES.includes(toStatus)) {
    throw Object.assign(new Error("Unknown status."), { status: 400 });
  }
  const db = await getDb();
  const row = await getRow(db, id);
  if (!row) return null;
  if (row.status === toStatus) {
    const docs = await getDocs(db, id);
    return toMetadata(row, filesMapFromDocs(docs));
  }
  const now = new Date();
  await touch(db, id, { status: toStatus, statusUpdatedAt: now });
  await addActivity(db, id, { type: "status_changed", from: row.status, to: toStatus });
  const updated = await getRow(db, id);
  const docs = await getDocs(db, id);
  return toMetadata(updated, filesMapFromDocs(docs));
}

export async function getActivity(id) {
  const db = await getDb();
  const row = await getRow(db, id);
  if (!row) return null;
  const events = await db.select().from(applicationActivity)
    .where(eq(applicationActivity.applicationId, id));
  return events
    .map((e) => ({
      id: e.id, type: e.type, from: e.fromStatus || undefined, to: e.toStatus || undefined,
      detail: e.detail || undefined,
      createdAt: e.createdAt instanceof Date ? e.createdAt.toISOString() : e.createdAt,
    }))
    .sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""));
}

export async function deleteApplication(id) {
  const db = await getDb();
  const row = await getRow(db, id);
  if (!row) return false;
  await db.delete(applicationDocuments).where(eq(applicationDocuments.applicationId, id));
  await db.delete(applicationActivity).where(eq(applicationActivity.applicationId, id));
  await db.delete(applicationMessages).where(eq(applicationMessages.applicationId, id));
  await db.delete(applications).where(eq(applications.id, id));
  return true;
}

export async function duplicateApplication(id) {
  const db = await getDb();
  const row = await getRow(db, id);
  if (!row) return null;
  const userId = await currentUserId();
  const { iso, date, hhmmss } = nowParts();
  const newId = await uniqueApplicationId(db, `${row.companySlug}-${row.roleSlug}-${date}-${hhmmss}`);

  await db.insert(applications).values({
    ...row,
    id: newId, userId,
    applicationDate: date,
    status: "Tailored",
    statusUpdatedAt: new Date(iso),
    migrated: false,
    createdAt: new Date(iso), updatedAt: new Date(iso),
  });

  const docs = await getDocs(db, id);
  for (const [kind, rec] of Object.entries(docs)) {
    await upsertDoc(db, newId, kind, rec.content);
  }
  await addActivity(db, newId, { type: "application_created", detail: "Duplicated from an existing application" });

  const created = await getRow(db, newId);
  return toMetadata(created, filesMapFromDocs(docs));
}

export async function setNextFollowUp(id, isoOrNull) {
  const db = await getDb();
  const row = await getRow(db, id);
  if (!row) return null;
  await touch(db, id, { nextFollowUpAt: isoOrNull || null });
  const updated = await getRow(db, id);
  const docs = await getDocs(db, id);
  return toMetadata(updated, filesMapFromDocs(docs));
}

export async function getInterview(id) {
  const db = await getDb();
  const row = await getRow(db, id);
  if (!row) return null;
  const docs = await getDocs(db, id);
  const data = parseJson(docs.interview?.content);
  return data || { questions: [], questionsToAsk: [], rounds: [], updatedAt: null };
}

export async function saveInterview(id, data = {}) {
  const db = await getDb();
  const row = await getRow(db, id);
  if (!row) return null;
  const docs = await getDocs(db, id);
  const existing = parseJson(docs.interview?.content) || {};
  const next = {
    questions: Array.isArray(data.questions) ? data.questions : existing.questions || [],
    questionsToAsk: Array.isArray(data.questionsToAsk) ? data.questionsToAsk : existing.questionsToAsk || [],
    rounds: Array.isArray(data.rounds) ? data.rounds : existing.rounds || [],
    updatedAt: new Date().toISOString(),
  };
  await upsertDoc(db, id, "interview", JSON.stringify(next, null, 2));
  if (!existing.updatedAt) await addActivity(db, id, { type: "interview_prep_started", detail: "Interview preparation started" });
  await touch(db, id);
  return next;
}

export async function listMessages(id) {
  const db = await getDb();
  const row = await getRow(db, id);
  if (!row) return null;
  const rows = await db.select().from(applicationMessages)
    .where(eq(applicationMessages.applicationId, id));
  const messages = rows.map((m) => ({
    id: m.id, type: m.type, subject: m.subject || "", body: m.body,
    contactId: m.contactId, contactName: m.contactName || "", status: m.status,
    createdAt: m.createdAt instanceof Date ? m.createdAt.toISOString() : m.createdAt,
    updatedAt: m.updatedAt instanceof Date ? m.updatedAt.toISOString() : m.updatedAt,
  }));
  messages.sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""));
  return { messages };
}

export async function saveMessage(id, input) {
  const db = await getDb();
  const row = await getRow(db, id);
  if (!row) return null;
  const msgId = input.id || nextId("msg");
  const now = new Date();
  const message = {
    id: msgId,
    applicationId: id,
    type: input.type || "application_follow_up",
    subject: (input.subject || "").trim(),
    body: (input.body || "").trim(),
    contactId: input.contactId || null,
    contactName: (input.contactName || "").trim(),
    status: input.status === "sent" ? "sent" : "draft",
    createdAt: input.createdAt ? new Date(input.createdAt) : now,
    updatedAt: now,
  };
  await db.insert(applicationMessages).values(message)
    .onConflictDoUpdate({
      target: applicationMessages.id,
      set: { subject: message.subject, body: message.body, status: message.status, updatedAt: now },
    });
  await addActivity(db, id, { type: "message_drafted", detail: `${message.type} draft saved` });
  return { ...message, createdAt: message.createdAt.toISOString(), updatedAt: now.toISOString() };
}

export async function deleteMessage(id, messageId) {
  const db = await getDb();
  const row = await getRow(db, id);
  if (!row) return false;
  const existing = await db.select().from(applicationMessages)
    .where(and(eq(applicationMessages.id, messageId), eq(applicationMessages.applicationId, id))).limit(1);
  if (!existing[0]) return false;
  await db.delete(applicationMessages).where(eq(applicationMessages.id, messageId));
  return true;
}

export async function saveApplicationFile(id, filename, data) {
  const kind = FILE_TO_KIND[filename];
  if (!kind) {
    // .docx files are generated on demand and never stored.
    if (GENERATED[filename]) {
      const db = await getDb();
      const row = await getRow(db, id);
      if (!row) throw Object.assign(new Error("Application not found."), { status: 404 });
      const docs = await getDocs(db, id);
      return toMetadata(row, filesMapFromDocs(docs));
    }
    throw Object.assign(new Error("Invalid or unsupported filename."), { status: 400 });
  }
  const db = await getDb();
  const row = await getRow(db, id);
  if (!row) throw Object.assign(new Error("Application not found."), { status: 404 });

  const content = typeof data === "string" ? data : Buffer.from(data).toString("utf8");
  await upsertDoc(db, id, kind, content);
  if (kind === "cover_letter") await addActivity(db, id, { type: "cover_letter_generated", detail: "Cover letter saved" });
  await touch(db, id);

  const updated = await getRow(db, id);
  const docs = await getDocs(db, id);
  return toMetadata(updated, filesMapFromDocs(docs));
}

export async function readApplicationFile(id, filename) {
  const db = await getDb();
  const row = await getRow(db, id);
  if (!row) throw Object.assign(new Error("Application not found."), { status: 404 });

  if (GENERATED[filename]) {
    const buffer = GENERATED[filename] === "resume"
      ? await generateResumeDocx(id)
      : await generateCoverLetterDocx(id);
    return { buffer, contentType: CONTENT_TYPES[".docx"] };
  }

  if (filename === "metadata.json") {
    const docs = await getDocs(db, id);
    const body = JSON.stringify(toMetadata(row, filesMapFromDocs(docs)), null, 2);
    return { buffer: Buffer.from(body, "utf8"), contentType: CONTENT_TYPES[".json"] };
  }

  const kind = FILE_TO_KIND[filename];
  if (!kind) throw Object.assign(new Error("Invalid filename."), { status: 400 });
  const docs = await getDocs(db, id);
  const rec = docs[kind];
  if (!rec) throw Object.assign(new Error("File not found."), { status: 404 });
  const ext = filename.slice(filename.lastIndexOf("."));
  return { buffer: Buffer.from(rec.content, "utf8"), contentType: CONTENT_TYPES[ext] || "application/octet-stream" };
}

export async function generateResumeDocx(id, variant) {
  const app = await getApplication(id, { full: true });
  if (!app) throw Object.assign(new Error("Application not found."), { status: 404 });
  return Packer.toBuffer(buildResumeDoc(app.tailoredResume || "", variant || app.resumeVariant || "v1"));
}

export async function generateCoverLetterDocx(id, variant) {
  const app = await getApplication(id, { full: true });
  if (!app) throw Object.assign(new Error("Application not found."), { status: 404 });
  return Packer.toBuffer(buildLetterDoc(app.coverLetterText || "", variant || app.resumeVariant || "v1"));
}
