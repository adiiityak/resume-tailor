import { promises as fs } from "fs";
import path from "path";
import { REMINDER_TYPES, REMINDER_STATUSES } from "@/lib/remindersShared";
import { setNextFollowUp } from "@/lib/applications";

export { REMINDER_TYPES, REMINDER_STATUSES };

const DIR = path.join(process.cwd(), "reminders");
const SAFE_ID = /^[a-z0-9][a-z0-9-]*$/i;

let seq = 0;
function newId() {
  seq = (seq + 1) % 100000;
  return `rem-${Date.now().toString(36)}-${seq}`;
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
    title: (input.title ?? existing.title ?? "").trim(),
    type: REMINDER_TYPES.includes(input.type) ? input.type : existing.type || "Application follow-up",
    applicationId: input.applicationId ?? existing.applicationId ?? null,
    company: (input.company ?? existing.company ?? "").trim(),
    role: (input.role ?? existing.role ?? "").trim(),
    dueDate: input.dueDate ?? existing.dueDate ?? "",
    dueTime: input.dueTime ?? existing.dueTime ?? "",
    status: REMINDER_STATUSES.includes(input.status) ? input.status : existing.status || "Pending",
    notes: (input.notes ?? existing.notes ?? "").trim(),
    completedAt: input.status === "Completed" ? new Date().toISOString() : existing.completedAt || null,
    createdAt: existing.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

export async function listReminders() {
  let files = [];
  try {
    files = (await fs.readdir(DIR)).filter((f) => f.endsWith(".json"));
  } catch {
    return { reminders: [] };
  }
  const reminders = [];
  for (const f of files) {
    const r = await readJsonSafe(path.join(DIR, f));
    if (r && r.id) reminders.push(r);
  }
  return { reminders };
}

// Recompute the linked application's nextFollowUpAt = soonest pending due date.
async function syncApplication(applicationId) {
  if (!applicationId) return;
  const { reminders } = await listReminders();
  const pending = reminders
    .filter((r) => r.applicationId === applicationId && r.status !== "Completed" && r.dueDate)
    .map((r) => r.dueDate)
    .sort();
  await setNextFollowUp(applicationId, pending[0] || null);
}

export async function createReminder(input) {
  await fs.mkdir(DIR, { recursive: true });
  const r = normalize(input);
  await fs.writeFile(path.join(DIR, `${r.id}.json`), JSON.stringify(r, null, 2));
  await syncApplication(r.applicationId);
  return r;
}

export async function updateReminder(id, patch) {
  if (!SAFE_ID.test(id)) return null;
  const p = path.join(DIR, `${id}.json`);
  const existing = await readJsonSafe(p);
  if (!existing) return null;
  const next = normalize(patch, existing);
  await fs.writeFile(p, JSON.stringify(next, null, 2));
  await syncApplication(next.applicationId);
  return next;
}

export async function deleteReminder(id) {
  if (!SAFE_ID.test(id)) return false;
  const p = path.join(DIR, `${id}.json`);
  const existing = await readJsonSafe(p);
  if (!existing) return false;
  await fs.rm(p, { force: true });
  await syncApplication(existing.applicationId);
  return true;
}
