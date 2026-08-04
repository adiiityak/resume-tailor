// Storage driver dispatcher — see lib/applications.js for how the driver is chosen.
import * as fsDriver from "@/lib/store/jobs.fs";
import * as dbDriver from "@/lib/store/jobs.db";

function driver() {
  const explicit = process.env.STORAGE_DRIVER;
  if (explicit === "db") return dbDriver;
  if (explicit === "fs") return fsDriver;
  return process.env.DATABASE_URL ? dbDriver : fsDriver;
}

export { JOB_STATUSES, JOB_PRIORITIES, INTEREST_LEVELS } from "@/lib/jobsShared";
export { createSlug } from "@/lib/store/shared";

export const listJobs = (...a) => driver().listJobs(...a);
export const getJob = (...a) => driver().getJob(...a);
export const findSimilarJobs = (...a) => driver().findSimilarJobs(...a);
export const createJob = (...a) => driver().createJob(...a);
export const updateJob = (...a) => driver().updateJob(...a);
export const deleteJob = (...a) => driver().deleteJob(...a);
export const compareJobs = (...a) => driver().compareJobs(...a);
