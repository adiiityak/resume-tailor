import { promises as fs } from "fs";
import path from "path";
import { Packer } from "docx";
import { buildResumeDoc, buildLetterDoc } from "@/lib/docxBuilder";

const HISTORY_DIR = path.join(process.cwd(), "history");

const SAFE_FILENAME = /^[a-z0-9][a-z0-9._-]*$/i;
const KNOWN_FILES = new Set([
  "resume.docx",
  "resume.pdf",
  "cover-letter.docx",
  "cover-letter.pdf",
  "job-description.txt",
  "match-report.json",
  "metadata.json",
  "original-resume.txt",
  "tailored-resume.json",
  "cover-letter.txt",
  "fit-report.json",
  "resume-diff.json",
  "resume-quality-report.json",
]);

export const STATUSES = [
  "Saved",
  "Tailoring",
  "Ready to Apply",
  "Applied",
  "Assessment",
  "Recruiter Screen",
  "Interviewing",
  "Offer",
  "Rejected",
  "Withdrawn",
  "Archived",
];

let activitySeq = 0;

async function readActivity(dir) {
  const data = await readJsonSafe(path.join(dir, "activity.json"));
  return Array.isArray(data) ? data : [];
}

async function appendActivity(dir, event) {
  const events = await readActivity(dir);
  const now = new Date();
  activitySeq = (activitySeq + 1) % 100000;
  events.push({
    id: `event-${now.getTime()}-${activitySeq}`,
    createdAt: now.toISOString(),
    ...event,
  });
  await fs.writeFile(path.join(dir, "activity.json"), JSON.stringify(events, null, 2));
  return events;
}

export function createSlug(value) {
  return (value || "")
    .toLowerCase()
    .trim()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function isSafeFilename(name) {
  return typeof name === "string" && SAFE_FILENAME.test(name) && !name.includes("..") && !name.includes("/");
}

function nowParts(date = new Date()) {
  const iso = date.toISOString();
  return {
    iso,
    date: iso.slice(0, 10), // YYYY-MM-DD
    hhmmss: iso.slice(11, 19).replace(/:/g, ""), // HHMMSS (UTC)
  };
}

async function pathExists(p) {
  try {
    await fs.access(p);
    return true;
  } catch {
    return false;
  }
}

// Folder names embed only HH:MM:SS, so two applications created (or duplicated)
// inside the same second would land in the same folder and overwrite each other.
// Returns "" or "-2", "-3", ... so both the folder and the id stay unique.
async function uniqueSuffix(companySlug, date, baseName) {
  let suffix = "";
  let n = 1;
  for (;;) {
    const candidate = path.join(HISTORY_DIR, companySlug, date, `${baseName}${suffix}`);
    if (!(await pathExists(candidate))) return suffix;
    n += 1;
    suffix = `-${n}`;
  }
}

async function readJsonSafe(p) {
  try {
    return JSON.parse(await fs.readFile(p, "utf8"));
  } catch {
    return null;
  }
}

async function readTextIfPresent(p) {
  try {
    return await fs.readFile(/* turbopackIgnore: true */ p, "utf8");
  } catch (error) {
    if (error?.code === "ENOENT") return "";
    throw error;
  }
}

// ---------------------------------------------------------------------------
// Migration of legacy flat history (history/<Company>/<type>-<ts>.json)
// ---------------------------------------------------------------------------

const LEGACY_FILE = /^(resume|coverLetter)-.*\.json$/;

async function migrateLegacyFolder(companyDirName) {
  const companyDir = path.join(HISTORY_DIR, companyDirName);
  let entries;
  try {
    entries = await fs.readdir(companyDir, { withFileTypes: true });
  } catch {
    return;
  }

  const looseFiles = entries.filter((e) => e.isFile() && LEGACY_FILE.test(e.name));
  if (looseFiles.length === 0) return;

  // Group legacy records by their job description so a resume + cover letter
  // saved for the same posting become one application.
  const groups = new Map();
  for (const f of looseFiles) {
    const full = path.join(companyDir, f.name);
    const rec = await readJsonSafe(full);
    if (!rec) continue;
    const stat = await fs.stat(full);
    const savedAt = rec.savedAt || stat.mtime.toISOString();
    const key = (rec.jobDescription || "").trim() || `__${f.name}`;
    if (!groups.has(key)) groups.set(key, { records: [], jobDescription: rec.jobDescription || "" });
    groups.get(key).records.push({ ...rec, savedAt, _file: full });
  }

  const companyName = companyDirName === "uncategorized" ? "Uncategorized" : companyDirName;
  const companySlug = createSlug(companyName) || "uncategorized";

  for (const group of groups.values()) {
    const savedAts = group.records.map((r) => r.savedAt).sort();
    const created = new Date(savedAts[0]);
    const { date, hhmmss } = nowParts(created);
    const roleSlug = "unknown-role";
    const folder = path.join(HISTORY_DIR, companySlug, date, `${roleSlug}-${hhmmss}`);

    // Preserve the legacy records as an immutable source archive. If this group
    // was already copied on an earlier scan, do not rewrite it on every read.
    if (await pathExists(path.join(folder, "metadata.json"))) continue;
    await fs.mkdir(folder, { recursive: true });

    const files = {};
    const resumeRec = group.records.find((r) => r.type === "resume");
    const clRec = group.records.find((r) => r.type === "coverLetter");

    if (group.jobDescription) {
      await fs.writeFile(path.join(folder, "job-description.txt"), group.jobDescription);
      files.jobDescription = "job-description.txt";
    }
    if (resumeRec) {
      await fs.writeFile(
        path.join(folder, "tailored-resume.json"),
        JSON.stringify({ tailoredResume: resumeRec.content, migrated: true }, null, 2)
      );
      files.tailoredResume = "tailored-resume.json";
    }
    if (clRec) {
      await fs.writeFile(path.join(folder, "cover-letter.txt"), clRec.content);
      files.coverLetterText = "cover-letter.txt";
    }

    const id = `${companySlug}-${roleSlug}-${date}-${hhmmss}`;
    const metadata = {
      id,
      company: companyName,
      companySlug,
      role: "Unknown Role",
      roleSlug,
      createdAt: created.toISOString(),
      updatedAt: new Date(savedAts[savedAts.length - 1]).toISOString(),
      applicationDate: date,
      location: "",
      jobUrl: "",
      mode: "local",
      resumeVariant: "v1",
      matchScore: null,
      status: "Tailored",
      migrated: true,
      files,
    };
    await fs.writeFile(path.join(folder, "metadata.json"), JSON.stringify(metadata, null, 2));

    // Intentionally keep the original flat JSON files. The structured copy is
    // what the app reads, while the original remains available for recovery or
    // auditing. No migration step should destroy personal source data.
  }
}

async function ensureMigrated() {
  let entries;
  try {
    entries = await fs.readdir(HISTORY_DIR, { withFileTypes: true });
  } catch {
    return; // no history yet
  }
  for (const e of entries) {
    if (e.isDirectory()) {
      await migrateLegacyFolder(e.name);
    }
  }
}

// ---------------------------------------------------------------------------
// Walking the application tree
// ---------------------------------------------------------------------------

// Returns { apps: [{ dir, metadata }], corrupted: number }
async function walkApplications() {
  await ensureMigrated();
  const apps = [];
  let corrupted = 0;

  let companyDirs;
  try {
    companyDirs = await fs.readdir(HISTORY_DIR, { withFileTypes: true });
  } catch {
    return { apps, corrupted };
  }

  for (const company of companyDirs) {
    if (!company.isDirectory()) continue;
    const companyPath = path.join(HISTORY_DIR, company.name);
    let dateDirs;
    try {
      dateDirs = await fs.readdir(companyPath, { withFileTypes: true });
    } catch {
      continue;
    }
    for (const dateDir of dateDirs) {
      if (!dateDir.isDirectory()) continue;
      const datePath = path.join(companyPath, dateDir.name);
      let roleDirs;
      try {
        roleDirs = await fs.readdir(datePath, { withFileTypes: true });
      } catch {
        continue;
      }
      for (const roleDir of roleDirs) {
        if (!roleDir.isDirectory()) continue;
        const dir = path.join(datePath, roleDir.name);
        const metaPath = path.join(dir, "metadata.json");
        if (!(await pathExists(metaPath))) continue;
        const metadata = await readJsonSafe(metaPath);
        if (!metadata || !metadata.id) {
          corrupted += 1;
          continue;
        }
        apps.push({ dir, metadata });
      }
    }
  }
  return { apps, corrupted };
}

async function findAppDir(id) {
  const { apps } = await walkApplications();
  const match = apps.find((a) => a.metadata.id === id);
  return match || null;
}

async function computeFlags(dir, metadata) {
  const has = async (name) => (name ? pathExists(path.join(dir, name)) : false);
  const f = metadata.files || {};
  return {
    hasResume: (await has(f.resumeDocx)) || (await has("resume.docx")) || (await has(f.tailoredResume)) || (await has("tailored-resume.json")),
    hasCoverLetter: (await has(f.coverLetterDocx)) || (await has("cover-letter.docx")) || (await has(f.coverLetterText)) || (await has("cover-letter.txt")),
    hasJobDescription: (await has(f.jobDescription)) || (await has("job-description.txt")),
    hasMatchReport: (await has(f.matchReport)) || (await has("match-report.json")),
  };
}

async function mapWithConcurrency(items, limit, worker) {
  const results = new Array(items.length);
  let cursor = 0;
  async function run() {
    for (;;) {
      const index = cursor;
      cursor += 1;
      if (index >= items.length) return;
      results[index] = await worker(items[index]);
    }
  }
  const workers = Array.from({ length: Math.min(limit, items.length) }, () => run());
  await Promise.all(workers);
  return results;
}

function analyticsMetadata(metadata) {
  return {
    id: metadata.id,
    company: metadata.company || "",
    companySlug: metadata.companySlug || createSlug(metadata.company),
    role: metadata.role || "Unknown Role",
    roleSlug: metadata.roleSlug || createSlug(metadata.role),
    location: metadata.location || "",
    applicationSource: metadata.applicationSource || "",
    status: metadata.status || "Saved",
    submittedAt: metadata.submittedAt || null,
    applicationDate: metadata.applicationDate || null,
    createdAt: metadata.createdAt || null,
    statusUpdatedAt: metadata.statusUpdatedAt || metadata.updatedAt || null,
    matchScore: metadata.matchScore ?? null,
    resumeVariant: metadata.resumeVariant || "v1",
    baseProfileId: metadata.baseProfileId || null,
    submittedResumeVersion: metadata.submittedResumeVersion || null,
    submittedCoverLetterVersion: metadata.submittedCoverLetterVersion || null,
    mode: metadata.mode || "local",
  };
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export async function listApplications() {
  const { apps, corrupted } = await walkApplications();

  const byCompany = new Map();
  for (const { dir, metadata } of apps) {
    const flags = await computeFlags(dir, metadata);
    const slug = metadata.companySlug || createSlug(metadata.company) || "uncategorized";
    if (!byCompany.has(slug)) {
      byCompany.set(slug, { name: metadata.company || slug, slug, applications: [] });
    }
    byCompany.get(slug).applications.push({
      id: metadata.id,
      company: metadata.company,
      companySlug: slug,
      role: metadata.role || "Unknown Role",
      roleSlug: metadata.roleSlug || createSlug(metadata.role),
      applicationDate: metadata.applicationDate,
      createdAt: metadata.createdAt,
      updatedAt: metadata.updatedAt,
      matchScore: metadata.matchScore ?? null,
      fitScore: metadata.fitScore ?? null,
      status: metadata.status || "Saved",
      statusUpdatedAt: metadata.statusUpdatedAt || metadata.updatedAt || null,
      priority: metadata.priority || "Medium",
      workMode: metadata.workMode || "",
      nextFollowUpAt: metadata.nextFollowUpAt || null,
      tags: metadata.tags || [],
      mode: metadata.mode || "local",
      resumeVariant: metadata.resumeVariant || "v1",
      location: metadata.location || "",
      migrated: !!metadata.migrated,
      ...flags,
    });
  }

  const companies = [...byCompany.values()].map((c) => {
    c.applications.sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""));
    const lastUpdated = c.applications
      .map((a) => a.updatedAt || a.createdAt)
      .sort()
      .slice(-1)[0] || null;
    const recentRoles = [...new Set(c.applications.map((a) => a.role))].slice(0, 3);
    return {
      name: c.name,
      slug: c.slug,
      applicationCount: c.applications.length,
      lastUpdated,
      recentRoles,
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
      corrupted,
    },
    companies,
  };
}

export async function loadAnalyticsApplications() {
  const { apps, corrupted } = await walkApplications();
  const loaded = await mapWithConcurrency(apps, 8, async ({ dir, metadata }) => {
    try {
      const files = metadata.files || {};
      const jobDescriptionFile = files.jobDescription === "job-description.txt"
        ? files.jobDescription
        : "job-description.txt";
      const [jobDescription, activityData] = await Promise.all([
        readTextIfPresent(path.join(/* turbopackIgnore: true */ dir, jobDescriptionFile)),
        readJsonSafe(path.join(dir, "activity.json")),
      ]);
      return {
        application: {
          ...analyticsMetadata(metadata),
          jobDescription,
          activity: Array.isArray(activityData) ? activityData : [],
        },
        corrupted: 0,
      };
    } catch {
      return { application: null, corrupted: 1 };
    }
  });
  return {
    applications: loaded.flatMap((result) => result.application ? [result.application] : []),
    corrupted: corrupted + loaded.reduce((total, result) => total + result.corrupted, 0),
  };
}

export async function getCompany(companySlug) {
  const { companies } = await listApplications();
  return companies.find((c) => c.slug === companySlug) || null;
}

export async function createApplication(input) {
  const {
    company,
    role,
    jobDescription = "",
    originalResume = "",
    tailoredResume = "",
    matchReport = null,
    mode = "local",
    resumeVariant = "v1",
    matchScore = null,
    location = "",
    jobUrl = "",
    status = "Ready to Apply",
  } = input;

  const companyName = (company || "").trim() || "Uncategorized";
  const companySlug = createSlug(companyName) || "uncategorized";
  const roleName = (role || "").trim() || "Unknown Role";
  const roleSlug = createSlug(roleName) || "unknown-role";

  const { iso, date, hhmmss } = nowParts();
  const suffix = await uniqueSuffix(companySlug, date, `${roleSlug}-${hhmmss}`);
  const folder = path.join(HISTORY_DIR, companySlug, date, `${roleSlug}-${hhmmss}${suffix}`);
  await fs.mkdir(folder, { recursive: true });

  const files = {};

  if (jobDescription) {
    await fs.writeFile(path.join(folder, "job-description.txt"), jobDescription);
    files.jobDescription = "job-description.txt";
  }
  if (originalResume) {
    await fs.writeFile(path.join(folder, "original-resume.txt"), originalResume);
    files.originalResume = "original-resume.txt";
  }
  if (tailoredResume) {
    await fs.writeFile(
      path.join(folder, "tailored-resume.json"),
      JSON.stringify({ tailoredResume, mode, resumeVariant }, null, 2)
    );
    files.tailoredResume = "tailored-resume.json";

    // Auto-generate a Word copy of the resume up front.
    try {
      const buf = await Packer.toBuffer(buildResumeDoc(tailoredResume, resumeVariant));
      await fs.writeFile(path.join(folder, "resume.docx"), buf);
      files.resumeDocx = "resume.docx";
    } catch {
      /* non-fatal */
    }
  }
  if (matchReport) {
    await fs.writeFile(path.join(folder, "match-report.json"), JSON.stringify(matchReport, null, 2));
    files.matchReport = "match-report.json";
  }
  if (input.fitReport) {
    await fs.writeFile(path.join(folder, "fit-report.json"), JSON.stringify(input.fitReport, null, 2));
    files.fitReport = "fit-report.json";
  }
  if (input.resumeDiff) {
    await fs.writeFile(path.join(folder, "resume-diff.json"), JSON.stringify(input.resumeDiff, null, 2));
    files.resumeDiff = "resume-diff.json";
  }
  if (input.qualityReport) {
    await fs.writeFile(path.join(folder, "resume-quality-report.json"), JSON.stringify(input.qualityReport, null, 2));
    files.qualityReport = "resume-quality-report.json";
  }

  const id = `${companySlug}-${roleSlug}-${date}-${hhmmss}${suffix}`;
  const metadata = {
    id,
    company: companyName,
    companySlug,
    role: roleName,
    roleSlug,
    createdAt: iso,
    updatedAt: iso,
    applicationDate: date,
    location,
    jobUrl,
    workMode: input.workMode || "",
    priority: input.priority || "Medium",
    tags: input.tags || [],
    mode,
    resumeVariant,
    matchScore,
    fitScore: input.fitScore ?? input.fitReport?.overall ?? null,
    status,
    statusUpdatedAt: iso,
    submittedAt: input.submittedAt || null,
    submittedResumeVersion: input.submittedResumeVersion || null,
    submittedCoverLetterVersion: input.submittedCoverLetterVersion || null,
    applicationSource: input.applicationSource || "",
    baseProfileId: input.baseProfileId || null,
    migrated: false,
    files,
  };
  await fs.writeFile(path.join(folder, "metadata.json"), JSON.stringify(metadata, null, 2));

  await appendActivity(folder, { type: "application_created", detail: `${companyName} — ${roleName}` });
  if (tailoredResume) await appendActivity(folder, { type: "resume_tailored", detail: `Tailored resume (${mode === "api" ? "Claude API" : "Local"} mode)` });

  return metadata;
}

export async function getApplication(id, { full = false } = {}) {
  const found = await findAppDir(id);
  if (!found) return null;
  const { dir, metadata } = found;
  const flags = await computeFlags(dir, metadata);

  if (!full) return { ...metadata, ...flags };

  const readText = async (name) => (name && (await pathExists(path.join(dir, name))) ? fs.readFile(path.join(dir, name), "utf8") : null);
  const f = metadata.files || {};

  const jobDescription = await readText(f.jobDescription || "job-description.txt");
  const originalResume = await readText(f.originalResume || "original-resume.txt");
  const coverLetterText = await readText(f.coverLetterText || "cover-letter.txt");
  const tailoredJson = await readText(f.tailoredResume || "tailored-resume.json");
  const matchJson = await readText(f.matchReport || "match-report.json");

  let tailoredResume = "";
  try {
    tailoredResume = tailoredJson ? JSON.parse(tailoredJson).tailoredResume || "" : "";
  } catch {
    tailoredResume = "";
  }
  const parseJson = (raw) => { if (!raw) return null; try { return JSON.parse(raw); } catch { return null; } };
  const matchReport = parseJson(matchJson);
  const fitReport = parseJson(await readText(f.fitReport || "fit-report.json"));
  const resumeDiff = parseJson(await readText(f.resumeDiff || "resume-diff.json"));
  const qualityReport = parseJson(await readText(f.qualityReport || "resume-quality-report.json"));

  // File listing with size + mtime
  let fileList = [];
  try {
    const names = await fs.readdir(dir);
    fileList = await Promise.all(
      names.map(async (name) => {
        const stat = await fs.stat(path.join(dir, name));
        return { name, size: stat.size, updatedAt: stat.mtime.toISOString() };
      })
    );
    fileList.sort((a, b) => a.name.localeCompare(b.name));
  } catch {
    /* ignore */
  }

  const activity = await readActivity(dir);

  return {
    ...metadata,
    ...flags,
    jobDescription: jobDescription || "",
    originalResume: originalResume || "",
    coverLetterText: coverLetterText || "",
    tailoredResume,
    matchReport,
    fitReport,
    resumeDiff,
    qualityReport,
    fileList,
    activity: activity.sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || "")),
  };
}

export async function updateApplication(id, patch = {}) {
  const found = await findAppDir(id);
  if (!found) return null;
  const { dir, metadata } = found;

  const allowed = [
    "status", "jobUrl", "location", "role", "company", "notes", "matchScore", "resumeVariant",
    "submittedAt", "submittedResumeVersion", "submittedCoverLetterVersion", "applicationSource", "baseProfileId",
  ];
  const next = { ...metadata };
  for (const key of allowed) {
    if (key in patch && patch[key] !== undefined) next[key] = patch[key];
  }
  next.updatedAt = new Date().toISOString();

  await fs.writeFile(path.join(dir, "metadata.json"), JSON.stringify(next, null, 2));
  return next;
}

export async function changeStatus(id, toStatus) {
  if (!STATUSES.includes(toStatus)) {
    throw Object.assign(new Error("Unknown status."), { status: 400 });
  }
  const found = await findAppDir(id);
  if (!found) return null;
  const { dir, metadata } = found;
  const from = metadata.status;
  if (from === toStatus) return metadata;

  const iso = new Date().toISOString();
  const next = { ...metadata, status: toStatus, statusUpdatedAt: iso, updatedAt: iso };
  await fs.writeFile(path.join(dir, "metadata.json"), JSON.stringify(next, null, 2));
  await appendActivity(dir, { type: "status_changed", from, to: toStatus });
  return next;
}

const SAFE_MESSAGE_FILE = /^[a-z0-9][a-z0-9-]*\.json$/i;

export async function listMessages(id) {
  const found = await findAppDir(id);
  if (!found) return null;
  const dir = path.join(found.dir, "messages");
  let files = [];
  try {
    files = (await fs.readdir(dir)).filter((f) => SAFE_MESSAGE_FILE.test(f));
  } catch {
    return { messages: [] };
  }
  const messages = [];
  for (const f of files) {
    const m = await readJsonSafe(path.join(dir, f));
    if (m && m.id) messages.push(m);
  }
  messages.sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""));
  return { messages };
}

export async function saveMessage(id, input) {
  const found = await findAppDir(id);
  if (!found) return null;
  const dir = path.join(found.dir, "messages");
  await fs.mkdir(dir, { recursive: true });

  activitySeq = (activitySeq + 1) % 100000;
  const msgId = input.id && SAFE_MESSAGE_FILE.test(`${input.id}.json`)
    ? input.id
    : `msg-${Date.now().toString(36)}-${activitySeq}`;

  const message = {
    id: msgId,
    type: input.type || "application_follow_up",
    subject: (input.subject || "").trim(),
    body: (input.body || "").trim(),
    contactId: input.contactId || null,
    contactName: (input.contactName || "").trim(),
    status: input.status === "sent" ? "sent" : "draft",
    createdAt: input.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  await fs.writeFile(path.join(dir, `${msgId}.json`), JSON.stringify(message, null, 2));
  await appendActivity(found.dir, { type: "message_drafted", detail: `${message.type} draft saved` });
  return message;
}

export async function deleteMessage(id, messageId) {
  if (!SAFE_MESSAGE_FILE.test(`${messageId}.json`)) {
    throw Object.assign(new Error("Invalid message id."), { status: 400 });
  }
  const found = await findAppDir(id);
  if (!found) return false;
  const p = path.join(found.dir, "messages", `${messageId}.json`);
  if (!(await pathExists(p))) return false;
  await fs.rm(p, { force: true });
  return true;
}

export async function setNextFollowUp(id, isoOrNull) {
  const found = await findAppDir(id);
  if (!found) return null;
  const { dir, metadata } = found;
  const next = { ...metadata, nextFollowUpAt: isoOrNull || null, updatedAt: new Date().toISOString() };
  await fs.writeFile(path.join(dir, "metadata.json"), JSON.stringify(next, null, 2));
  return next;
}

export async function getInterview(id) {
  const found = await findAppDir(id);
  if (!found) return null;
  const data = await readJsonSafe(path.join(found.dir, "interview.json"));
  return data || { questions: [], questionsToAsk: [], rounds: [], updatedAt: null };
}

export async function saveInterview(id, data = {}) {
  const found = await findAppDir(id);
  if (!found) return null;
  const { dir } = found;
  const existing = (await readJsonSafe(path.join(dir, "interview.json"))) || {};
  const next = {
    questions: Array.isArray(data.questions) ? data.questions : existing.questions || [],
    questionsToAsk: Array.isArray(data.questionsToAsk) ? data.questionsToAsk : existing.questionsToAsk || [],
    rounds: Array.isArray(data.rounds) ? data.rounds : existing.rounds || [],
    updatedAt: new Date().toISOString(),
  };
  await fs.writeFile(path.join(dir, "interview.json"), JSON.stringify(next, null, 2));
  if (!existing.updatedAt) await appendActivity(dir, { type: "interview_prep_started", detail: "Interview preparation started" });
  return next;
}

export async function getActivity(id) {
  const found = await findAppDir(id);
  if (!found) return null;
  const events = await readActivity(found.dir);
  if (events.length === 0 && found.metadata.migrated) {
    return [{ id: "event-migrated", type: "application_created", createdAt: found.metadata.createdAt, detail: "Migrated from earlier history" }];
  }
  return events.sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""));
}

export async function deleteApplication(id) {
  const found = await findAppDir(id);
  if (!found) return false;
  const { dir } = found;
  await fs.rm(dir, { recursive: true, force: true });

  // Clean up now-empty date and company folders.
  const dateDir = path.dirname(dir);
  const companyDir = path.dirname(dateDir);
  for (const d of [dateDir, companyDir]) {
    try {
      const remaining = await fs.readdir(d);
      if (remaining.length === 0) await fs.rmdir(d);
    } catch {
      /* ignore */
    }
  }
  return true;
}

export async function duplicateApplication(id) {
  const src = await findAppDir(id);
  if (!src) return null;
  const { dir, metadata } = src;

  const companySlug = metadata.companySlug || "uncategorized";
  const roleSlug = metadata.roleSlug || "unknown-role";
  const { iso, date, hhmmss } = nowParts();
  const suffix = await uniqueSuffix(companySlug, date, `${roleSlug}-${hhmmss}`);
  const destDir = path.join(HISTORY_DIR, companySlug, date, `${roleSlug}-${hhmmss}${suffix}`);
  await fs.mkdir(destDir, { recursive: true });

  const names = await fs.readdir(dir);
  for (const name of names) {
    if (name === "metadata.json") continue;
    await fs.copyFile(path.join(dir, name), path.join(destDir, name));
  }

  const newId = `${companySlug}-${roleSlug}-${date}-${hhmmss}${suffix}`;
  const newMeta = {
    ...metadata,
    id: newId,
    createdAt: iso,
    updatedAt: iso,
    applicationDate: date,
    status: "Tailored",
    migrated: false,
  };
  await fs.writeFile(path.join(destDir, "metadata.json"), JSON.stringify(newMeta, null, 2));
  return newMeta;
}

export async function saveApplicationFile(id, filename, data) {
  if (!isSafeFilename(filename) || !KNOWN_FILES.has(filename)) {
    throw Object.assign(new Error("Invalid or unsupported filename."), { status: 400 });
  }
  const found = await findAppDir(id);
  if (!found) throw Object.assign(new Error("Application not found."), { status: 404 });
  const { dir, metadata } = found;

  await fs.writeFile(path.join(dir, filename), data);

  const keyByFile = {
    "resume.docx": "resumeDocx",
    "resume.pdf": "resumePdf",
    "cover-letter.docx": "coverLetterDocx",
    "cover-letter.pdf": "coverLetterPdf",
    "cover-letter.txt": "coverLetterText",
    "job-description.txt": "jobDescription",
    "match-report.json": "matchReport",
    "tailored-resume.json": "tailoredResume",
    "original-resume.txt": "originalResume",
  };
  const files = { ...(metadata.files || {}) };
  const key = keyByFile[filename];
  if (key) files[key] = filename;

  const next = { ...metadata, files, updatedAt: new Date().toISOString() };
  await fs.writeFile(path.join(dir, "metadata.json"), JSON.stringify(next, null, 2));

  if (filename === "cover-letter.txt") {
    await appendActivity(dir, { type: "cover_letter_generated", detail: "Cover letter saved" });
  }
  return next;
}

const CONTENT_TYPES = {
  ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ".pdf": "application/pdf",
  ".txt": "text/plain; charset=utf-8",
  ".json": "application/json",
};

export async function readApplicationFile(id, filename) {
  if (!isSafeFilename(filename)) {
    throw Object.assign(new Error("Invalid filename."), { status: 400 });
  }
  const found = await findAppDir(id);
  if (!found) throw Object.assign(new Error("Application not found."), { status: 404 });
  const { dir } = found;
  const filePath = path.join(dir, filename);
  if (!(await pathExists(filePath))) {
    throw Object.assign(new Error("File not found."), { status: 404 });
  }
  const buffer = await fs.readFile(filePath);
  const ext = path.extname(filename).toLowerCase();
  return { buffer, contentType: CONTENT_TYPES[ext] || "application/octet-stream" };
}

// Generate (or regenerate) a DOCX from stored text and persist it, returning the buffer.
export async function generateResumeDocx(id, variant) {
  const app = await getApplication(id, { full: true });
  if (!app) throw Object.assign(new Error("Application not found."), { status: 404 });
  const buf = await Packer.toBuffer(buildResumeDoc(app.tailoredResume || "", variant || app.resumeVariant || "v1"));
  await saveApplicationFile(id, "resume.docx", buf);
  return buf;
}

export async function generateCoverLetterDocx(id, variant) {
  const app = await getApplication(id, { full: true });
  if (!app) throw Object.assign(new Error("Application not found."), { status: 404 });
  const buf = await Packer.toBuffer(buildLetterDoc(app.coverLetterText || "", variant || app.resumeVariant || "v1"));
  await saveApplicationFile(id, "cover-letter.docx", buf);
  return buf;
}
