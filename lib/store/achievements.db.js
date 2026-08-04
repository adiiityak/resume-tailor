import { and, eq } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { achievements } from "@/lib/db/schema";
import { currentUserId } from "@/lib/store/shared";

let seq = 0;
function newId() {
  seq = (seq + 1) % 100000;
  return `ach-${Date.now().toString(36)}-${seq}`;
}

function asArray(v) {
  if (Array.isArray(v)) return v.filter((x) => typeof x === "string");
  if (typeof v === "string") return v.split(/[,\n]/).map((s) => s.trim()).filter(Boolean);
  return [];
}

function toAchievement(row) {
  return {
    id: row.id,
    title: row.title || "",
    context: row.context || "",
    action: row.action || "",
    result: row.result || "",
    metric: row.metric || "",
    company: row.company || "",
    project: row.project || "",
    date: row.date || "",
    skills: row.skills || [],
    tags: row.tags || [],
    evidence: row.evidence || "",
    resumeBullet: row.resumeBullet || "",
    createdAt: row.createdAt instanceof Date ? row.createdAt.toISOString() : row.createdAt,
    updatedAt: row.updatedAt instanceof Date ? row.updatedAt.toISOString() : row.updatedAt,
  };
}

export async function listAchievements() {
  const db = await getDb();
  const userId = await currentUserId();
  const rows = await db.select().from(achievements).where(eq(achievements.userId, userId));
  const list = rows.map(toAchievement);
  list.sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""));
  return { achievements: list };
}

async function getOne(db, id) {
  const userId = await currentUserId();
  const rows = await db.select().from(achievements)
    .where(and(eq(achievements.id, id), eq(achievements.userId, userId))).limit(1);
  return rows[0] || null;
}

export async function createAchievement(input) {
  const db = await getDb();
  const userId = await currentUserId();
  const now = new Date();
  const row = {
    id: newId(), userId,
    title: (input.title || "").trim(),
    context: (input.context || "").trim(),
    action: (input.action || "").trim(),
    result: (input.result || "").trim(),
    metric: (input.metric || "").trim(),
    company: (input.company || "").trim(),
    project: (input.project || "").trim(),
    date: (input.date || "").trim(),
    skills: asArray(input.skills),
    tags: asArray(input.tags),
    evidence: (input.evidence || "").trim(),
    resumeBullet: (input.resumeBullet || "").trim(),
    createdAt: now, updatedAt: now,
  };
  await db.insert(achievements).values(row);
  return toAchievement(row);
}

export async function updateAchievement(id, patch) {
  const db = await getDb();
  const existing = await getOne(db, id);
  if (!existing) return null;

  const text = ["title", "context", "action", "result", "metric", "company", "project", "date", "evidence", "resumeBullet"];
  const set = { updatedAt: new Date() };
  for (const k of text) if (k in patch && patch[k] !== undefined) set[k] = (patch[k] || "").trim();
  if ("skills" in patch) set.skills = asArray(patch.skills);
  if ("tags" in patch) set.tags = asArray(patch.tags);

  await db.update(achievements).set(set).where(eq(achievements.id, id));
  const updated = await getOne(db, id);
  return toAchievement(updated);
}

export async function deleteAchievement(id) {
  const db = await getDb();
  const existing = await getOne(db, id);
  if (!existing) return false;
  await db.delete(achievements).where(eq(achievements.id, id));
  return true;
}
