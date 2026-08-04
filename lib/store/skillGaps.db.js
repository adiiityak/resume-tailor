import { and, eq, inArray, sql } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { skillGaps } from "@/lib/db/schema";
import { currentUserId } from "@/lib/store/shared";
import {
  assertSafeGapId,
  cloneJson,
  compareSkillGaps,
  derivedImportance,
  learningStatusForEvidence,
  sameJson,
  validateDerivedSkillGaps,
  validateSkillGapPatch,
} from "@/lib/skillGapsShared";

const DERIVED_FIELDS = [
  "skill", "skillSlug", "category", "frequency", "percentage",
  "evidenceLevel", "evidenceExplanation", "relatedJobs",
];

function iso(value) {
  return value instanceof Date ? value.toISOString() : value;
}

function toSkillGap(row) {
  return {
    id: row.id,
    skill: row.skill,
    skillSlug: row.skillSlug,
    category: row.category,
    frequency: row.frequency,
    percentage: row.percentage,
    evidenceLevel: row.evidenceLevel,
    evidenceExplanation: row.evidenceExplanation,
    relatedJobs: cloneJson(row.relatedJobs),
    importance: row.importance,
    importanceSource: row.importanceSource,
    learningStatus: row.learningStatus,
    notes: row.notes,
    portfolioOpportunity: row.portfolioOpportunity,
    createdAt: iso(row.createdAt),
    updatedAt: iso(row.updatedAt),
  };
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
  return { next, changed };
}

function dbValues(userId, record) {
  return {
    userId,
    id: record.id,
    skill: record.skill,
    skillSlug: record.skillSlug,
    category: record.category,
    frequency: record.frequency,
    percentage: record.percentage,
    evidenceLevel: record.evidenceLevel,
    evidenceExplanation: record.evidenceExplanation,
    relatedJobs: cloneJson(record.relatedJobs),
    importance: record.importance,
    importanceSource: record.importanceSource,
    learningStatus: record.learningStatus,
    notes: record.notes,
    portfolioOpportunity: record.portfolioOpportunity,
    createdAt: new Date(record.createdAt),
    updatedAt: new Date(record.updatedAt),
  };
}

async function selectOne(db, userId, id) {
  const rows = await db.select().from(skillGaps)
    .where(and(eq(skillGaps.userId, userId), eq(skillGaps.id, id)))
    .limit(1);
  return rows[0] ? toSkillGap(rows[0]) : null;
}

export async function syncSkillGaps(input) {
  const derivedGaps = validateDerivedSkillGaps(input);
  if (derivedGaps.length === 0) return [];
  const db = await getDb();
  const userId = await currentUserId();

  return db.transaction(async (tx) => {
    const existingRows = await tx.select().from(skillGaps)
      .where(and(eq(skillGaps.userId, userId), inArray(skillGaps.id, derivedGaps.map((gap) => gap.id))));
    const existingById = new Map(existingRows.map((row) => [row.id, toSkillGap(row)]));
    const now = new Date().toISOString();
    for (const gap of derivedGaps) {
      const existing = existingById.get(gap.id);
      const merged = mergeDerived(existing, gap, now);
      const next = existing ? merged.next : merged;
      const changed = existing ? merged.changed : true;
      if (changed) {
        const values = dbValues(userId, next);
        const set = {
          skill: values.skill,
          skillSlug: values.skillSlug,
          category: values.category,
          frequency: values.frequency,
          percentage: values.percentage,
          evidenceLevel: values.evidenceLevel,
          evidenceExplanation: values.evidenceExplanation,
          relatedJobs: values.relatedJobs,
          importance: sql`case when ${skillGaps.importanceSource} = 'derived' then ${derivedImportance(gap)} else ${skillGaps.importance} end`,
          updatedAt: values.updatedAt,
        };
        if (gap.evidenceLevel !== "Strong") {
          set.learningStatus = sql`case when ${skillGaps.learningStatus} = 'Verified in Resume' then 'Not Started' else ${skillGaps.learningStatus} end`;
        }
        await tx.insert(skillGaps).values(values).onConflictDoUpdate({
          target: [skillGaps.userId, skillGaps.id],
          set,
        });
      }
    }
    const persistedRows = await tx.select().from(skillGaps)
      .where(and(eq(skillGaps.userId, userId), inArray(skillGaps.id, derivedGaps.map((gap) => gap.id))));
    const persistedById = new Map(persistedRows.map((row) => [row.id, toSkillGap(row)]));
    return cloneJson(derivedGaps.map((gap) => persistedById.get(gap.id)));
  });
}

export async function listSkillGaps() {
  const db = await getDb();
  const userId = await currentUserId();
  const rows = await db.select().from(skillGaps).where(eq(skillGaps.userId, userId));
  return { skillGaps: rows.map(toSkillGap).sort(compareSkillGaps), corrupted: 0 };
}

export async function updateSkillGap(id, patch) {
  assertSafeGapId(id);
  const db = await getDb();
  const userId = await currentUserId();
  const existing = await selectOne(db, userId, id);
  const normalized = validateSkillGapPatch(existing, patch);
  if (!existing) return null;

  const next = { ...existing, ...normalized };
  if ("importance" in normalized) next.importanceSource = "user";
  const changed = Object.keys(normalized).some((field) => existing[field] !== next[field]) ||
    existing.importanceSource !== next.importanceSource;
  if (!changed) return cloneJson(existing);

  const updatedAt = new Date();
  const set = { ...normalized, updatedAt };
  if ("importance" in normalized) set.importanceSource = "user";
  const conditions = [eq(skillGaps.userId, userId), eq(skillGaps.id, id)];
  const verifiesResume = normalized.learningStatus === "Verified in Resume";
  if (verifiesResume) conditions.push(eq(skillGaps.evidenceLevel, "Strong"));
  const rows = await db.update(skillGaps).set(set)
    .where(and(...conditions))
    .returning();
  if (rows[0]) return toSkillGap(rows[0]);

  const current = await selectOne(db, userId, id);
  if (verifiesResume && current && current.evidenceLevel !== "Strong") {
    throw Object.assign(new Error("Verified in Resume requires Strong evidence."), { status: 400 });
  }
  return current;
}
