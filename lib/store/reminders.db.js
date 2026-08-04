import { and, eq } from "drizzle-orm";
import { REMINDER_TYPES, REMINDER_STATUSES } from "@/lib/remindersShared";
import { getDb } from "@/lib/db/client";
import { reminders } from "@/lib/db/schema";
import { currentUserId } from "@/lib/store/shared";
import { setNextFollowUp } from "@/lib/applications";

export { REMINDER_TYPES, REMINDER_STATUSES };

let seq = 0;
function newId() {
  seq = (seq + 1) % 100000;
  return `rem-${Date.now().toString(36)}-${seq}`;
}

function toReminder(row) {
  return {
    id: row.id,
    title: row.title || "",
    type: row.type || "Application follow-up",
    applicationId: row.applicationId || null,
    company: row.company || "",
    role: row.role || "",
    dueDate: row.dueDate || "",
    dueTime: row.dueTime || "",
    status: row.status || "Pending",
    notes: row.notes || "",
    completedAt: row.completedAt instanceof Date ? row.completedAt.toISOString() : row.completedAt,
    createdAt: row.createdAt instanceof Date ? row.createdAt.toISOString() : row.createdAt,
    updatedAt: row.updatedAt instanceof Date ? row.updatedAt.toISOString() : row.updatedAt,
  };
}

export async function listReminders() {
  const db = await getDb();
  const userId = await currentUserId();
  const rows = await db.select().from(reminders).where(eq(reminders.userId, userId));
  return { reminders: rows.map(toReminder) };
}

async function getOne(db, id) {
  const userId = await currentUserId();
  const rows = await db.select().from(reminders)
    .where(and(eq(reminders.id, id), eq(reminders.userId, userId))).limit(1);
  return rows[0] || null;
}

// Keeps the linked application's nextFollowUpAt equal to its soonest pending due date.
async function syncApplication(applicationId) {
  if (!applicationId) return;
  const { reminders: all } = await listReminders();
  const pending = all
    .filter((r) => r.applicationId === applicationId && r.status !== "Completed" && r.dueDate)
    .map((r) => r.dueDate)
    .sort();
  await setNextFollowUp(applicationId, pending[0] || null);
}

export async function createReminder(input) {
  const db = await getDb();
  const userId = await currentUserId();
  const now = new Date();
  const row = {
    id: newId(), userId,
    title: (input.title || "").trim(),
    type: REMINDER_TYPES.includes(input.type) ? input.type : "Application follow-up",
    applicationId: input.applicationId || null,
    company: (input.company || "").trim(),
    role: (input.role || "").trim(),
    dueDate: input.dueDate || "",
    dueTime: input.dueTime || "",
    status: REMINDER_STATUSES.includes(input.status) ? input.status : "Pending",
    notes: (input.notes || "").trim(),
    completedAt: input.status === "Completed" ? now : null,
    createdAt: now, updatedAt: now,
  };
  await db.insert(reminders).values(row);
  await syncApplication(row.applicationId);
  return toReminder(row);
}

export async function updateReminder(id, patch) {
  const db = await getDb();
  const existing = await getOne(db, id);
  if (!existing) return null;

  const set = { updatedAt: new Date() };
  for (const k of ["title", "company", "role", "notes"]) {
    if (k in patch && patch[k] !== undefined) set[k] = (patch[k] || "").trim();
  }
  for (const k of ["dueDate", "dueTime"]) {
    if (k in patch && patch[k] !== undefined) set[k] = patch[k] || "";
  }
  if ("type" in patch && REMINDER_TYPES.includes(patch.type)) set.type = patch.type;
  if ("applicationId" in patch) set.applicationId = patch.applicationId || null;
  if ("status" in patch && REMINDER_STATUSES.includes(patch.status)) {
    set.status = patch.status;
    set.completedAt = patch.status === "Completed" ? new Date() : existing.completedAt;
  }

  await db.update(reminders).set(set).where(eq(reminders.id, id));
  const updated = await getOne(db, id);
  const shaped = toReminder(updated);
  await syncApplication(shaped.applicationId);
  // A reminder can be moved between applications; refresh the old one too.
  if (existing.applicationId && existing.applicationId !== shaped.applicationId) {
    await syncApplication(existing.applicationId);
  }
  return shaped;
}

export async function deleteReminder(id) {
  const db = await getDb();
  const existing = await getOne(db, id);
  if (!existing) return false;
  await db.delete(reminders).where(eq(reminders.id, id));
  await syncApplication(existing.applicationId);
  return true;
}
