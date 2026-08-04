import * as fsDriver from "@/lib/store/skillGaps.fs";
import * as dbDriver from "@/lib/store/skillGaps.db";

function driver() {
  const explicit = process.env.STORAGE_DRIVER;
  if (explicit === "db") return dbDriver;
  if (explicit === "fs") return fsDriver;
  return process.env.DATABASE_URL ? dbDriver : fsDriver;
}

export {
  EVIDENCE_LEVELS,
  GAP_CATEGORIES,
  IMPORTANCE_LEVELS,
  LEARNING_STATUSES,
  SAFE_GAP_ID,
  validateSkillGapPatch,
} from "@/lib/skillGapsShared";

export const syncSkillGaps = (...args) => driver().syncSkillGaps(...args);
export const listSkillGaps = (...args) => driver().listSkillGaps(...args);
export const updateSkillGap = (...args) => driver().updateSkillGap(...args);
