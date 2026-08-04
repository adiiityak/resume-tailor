import { promises as fs } from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import {
  assertSafeGapId,
  cloneJson,
  compareSkillGaps,
  derivedImportance,
  isPersistedSkillGap,
  learningStatusForEvidence,
  sameJson,
  validateDerivedSkillGaps,
  validateSkillGapPatch,
} from "@/lib/skillGapsShared";

const DERIVED_FIELDS = [
  "skill", "skillSlug", "category", "frequency", "percentage",
  "evidenceLevel", "evidenceExplanation", "relatedJobs",
];

let writeQueue = Promise.resolve();

function dataFile() {
  const root = process.env.RESUME_TAILOR_DATA_ROOT || process.cwd();
  return path.join(root, "data", "skill-gaps", "skill-gaps.json");
}

function serializeWrite(operation) {
  const result = writeQueue.then(operation, operation);
  writeQueue = result.then(() => undefined, () => undefined);
  return result;
}

async function readState() {
  let text;
  try {
    text = await fs.readFile(dataFile(), "utf8");
  } catch (error) {
    if (error?.code === "ENOENT") return { rows: [], corrupted: 0 };
    throw error;
  }

  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch {
    return { rows: [], corrupted: 1 };
  }
  if (!Array.isArray(parsed)) return { rows: [], corrupted: 1 };

  const rows = [];
  let corrupted = 0;
  const ids = new Set();
  for (const record of parsed) {
    if (!isPersistedSkillGap(record) || ids.has(record.id)) {
      corrupted += 1;
      continue;
    }
    ids.add(record.id);
    rows.push(record);
  }
  return { rows, corrupted };
}

async function atomicWrite(rows) {
  const target = dataFile();
  const directory = path.dirname(target);
  await fs.mkdir(directory, { recursive: true });
  const temporary = path.join(directory, `.${path.basename(target)}.${process.pid}.${randomUUID()}.tmp`);
  try {
    await fs.writeFile(temporary, `${JSON.stringify(rows, null, 2)}\n`, "utf8");
    await fs.rename(temporary, target);
  } catch (error) {
    await fs.rm(temporary, { force: true }).catch(() => {});
    throw error;
  }
}

function mergeDerived(existing, gap, now) {
  if (!existing) {
    return {
      ...gap,
      importance: derivedImportance(gap),
      importanceSource: "derived",
      learningStatus: "Not Started",
      notes: "",
      portfolioOpportunity: "",
      createdAt: now,
      updatedAt: now,
    };
  }

  const next = { ...existing };
  let changed = false;
  for (const field of DERIVED_FIELDS) {
    const differs = field === "relatedJobs"
      ? !sameJson(existing[field], gap[field])
      : existing[field] !== gap[field];
    if (differs) {
      next[field] = cloneJson(gap[field]);
      changed = true;
    }
  }
  const learningStatus = learningStatusForEvidence(existing.learningStatus, gap.evidenceLevel);
  if (learningStatus !== existing.learningStatus) {
    next.learningStatus = learningStatus;
    changed = true;
  }
  if (existing.importanceSource === "derived") {
    const importance = derivedImportance(gap);
    if (importance !== existing.importance) {
      next.importance = importance;
      changed = true;
    }
  }
  if (changed) next.updatedAt = now;
  return next;
}

export async function syncSkillGaps(input) {
  const derivedGaps = validateDerivedSkillGaps(input);
  return serializeWrite(async () => {
    const state = await readState();
    const byId = new Map(state.rows.map((row) => [row.id, row]));
    const now = new Date().toISOString();
    const active = derivedGaps.map((gap) => mergeDerived(byId.get(gap.id), gap, now));
    for (const row of active) byId.set(row.id, row);
    const rows = [...byId.values()];
    const changed = state.corrupted > 0 ||
      rows.length !== state.rows.length ||
      rows.some((row, index) => !sameJson(row, state.rows[index]));
    if (changed) await atomicWrite(rows);
    return cloneJson(active);
  });
}

export async function listSkillGaps() {
  const { rows, corrupted } = await readState();
  return { skillGaps: cloneJson(rows).sort(compareSkillGaps), corrupted };
}

export async function updateSkillGap(id, patch) {
  assertSafeGapId(id);
  return serializeWrite(async () => {
    const state = await readState();
    const index = state.rows.findIndex((row) => row.id === id);
    const existing = index >= 0 ? state.rows[index] : null;
    const normalized = validateSkillGapPatch(existing, patch);
    if (!existing) return null;

    const next = { ...existing, ...normalized };
    if ("importance" in normalized) next.importanceSource = "user";
    const changed = Object.keys(normalized).some((field) => existing[field] !== next[field]) ||
      existing.importanceSource !== next.importanceSource;
    if (!changed) return cloneJson(existing);

    next.updatedAt = new Date().toISOString();
    const rows = [...state.rows];
    rows[index] = next;
    await atomicWrite(rows);
    return cloneJson(next);
  });
}
