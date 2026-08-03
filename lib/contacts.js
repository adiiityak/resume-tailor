import { promises as fs } from "fs";
import path from "path";
import { CONTACT_RELATIONSHIPS } from "@/lib/contactsShared";

export { CONTACT_RELATIONSHIPS };

const DIR = path.join(process.cwd(), "contacts");
const SAFE_ID = /^[a-z0-9][a-z0-9-]*$/i;

let seq = 0;
function newId() {
  seq = (seq + 1) % 100000;
  return `con-${Date.now().toString(36)}-${seq}`;
}

async function readJsonSafe(p) {
  try { return JSON.parse(await fs.readFile(p, "utf8")); } catch { return null; }
}
async function pathExists(p) {
  try { await fs.access(p); return true; } catch { return false; }
}

function normalize(input, existing = {}) {
  return {
    id: existing.id || newId(),
    name: (input.name ?? existing.name ?? "").trim(),
    role: (input.role ?? existing.role ?? "").trim(),
    company: (input.company ?? existing.company ?? "").trim(),
    email: (input.email ?? existing.email ?? "").trim(),
    phone: (input.phone ?? existing.phone ?? "").trim(),
    linkedin: (input.linkedin ?? existing.linkedin ?? "").trim(),
    relationship: CONTACT_RELATIONSHIPS.includes(input.relationship) ? input.relationship : existing.relationship || "Recruiter",
    source: (input.source ?? existing.source ?? "").trim(),
    notes: (input.notes ?? existing.notes ?? "").trim(),
    applicationId: input.applicationId ?? existing.applicationId ?? null,
    companySlug: input.companySlug ?? existing.companySlug ?? "",
    lastContacted: input.lastContacted ?? existing.lastContacted ?? "",
    nextFollowUp: input.nextFollowUp ?? existing.nextFollowUp ?? "",
    createdAt: existing.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

export async function listContacts() {
  let files = [];
  try {
    files = (await fs.readdir(DIR)).filter((f) => f.endsWith(".json"));
  } catch {
    return { contacts: [] };
  }
  const contacts = [];
  for (const f of files) {
    const c = await readJsonSafe(path.join(DIR, f));
    if (c && c.id) contacts.push(c);
  }
  contacts.sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""));
  return { contacts };
}

export async function createContact(input) {
  await fs.mkdir(DIR, { recursive: true });
  const c = normalize(input);
  await fs.writeFile(path.join(DIR, `${c.id}.json`), JSON.stringify(c, null, 2));
  return c;
}

export async function updateContact(id, patch) {
  if (!SAFE_ID.test(id)) return null;
  const p = path.join(DIR, `${id}.json`);
  const existing = await readJsonSafe(p);
  if (!existing) return null;
  const next = normalize(patch, existing);
  await fs.writeFile(p, JSON.stringify(next, null, 2));
  return next;
}

export async function deleteContact(id) {
  if (!SAFE_ID.test(id)) return false;
  const p = path.join(DIR, `${id}.json`);
  if (!(await pathExists(p))) return false;
  await fs.rm(p, { force: true });
  return true;
}
