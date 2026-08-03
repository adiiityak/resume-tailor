import { promises as fs } from "fs";
import path from "path";
import { extractKeywords } from "@/lib/localTailor";
import { JOB_STATUSES, JOB_PRIORITIES, INTEREST_LEVELS } from "@/lib/jobsShared";

export { JOB_STATUSES, JOB_PRIORITIES, INTEREST_LEVELS };

const JOBS_DIR = path.join(process.cwd(), "jobs");
const SAFE_ID = /^[a-z0-9][a-z0-9-]*$/i;

export function createSlug(value) {
  return (value || "")
    .toLowerCase()
    .trim()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function nowParts(date = new Date()) {
  const iso = date.toISOString();
  return { iso, date: iso.slice(0, 10), compact: iso.slice(0, 10).replace(/-/g, ""), hhmmss: iso.slice(11, 19).replace(/:/g, "") };
}

async function pathExists(p) {
  try { await fs.access(p); return true; } catch { return false; }
}

async function readJsonSafe(p) {
  try { return JSON.parse(await fs.readFile(p, "utf8")); } catch { return null; }
}

function normalize(text) {
  return (text || "").toLowerCase().replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, " ").trim();
}

function jaccard(aSet, bSet) {
  if (aSet.size === 0 && bSet.size === 0) return 0;
  let inter = 0;
  for (const t of aSet) if (bSet.has(t)) inter += 1;
  const union = aSet.size + bSet.size - inter;
  return union === 0 ? 0 : inter / union;
}

function keywordSet(jd) {
  return new Set(extractKeywords(jd || "").map((k) => k.toLowerCase()));
}

// Similarity between two jobs: blends job-description keyword overlap, title
// similarity, and company match into a 0-1 score.
function jobSimilarity(a, b) {
  const kwSim = jaccard(keywordSet(a.jobDescription), keywordSet(b.jobDescription));
  const titleA = new Set(normalize(a.role).split(" ").filter(Boolean));
  const titleB = new Set(normalize(b.role).split(" ").filter(Boolean));
  const titleSim = jaccard(titleA, titleB);
  const companyMatch = a.companySlug && a.companySlug === b.companySlug ? 1 : 0;
  return kwSim * 0.6 + titleSim * 0.25 + companyMatch * 0.15;
}

export async function listJobs() {
  let files = [];
  try {
    files = (await fs.readdir(JOBS_DIR)).filter((f) => f.endsWith(".json"));
  } catch {
    return { jobs: [], corrupted: 0 };
  }
  const jobs = [];
  let corrupted = 0;
  for (const f of files) {
    const job = await readJsonSafe(path.join(JOBS_DIR, f));
    if (!job || !job.id) { corrupted += 1; continue; }
    jobs.push(job);
  }
  jobs.sort((a, b) => (b.dateSaved || "").localeCompare(a.dateSaved || ""));
  return { jobs, corrupted };
}

export async function getJob(id) {
  if (!SAFE_ID.test(id)) return null;
  return readJsonSafe(path.join(JOBS_DIR, `${id}.json`));
}

export async function findSimilarJobs(candidate, excludeId) {
  const { jobs } = await listJobs();
  return jobs
    .filter((j) => j.id !== excludeId)
    .map((j) => ({ id: j.id, company: j.company, role: j.role, dateSaved: j.dateSaved, similarity: Math.round(jobSimilarity(candidate, j) * 100) }))
    .filter((j) => j.similarity >= 65)
    .sort((a, b) => b.similarity - a.similarity);
}

export async function createJob(input) {
  await fs.mkdir(JOBS_DIR, { recursive: true });
  const company = (input.company || "").trim();
  const role = (input.role || "").trim();
  const companySlug = createSlug(company) || "job";
  const roleSlug = createSlug(role) || "role";
  const { iso, compact, hhmmss } = nowParts();

  const id = `${companySlug}-${roleSlug}-${compact}-${hhmmss}`;
  const job = {
    id,
    company,
    companySlug,
    role,
    roleSlug,
    location: input.location || "",
    workMode: input.workMode || "",
    jobUrl: input.jobUrl || "",
    source: input.source || "",
    salaryRange: input.salaryRange || "",
    closingDate: input.closingDate || "",
    dateSaved: iso,
    updatedAt: iso,
    priority: JOB_PRIORITIES.includes(input.priority) ? input.priority : "Medium",
    interest: INTEREST_LEVELS.includes(input.interest) ? input.interest : "Medium",
    notes: input.notes || "",
    jobDescription: input.jobDescription || "",
    status: JOB_STATUSES.includes(input.status) ? input.status : "Saved",
    tags: input.tags || [],
    applicationId: input.applicationId || null,
  };

  const similar = await findSimilarJobs(job);
  await fs.writeFile(path.join(JOBS_DIR, `${id}.json`), JSON.stringify(job, null, 2));
  return { job, similar };
}

export async function updateJob(id, patch = {}) {
  const job = await getJob(id);
  if (!job) return null;
  const allowed = [
    "company", "role", "location", "workMode", "jobUrl", "source", "salaryRange",
    "closingDate", "priority", "interest", "notes", "jobDescription", "status", "tags", "applicationId",
  ];
  const next = { ...job };
  for (const k of allowed) if (k in patch && patch[k] !== undefined) next[k] = patch[k];
  if (patch.company !== undefined) next.companySlug = createSlug(patch.company) || "job";
  if (patch.role !== undefined) next.roleSlug = createSlug(patch.role) || "role";
  next.updatedAt = new Date().toISOString();
  await fs.writeFile(path.join(JOBS_DIR, `${id}.json`), JSON.stringify(next, null, 2));
  return next;
}

export async function deleteJob(id) {
  if (!SAFE_ID.test(id)) return false;
  const p = path.join(JOBS_DIR, `${id}.json`);
  if (!(await pathExists(p))) return false;
  await fs.rm(p, { force: true });
  return true;
}

// Compares two saved jobs: which requirement keywords are new, removed, or shared.
export async function compareJobs(idA, idB) {
  const a = await getJob(idA);
  const b = await getJob(idB);
  if (!a || !b) return null;
  const ka = keywordSet(a.jobDescription);
  const kb = keywordSet(b.jobDescription);
  const shared = [...ka].filter((k) => kb.has(k));
  const onlyA = [...ka].filter((k) => !kb.has(k));
  const onlyB = [...kb].filter((k) => !ka.has(k));
  return {
    a: { id: a.id, company: a.company, role: a.role, location: a.location, dateSaved: a.dateSaved },
    b: { id: b.id, company: b.company, role: b.role, location: b.location, dateSaved: b.dateSaved },
    similarity: Math.round(jobSimilarity(a, b) * 100),
    shared,
    newInA: onlyA,
    removedFromB: onlyB,
    locationChanged: normalize(a.location) !== normalize(b.location),
  };
}
