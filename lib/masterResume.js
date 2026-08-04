// Storage driver dispatcher — see lib/applications.js for how the driver is chosen.
import * as fsDriver from "@/lib/store/masterResume.fs";
import * as dbDriver from "@/lib/store/masterResume.db";

function driver() {
  const explicit = process.env.STORAGE_DRIVER;
  if (explicit === "db") return dbDriver;
  if (explicit === "fs") return fsDriver;
  return process.env.DATABASE_URL ? dbDriver : fsDriver;
}

export { ENTRY_STATUSES, SECTIONS } from "@/lib/masterResumeShared";

export const getMaster = (...a) => driver().getMaster(...a);
export const patchHeader = (...a) => driver().patchHeader(...a);
export const addEntry = (...a) => driver().addEntry(...a);
export const updateEntry = (...a) => driver().updateEntry(...a);
export const deleteEntry = (...a) => driver().deleteEntry(...a);
export const importFromResume = (...a) => driver().importFromResume(...a);
