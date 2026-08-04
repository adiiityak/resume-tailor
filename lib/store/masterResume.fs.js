import { promises as fs } from "fs";
import path from "path";
import { extractMasterFromResume } from "@/lib/store/masterResumeImport";
import { ENTRY_STATUSES, SECTIONS } from "@/lib/masterResumeShared";

export { ENTRY_STATUSES, SECTIONS };

const DIR = path.join(process.cwd(), "master-resume");
const FILE = path.join(DIR, "master.json");

const EMPTY = () => ({
  contact: { name: "", email: "", phone: "", location: "", linkedin: "", portfolio: "", github: "" },
  summary: "",
  entries: [],
  updatedAt: null,
});

async function read() {
  try {
    return JSON.parse(await fs.readFile(FILE, "utf8"));
  } catch {
    return EMPTY();
  }
}

async function write(doc) {
  await fs.mkdir(DIR, { recursive: true });
  doc.updatedAt = new Date().toISOString();
  await fs.writeFile(FILE, JSON.stringify(doc, null, 2));
  return doc;
}

let seq = 0;
function newId(prefix) {
  seq = (seq + 1) % 100000;
  return `${prefix}-${Date.now().toString(36)}-${seq}`;
}

function asArray(v) {
  if (Array.isArray(v)) return v.filter((x) => typeof x === "string");
  if (typeof v === "string") return v.split(/[,\n]/).map((s) => s.trim()).filter(Boolean);
  return [];
}

function normalizeEntry(input) {
  return {
    id: input.id || newId("entry"),
    section: SECTIONS.includes(input.section) ? input.section : "Experience",
    title: (input.title || "").trim(),
    org: (input.org || "").trim(),
    dates: (input.dates || "").trim(),
    bullets: asArray(input.bullets),
    skills: asArray(input.skills),
    tags: asArray(input.tags),
    metrics: (input.metrics || "").trim(),
    status: ENTRY_STATUSES.includes(input.status) ? input.status : "Needs Review",
    updatedAt: new Date().toISOString(),
  };
}

const ENTRY_PATCH_KEYS = ["section", "title", "org", "dates", "bullets", "skills", "tags", "metrics", "status"];

export async function getMaster() {
  return read();
}

export async function patchHeader(patch) {
  const doc = await read();
  if (patch.contact) doc.contact = { ...doc.contact, ...patch.contact };
  if (patch.summary !== undefined) doc.summary = patch.summary;
  return write(doc);
}

export async function addEntry(entry) {
  const doc = await read();
  const e = normalizeEntry(entry);
  doc.entries.push(e);
  await write(doc);
  return e;
}

export async function updateEntry(id, patch) {
  const doc = await read();
  const i = doc.entries.findIndex((e) => e.id === id);
  if (i < 0) return null;
  const next = { ...doc.entries[i] };
  for (const k of ENTRY_PATCH_KEYS) {
    if (k in patch) next[k] = k === "bullets" || k === "skills" || k === "tags" ? asArray(patch[k]) : patch[k];
  }
  next.updatedAt = new Date().toISOString();
  doc.entries[i] = next;
  await write(doc);
  return next;
}

export async function deleteEntry(id) {
  const doc = await read();
  const before = doc.entries.length;
  doc.entries = doc.entries.filter((e) => e.id !== id);
  if (doc.entries.length === before) return false;
  await write(doc);
  return true;
}

// Uses the shared parser so both storage drivers extract identically. Entries are
// marked Needs Review so the user approves them before use. Never invents content.
export async function importFromResume(resumeText) {
  const doc = await read();
  const { contact, summary, entries } = extractMasterFromResume(resumeText);

  // Only fill blanks — never overwrite details the user already curated.
  for (const k of ["name", "email", "phone", "linkedin"]) {
    if (!doc.contact[k] && contact[k]) doc.contact[k] = contact[k];
  }
  if (!doc.summary && summary) doc.summary = summary;

  let added = 0;
  for (const e of entries) {
    doc.entries.push(normalizeEntry(e));
    added += 1;
  }

  await write(doc);
  return { added, master: doc };
}
