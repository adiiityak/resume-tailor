import { and, eq } from "drizzle-orm";
import { ENTRY_STATUSES, SECTIONS } from "@/lib/masterResumeShared";
import { getDb } from "@/lib/db/client";
import { masterResume, masterResumeEntries } from "@/lib/db/schema";
import { currentUserId } from "@/lib/store/shared";
import { extractMasterFromResume } from "@/lib/store/masterResumeImport";

export { ENTRY_STATUSES, SECTIONS };

let seq = 0;
function newId() {
  seq = (seq + 1) % 100000;
  return `entry-${Date.now().toString(36)}-${seq}`;
}

function asArray(v) {
  if (Array.isArray(v)) return v.filter((x) => typeof x === "string");
  if (typeof v === "string") return v.split(/[,\n]/).map((s) => s.trim()).filter(Boolean);
  return [];
}

const EMPTY_CONTACT = { name: "", email: "", phone: "", location: "", linkedin: "", portfolio: "", github: "" };

function toEntry(row) {
  return {
    id: row.id,
    section: row.section,
    title: row.title || "",
    org: row.org || "",
    dates: row.dates || "",
    bullets: row.bullets || [],
    skills: row.skills || [],
    tags: row.tags || [],
    metrics: row.metrics || "",
    status: row.status,
    updatedAt: row.updatedAt instanceof Date ? row.updatedAt.toISOString() : row.updatedAt,
  };
}

async function ensureHeader(db, userId) {
  const rows = await db.select().from(masterResume).where(eq(masterResume.userId, userId)).limit(1);
  if (rows[0]) return rows[0];
  const row = { userId, contact: EMPTY_CONTACT, summary: "", updatedAt: new Date() };
  await db.insert(masterResume).values(row).onConflictDoNothing();
  return row;
}

export async function getMaster() {
  const db = await getDb();
  const userId = await currentUserId();
  const header = await ensureHeader(db, userId);
  const rows = await db.select().from(masterResumeEntries).where(eq(masterResumeEntries.userId, userId));
  const entries = rows.map(toEntry);
  entries.sort((a, b) => SECTIONS.indexOf(a.section) - SECTIONS.indexOf(b.section));
  return {
    contact: { ...EMPTY_CONTACT, ...(header.contact || {}) },
    summary: header.summary || "",
    entries,
    updatedAt: header.updatedAt instanceof Date ? header.updatedAt.toISOString() : header.updatedAt,
  };
}

export async function patchHeader(patch) {
  const db = await getDb();
  const userId = await currentUserId();
  const header = await ensureHeader(db, userId);
  const set = { updatedAt: new Date() };
  if (patch.contact) set.contact = { ...EMPTY_CONTACT, ...(header.contact || {}), ...patch.contact };
  if (patch.summary !== undefined) set.summary = patch.summary;
  await db.update(masterResume).set(set).where(eq(masterResume.userId, userId));
  return getMaster();
}

function normalizeEntry(input, userId) {
  return {
    id: input.id || newId(),
    userId,
    section: SECTIONS.includes(input.section) ? input.section : "Experience",
    title: (input.title || "").trim(),
    org: (input.org || "").trim(),
    dates: (input.dates || "").trim(),
    bullets: asArray(input.bullets),
    skills: asArray(input.skills),
    tags: asArray(input.tags),
    metrics: (input.metrics || "").trim(),
    status: ENTRY_STATUSES.includes(input.status) ? input.status : "Needs Review",
    sortOrder: input.sortOrder ?? 0,
    updatedAt: new Date(),
  };
}

export async function addEntry(entry) {
  const db = await getDb();
  const userId = await currentUserId();
  await ensureHeader(db, userId);
  const row = normalizeEntry(entry, userId);
  await db.insert(masterResumeEntries).values(row);
  return toEntry(row);
}

async function getEntry(db, id) {
  const userId = await currentUserId();
  const rows = await db.select().from(masterResumeEntries)
    .where(and(eq(masterResumeEntries.id, id), eq(masterResumeEntries.userId, userId))).limit(1);
  return rows[0] || null;
}

export async function updateEntry(id, patch) {
  const db = await getDb();
  const existing = await getEntry(db, id);
  if (!existing) return null;

  const set = { updatedAt: new Date() };
  if ("section" in patch && SECTIONS.includes(patch.section)) set.section = patch.section;
  if ("status" in patch && ENTRY_STATUSES.includes(patch.status)) set.status = patch.status;
  for (const k of ["title", "org", "dates", "metrics"]) {
    if (k in patch && patch[k] !== undefined) set[k] = (patch[k] || "").trim();
  }
  for (const k of ["bullets", "skills", "tags"]) {
    if (k in patch) set[k] = asArray(patch[k]);
  }

  await db.update(masterResumeEntries).set(set).where(eq(masterResumeEntries.id, id));
  return toEntry(await getEntry(db, id));
}

export async function deleteEntry(id) {
  const db = await getDb();
  const existing = await getEntry(db, id);
  if (!existing) return false;
  await db.delete(masterResumeEntries).where(eq(masterResumeEntries.id, id));
  return true;
}

export async function importFromResume(resumeText) {
  const db = await getDb();
  const userId = await currentUserId();
  const header = await ensureHeader(db, userId);
  const { contact, summary, entries } = extractMasterFromResume(resumeText);

  // Only fill blanks — never overwrite details the user already curated.
  const current = { ...EMPTY_CONTACT, ...(header.contact || {}) };
  const merged = { ...current };
  for (const k of ["name", "email", "phone", "linkedin"]) {
    if (!current[k] && contact[k]) merged[k] = contact[k];
  }
  const nextSummary = header.summary || summary || "";
  await db.update(masterResume)
    .set({ contact: merged, summary: nextSummary, updatedAt: new Date() })
    .where(eq(masterResume.userId, userId));

  let added = 0;
  for (const e of entries) {
    await db.insert(masterResumeEntries).values(normalizeEntry(e, userId));
    added += 1;
  }

  return { added, master: await getMaster() };
}
