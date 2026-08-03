import { promises as fs } from "fs";
import path from "path";
import { parseResume } from "@/lib/resumeParser";
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

const SECTION_MAP = [
  { re: /SUMMARY|PROFILE|OBJECTIVE/i, kind: "summary" },
  { re: /EXPERIENCE|EMPLOYMENT|WORK/i, section: "Experience" },
  { re: /PROJECT/i, section: "Projects" },
  { re: /EDUCATION/i, section: "Education" },
  { re: /SKILL|TOOL|TECH/i, section: "Skills" },
  { re: /CERTIF|LICENSE/i, section: "Certifications" },
  { re: /AWARD|HONOR|ACHIEVE/i, section: "Awards" },
];

function sectionFor(title) {
  const m = SECTION_MAP.find((x) => x.re.test(title || ""));
  return m || null;
}

// Parses a pasted resume into master-resume entries (marked Needs Review so the
// user approves them before they are used). Never invents content.
export async function importFromResume(resumeText) {
  const parsed = parseResume(resumeText);
  const doc = await read();

  if (parsed.name && !doc.contact.name) doc.contact.name = parsed.name;
  const contactBlob = parsed.contact.join(" ");
  const email = contactBlob.match(/[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/i)?.[0];
  const phone = contactBlob.match(/\+?\d[\d ()-]{7,}\d/)?.[0];
  const linkedin = contactBlob.match(/linkedin\.com\/[^\s|]+/i)?.[0];
  if (email && !doc.contact.email) doc.contact.email = email;
  if (phone && !doc.contact.phone) doc.contact.phone = phone.trim();
  if (linkedin && !doc.contact.linkedin) doc.contact.linkedin = linkedin;

  const added = [];
  for (const sec of parsed.sections) {
    const map = sectionFor(sec.title);
    if (!map) continue;

    if (map.kind === "summary") {
      const text = sec.items.map((i) => i.text || "").filter(Boolean).join(" ");
      if (text && !doc.summary) doc.summary = text;
      continue;
    }

    if (map.section === "Skills") {
      const bullets = sec.items.map((i) => i.text || "").filter(Boolean);
      if (bullets.length) {
        const e = normalizeEntry({ section: "Skills", title: "Skills", bullets });
        doc.entries.push(e);
        added.push(e);
      }
      continue;
    }

    // Experience / Projects / Education / Certifications / Awards: group by entry line.
    let current = null;
    for (const item of sec.items) {
      if (item.kind === "entry") {
        current = normalizeEntry({ section: map.section, org: item.left, dates: item.right, bullets: [] });
        doc.entries.push(current);
        added.push(current);
      } else if (item.kind === "sub") {
        if (current && !current.title) current.title = item.text;
        else {
          current = normalizeEntry({ section: map.section, title: item.text, bullets: [] });
          doc.entries.push(current);
          added.push(current);
        }
      } else if (item.kind === "bullet") {
        if (!current) {
          current = normalizeEntry({ section: map.section, bullets: [] });
          doc.entries.push(current);
          added.push(current);
        }
        current.bullets.push(item.text);
      } else if (item.kind === "text") {
        current = normalizeEntry({ section: map.section, title: item.text, bullets: [] });
        doc.entries.push(current);
        added.push(current);
      }
    }
  }

  await write(doc);
  return { added: added.length, master: doc };
}
