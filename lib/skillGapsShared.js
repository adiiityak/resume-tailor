// Client-safe constants and validation helpers for the persisted skill-gap roadmap.

export const EVIDENCE_LEVELS = ["Strong", "Partial", "Weak", "None"];
export const GAP_CATEGORIES = ["Skills", "Tools", "Responsibilities", "Seniority", "Soft Skills", "Domain Knowledge"];
export const LEARNING_STATUSES = ["Not Started", "Learning", "Practising", "Used in Project", "Added to Portfolio", "Verified in Resume"];
export const IMPORTANCE_LEVELS = ["High", "Medium", "Low"];
export const SAFE_GAP_ID = /^skill-gap-[a-z0-9]+(?:-[a-z0-9]+)*$/;

const EDITABLE_FIELDS = new Set(["importance", "learningStatus", "notes", "portfolioOpportunity"]);

function badRequest(message) {
  return Object.assign(new Error(message), { status: 400 });
}

export function derivedImportance(gap) {
  if (gap.percentage >= 50 || gap.frequency >= 5) return "High";
  if (gap.percentage >= 25 || gap.frequency >= 2) return "Medium";
  return "Low";
}

export function learningStatusForEvidence(learningStatus, evidenceLevel) {
  return learningStatus === "Verified in Resume" && evidenceLevel !== "Strong"
    ? "Not Started"
    : learningStatus;
}

export function validateSkillGapPatch(existing, patch) {
  if (!patch || typeof patch !== "object" || Array.isArray(patch)) {
    throw badRequest("Skill-gap patch must be an object.");
  }

  const fields = Object.keys(patch);
  if (fields.length === 0) throw badRequest("Skill-gap patch cannot be empty.");
  for (const field of fields) {
    if (!EDITABLE_FIELDS.has(field)) throw badRequest(`Unknown skill-gap field: ${field}.`);
    if (typeof patch[field] !== "string") throw badRequest(`${field} must be a string.`);
  }

  const normalized = { ...patch };
  if ("importance" in normalized && !IMPORTANCE_LEVELS.includes(normalized.importance)) {
    throw badRequest("Invalid importance.");
  }
  if ("learningStatus" in normalized && !LEARNING_STATUSES.includes(normalized.learningStatus)) {
    throw badRequest("Invalid learning status.");
  }
  if (normalized.learningStatus === "Verified in Resume" && existing && existing.evidenceLevel !== "Strong") {
    throw badRequest("Verified in Resume requires Strong evidence.");
  }
  if ("notes" in normalized) {
    normalized.notes = normalized.notes.trim();
    if (normalized.notes.length > 4000) throw badRequest("Notes cannot exceed 4000 characters.");
  }
  if ("portfolioOpportunity" in normalized) {
    normalized.portfolioOpportunity = normalized.portfolioOpportunity.trim();
    if (normalized.portfolioOpportunity.length > 1000) {
      throw badRequest("Portfolio opportunity cannot exceed 1000 characters.");
    }
  }
  return normalized;
}

export function validateDerivedSkillGaps(derivedGaps) {
  if (!Array.isArray(derivedGaps)) throw badRequest("Derived skill gaps must be an array.");
  const ids = new Set();
  return derivedGaps.map((gap) => {
    if (!gap || typeof gap !== "object" || Array.isArray(gap)) throw badRequest("Invalid derived skill gap.");
    if (typeof gap.id !== "string" || !SAFE_GAP_ID.test(gap.id)) throw badRequest("Invalid skill-gap id.");
    if (ids.has(gap.id)) throw badRequest(`Duplicate skill-gap id: ${gap.id}.`);
    ids.add(gap.id);
    if (typeof gap.skill !== "string" || !gap.skill.trim()) throw badRequest("Skill is required.");
    if (typeof gap.skillSlug !== "string" || !gap.skillSlug.trim()) throw badRequest("Skill slug is required.");
    if (!GAP_CATEGORIES.includes(gap.category)) throw badRequest("Invalid skill-gap category.");
    const frequency = gap.frequency ?? gap.count;
    if (!Number.isInteger(frequency) || frequency < 0) throw badRequest("Invalid skill-gap frequency.");
    if (!Number.isInteger(gap.percentage) || gap.percentage < 0 || gap.percentage > 100) {
      throw badRequest("Invalid skill-gap percentage.");
    }
    if (!EVIDENCE_LEVELS.includes(gap.evidenceLevel)) throw badRequest("Invalid evidence level.");
    if (typeof gap.evidenceExplanation !== "string") throw badRequest("Evidence explanation must be a string.");
    if (!Array.isArray(gap.relatedJobs)) throw badRequest("Related jobs must be an array.");

    return {
      id: gap.id,
      skill: gap.skill,
      skillSlug: gap.skillSlug,
      category: gap.category,
      frequency,
      percentage: gap.percentage,
      evidenceLevel: gap.evidenceLevel,
      evidenceExplanation: gap.evidenceExplanation,
      relatedJobs: cloneJson(gap.relatedJobs),
    };
  });
}

export function isPersistedSkillGap(record) {
  return Boolean(
    record &&
    typeof record === "object" &&
    !Array.isArray(record) &&
    typeof record.id === "string" && SAFE_GAP_ID.test(record.id) &&
    typeof record.skill === "string" && record.skill.length > 0 &&
    typeof record.skillSlug === "string" && record.skillSlug.length > 0 &&
    GAP_CATEGORIES.includes(record.category) &&
    Number.isInteger(record.frequency) && record.frequency >= 0 &&
    Number.isInteger(record.percentage) && record.percentage >= 0 && record.percentage <= 100 &&
    EVIDENCE_LEVELS.includes(record.evidenceLevel) &&
    typeof record.evidenceExplanation === "string" &&
    Array.isArray(record.relatedJobs) &&
    IMPORTANCE_LEVELS.includes(record.importance) &&
    ["derived", "user"].includes(record.importanceSource) &&
    LEARNING_STATUSES.includes(record.learningStatus) &&
    learningStatusForEvidence(record.learningStatus, record.evidenceLevel) === record.learningStatus &&
    typeof record.notes === "string" && record.notes.length <= 4000 &&
    typeof record.portfolioOpportunity === "string" && record.portfolioOpportunity.length <= 1000 &&
    typeof record.createdAt === "string" && !Number.isNaN(Date.parse(record.createdAt)) &&
    typeof record.updatedAt === "string" && !Number.isNaN(Date.parse(record.updatedAt))
  );
}

export function compareSkillGaps(left, right) {
  return IMPORTANCE_LEVELS.indexOf(left.importance) - IMPORTANCE_LEVELS.indexOf(right.importance) ||
    right.frequency - left.frequency ||
    left.skill.localeCompare(right.skill);
}

export function cloneJson(value) {
  return JSON.parse(JSON.stringify(value));
}

export function sameJson(left, right) {
  if (Object.is(left, right)) return true;
  if (Array.isArray(left) || Array.isArray(right)) {
    return Array.isArray(left) && Array.isArray(right) &&
      left.length === right.length &&
      left.every((value, index) => sameJson(value, right[index]));
  }
  if (!left || !right || typeof left !== "object" || typeof right !== "object") return false;
  const leftKeys = Object.keys(left);
  const rightKeys = Object.keys(right);
  return leftKeys.length === rightKeys.length &&
    leftKeys.every((key) => Object.hasOwn(right, key) && sameJson(left[key], right[key]));
}

export function assertSafeGapId(id) {
  if (typeof id !== "string" || !SAFE_GAP_ID.test(id)) throw badRequest("Invalid skill-gap id.");
}
