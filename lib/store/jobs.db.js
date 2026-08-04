import { and, eq } from "drizzle-orm";
import { extractKeywords } from "@/lib/localTailor";
import { JOB_STATUSES, JOB_PRIORITIES, INTEREST_LEVELS } from "@/lib/jobsShared";
import { getDb } from "@/lib/db/client";
import { jobs } from "@/lib/db/schema";
import { createSlug, currentUserId } from "@/lib/store/shared";

export { JOB_STATUSES, JOB_PRIORITIES, INTEREST_LEVELS, createSlug };

function nowParts(date = new Date()) {
  const iso = date.toISOString();
  return { iso, compact: iso.slice(0, 10).replace(/-/g, ""), hhmmss: iso.slice(11, 19).replace(/:/g, "") };
}

function normalizeText(text) {
  return (text || "").toLowerCase().replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, " ").trim();
}

function jaccard(a, b) {
  if (a.size === 0 && b.size === 0) return 0;
  let inter = 0;
  for (const t of a) if (b.has(t)) inter += 1;
  const union = a.size + b.size - inter;
  return union === 0 ? 0 : inter / union;
}

function keywordSet(jd) {
  return new Set(extractKeywords(jd || "").map((k) => k.toLowerCase()));
}

function jobSimilarity(a, b) {
  const kwSim = jaccard(keywordSet(a.jobDescription), keywordSet(b.jobDescription));
  const titleA = new Set(normalizeText(a.role).split(" ").filter(Boolean));
  const titleB = new Set(normalizeText(b.role).split(" ").filter(Boolean));
  const titleSim = jaccard(titleA, titleB);
  const companyMatch = a.companySlug && a.companySlug === b.companySlug ? 1 : 0;
  return kwSim * 0.6 + titleSim * 0.25 + companyMatch * 0.15;
}

function toJob(row) {
  return {
    id: row.id,
    company: row.company || "",
    companySlug: row.companySlug || "",
    role: row.role || "",
    roleSlug: row.roleSlug || "",
    location: row.location || "",
    workMode: row.workMode || "",
    jobUrl: row.jobUrl || "",
    source: row.source || "",
    salaryRange: row.salaryRange || "",
    closingDate: row.closingDate || "",
    dateSaved: row.dateSaved instanceof Date ? row.dateSaved.toISOString() : row.dateSaved,
    updatedAt: row.updatedAt instanceof Date ? row.updatedAt.toISOString() : row.updatedAt,
    priority: row.priority || "Medium",
    interest: row.interest || "Medium",
    notes: row.notes || "",
    jobDescription: row.jobDescription || "",
    status: row.status || "Saved",
    tags: row.tags || [],
    applicationId: row.applicationId || null,
  };
}

export async function listJobs() {
  const db = await getDb();
  const userId = await currentUserId();
  const rows = await db.select().from(jobs).where(eq(jobs.userId, userId));
  const list = rows.map(toJob);
  list.sort((a, b) => (b.dateSaved || "").localeCompare(a.dateSaved || ""));
  return { jobs: list, corrupted: 0 };
}

export async function getJob(id) {
  const db = await getDb();
  const userId = await currentUserId();
  const rows = await db.select().from(jobs)
    .where(and(eq(jobs.id, id), eq(jobs.userId, userId))).limit(1);
  return rows[0] ? toJob(rows[0]) : null;
}

export async function findSimilarJobs(candidate, excludeId) {
  const { jobs: all } = await listJobs();
  return all
    .filter((j) => j.id !== excludeId)
    .map((j) => ({
      id: j.id, company: j.company, role: j.role, dateSaved: j.dateSaved,
      similarity: Math.round(jobSimilarity(candidate, j) * 100),
    }))
    .filter((j) => j.similarity >= 65)
    .sort((a, b) => b.similarity - a.similarity);
}

async function uniqueJobId(db, base) {
  let candidate = base;
  let n = 1;
  for (;;) {
    const rows = await db.select({ id: jobs.id }).from(jobs).where(eq(jobs.id, candidate)).limit(1);
    if (!rows[0]) return candidate;
    n += 1;
    candidate = `${base}-${n}`;
  }
}

export async function createJob(input) {
  const db = await getDb();
  const userId = await currentUserId();
  const company = (input.company || "").trim();
  const role = (input.role || "").trim();
  const companySlug = createSlug(company) || "job";
  const roleSlug = createSlug(role) || "role";
  const { iso, compact, hhmmss } = nowParts();
  const id = await uniqueJobId(db, `${companySlug}-${roleSlug}-${compact}-${hhmmss}`);

  const job = {
    id, userId, company, companySlug, role, roleSlug,
    location: input.location || "",
    workMode: input.workMode || "",
    jobUrl: input.jobUrl || "",
    source: input.source || "",
    salaryRange: input.salaryRange || "",
    closingDate: input.closingDate || "",
    priority: JOB_PRIORITIES.includes(input.priority) ? input.priority : "Medium",
    interest: INTEREST_LEVELS.includes(input.interest) ? input.interest : "Medium",
    notes: input.notes || "",
    jobDescription: input.jobDescription || "",
    status: JOB_STATUSES.includes(input.status) ? input.status : "Saved",
    tags: input.tags || [],
    applicationId: input.applicationId || null,
    dateSaved: new Date(iso), updatedAt: new Date(iso),
  };

  const shaped = toJob({ ...job, dateSaved: new Date(iso), updatedAt: new Date(iso) });
  const similar = await findSimilarJobs(shaped);
  await db.insert(jobs).values(job);
  return { job: shaped, similar };
}

export async function updateJob(id, patch = {}) {
  const db = await getDb();
  const existing = await getJob(id);
  if (!existing) return null;

  const allowed = [
    "company", "role", "location", "workMode", "jobUrl", "source", "salaryRange",
    "closingDate", "priority", "interest", "notes", "jobDescription", "status", "tags", "applicationId",
  ];
  const set = {};
  for (const k of allowed) if (k in patch && patch[k] !== undefined) set[k] = patch[k];
  if (patch.company !== undefined) set.companySlug = createSlug(patch.company) || "job";
  if (patch.role !== undefined) set.roleSlug = createSlug(patch.role) || "role";
  set.updatedAt = new Date();

  await db.update(jobs).set(set).where(eq(jobs.id, id));
  return getJob(id);
}

export async function deleteJob(id) {
  const db = await getDb();
  const existing = await getJob(id);
  if (!existing) return false;
  await db.delete(jobs).where(eq(jobs.id, id));
  return true;
}

export async function compareJobs(idA, idB) {
  const a = await getJob(idA);
  const b = await getJob(idB);
  if (!a || !b) return null;
  const ka = keywordSet(a.jobDescription);
  const kb = keywordSet(b.jobDescription);
  return {
    a: { id: a.id, company: a.company, role: a.role, location: a.location, dateSaved: a.dateSaved },
    b: { id: b.id, company: b.company, role: b.role, location: b.location, dateSaved: b.dateSaved },
    similarity: Math.round(jobSimilarity(a, b) * 100),
    shared: [...ka].filter((k) => kb.has(k)),
    newInA: [...ka].filter((k) => !kb.has(k)),
    removedFromB: [...kb].filter((k) => !ka.has(k)),
    locationChanged: normalizeText(a.location) !== normalizeText(b.location),
  };
}
