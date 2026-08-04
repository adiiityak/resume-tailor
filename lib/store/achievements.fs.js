import { promises as fs } from "fs";
import path from "path";

const DIR = path.join(process.cwd(), "achievements");
const SAFE_ID = /^[a-z0-9][a-z0-9-]*$/i;

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

async function readJsonSafe(p) {
  try { return JSON.parse(await fs.readFile(p, "utf8")); } catch { return null; }
}

async function pathExists(p) {
  try { await fs.access(p); return true; } catch { return false; }
}

function normalize(input, existing = {}) {
  return {
    id: existing.id || input.id || newId(),
    title: (input.title ?? existing.title ?? "").trim(),
    context: (input.context ?? existing.context ?? "").trim(),
    action: (input.action ?? existing.action ?? "").trim(),
    result: (input.result ?? existing.result ?? "").trim(),
    metric: (input.metric ?? existing.metric ?? "").trim(),
    company: (input.company ?? existing.company ?? "").trim(),
    project: (input.project ?? existing.project ?? "").trim(),
    date: (input.date ?? existing.date ?? "").trim(),
    skills: input.skills !== undefined ? asArray(input.skills) : existing.skills || [],
    tags: input.tags !== undefined ? asArray(input.tags) : existing.tags || [],
    evidence: (input.evidence ?? existing.evidence ?? "").trim(),
    resumeBullet: (input.resumeBullet ?? existing.resumeBullet ?? "").trim(),
    createdAt: existing.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

export async function listAchievements() {
  let files = [];
  try {
    files = (await fs.readdir(DIR)).filter((f) => f.endsWith(".json"));
  } catch {
    return { achievements: [] };
  }
  const achievements = [];
  for (const f of files) {
    const a = await readJsonSafe(path.join(DIR, f));
    if (a && a.id) achievements.push(a);
  }
  achievements.sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""));
  return { achievements };
}

export async function createAchievement(input) {
  await fs.mkdir(DIR, { recursive: true });
  const a = normalize(input);
  await fs.writeFile(path.join(DIR, `${a.id}.json`), JSON.stringify(a, null, 2));
  return a;
}

export async function updateAchievement(id, patch) {
  if (!SAFE_ID.test(id)) return null;
  const p = path.join(DIR, `${id}.json`);
  const existing = await readJsonSafe(p);
  if (!existing) return null;
  const next = normalize(patch, existing);
  await fs.writeFile(p, JSON.stringify(next, null, 2));
  return next;
}

export async function deleteAchievement(id) {
  if (!SAFE_ID.test(id)) return false;
  const p = path.join(DIR, `${id}.json`);
  if (!(await pathExists(p))) return false;
  await fs.rm(p, { force: true });
  return true;
}
