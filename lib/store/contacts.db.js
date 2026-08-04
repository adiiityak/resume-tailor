import { and, eq } from "drizzle-orm";
import { CONTACT_RELATIONSHIPS } from "@/lib/contactsShared";
import { getDb } from "@/lib/db/client";
import { contacts } from "@/lib/db/schema";
import { currentUserId } from "@/lib/store/shared";

export { CONTACT_RELATIONSHIPS };

let seq = 0;
function newId() {
  seq = (seq + 1) % 100000;
  return `con-${Date.now().toString(36)}-${seq}`;
}

function toContact(row) {
  return {
    id: row.id,
    name: row.name || "",
    role: row.role || "",
    company: row.company || "",
    email: row.email || "",
    phone: row.phone || "",
    linkedin: row.linkedin || "",
    relationship: row.relationship || "Recruiter",
    source: row.source || "",
    notes: row.notes || "",
    applicationId: row.applicationId || null,
    companySlug: row.companySlug || "",
    lastContacted: row.lastContacted || "",
    nextFollowUp: row.nextFollowUp || "",
    createdAt: row.createdAt instanceof Date ? row.createdAt.toISOString() : row.createdAt,
    updatedAt: row.updatedAt instanceof Date ? row.updatedAt.toISOString() : row.updatedAt,
  };
}

export async function listContacts() {
  const db = await getDb();
  const userId = await currentUserId();
  const rows = await db.select().from(contacts).where(eq(contacts.userId, userId));
  const list = rows.map(toContact);
  list.sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""));
  return { contacts: list };
}

async function getOne(db, id) {
  const userId = await currentUserId();
  const rows = await db.select().from(contacts)
    .where(and(eq(contacts.id, id), eq(contacts.userId, userId))).limit(1);
  return rows[0] || null;
}

export async function createContact(input) {
  const db = await getDb();
  const userId = await currentUserId();
  const now = new Date();
  const row = {
    id: newId(), userId,
    name: (input.name || "").trim(),
    role: (input.role || "").trim(),
    company: (input.company || "").trim(),
    email: (input.email || "").trim(),
    phone: (input.phone || "").trim(),
    linkedin: (input.linkedin || "").trim(),
    relationship: CONTACT_RELATIONSHIPS.includes(input.relationship) ? input.relationship : "Recruiter",
    source: (input.source || "").trim(),
    notes: (input.notes || "").trim(),
    applicationId: input.applicationId || null,
    companySlug: input.companySlug || "",
    lastContacted: input.lastContacted || "",
    nextFollowUp: input.nextFollowUp || "",
    createdAt: now, updatedAt: now,
  };
  await db.insert(contacts).values(row);
  return toContact(row);
}

export async function updateContact(id, patch) {
  const db = await getDb();
  const existing = await getOne(db, id);
  if (!existing) return null;

  const text = ["name", "role", "company", "email", "phone", "linkedin", "source", "notes", "lastContacted", "nextFollowUp", "companySlug"];
  const set = { updatedAt: new Date() };
  for (const k of text) if (k in patch && patch[k] !== undefined) set[k] = (patch[k] || "").trim();
  if ("relationship" in patch && CONTACT_RELATIONSHIPS.includes(patch.relationship)) set.relationship = patch.relationship;
  if ("applicationId" in patch) set.applicationId = patch.applicationId || null;

  await db.update(contacts).set(set).where(eq(contacts.id, id));
  const updated = await getOne(db, id);
  return toContact(updated);
}

export async function deleteContact(id) {
  const db = await getDb();
  const existing = await getOne(db, id);
  if (!existing) return false;
  await db.delete(contacts).where(eq(contacts.id, id));
  return true;
}
