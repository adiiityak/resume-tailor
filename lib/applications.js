// Storage driver dispatcher.
//
// Every API route imports from here, so swapping the backend requires no changes
// above this file. The driver is chosen by environment:
//   - DATABASE_URL set (or STORAGE_DRIVER=db)  -> Postgres/Supabase
//   - otherwise                                -> local filesystem (private, works offline)
//
// Both implementations expose identical signatures and return shapes.
import * as fsDriver from "@/lib/store/applications.fs";
import * as dbDriver from "@/lib/store/applications.db";

export { STATUSES, createSlug } from "@/lib/store/shared";

function driver() {
  const explicit = process.env.STORAGE_DRIVER;
  if (explicit === "db") return dbDriver;
  if (explicit === "fs") return fsDriver;
  return process.env.DATABASE_URL ? dbDriver : fsDriver;
}

export const listApplications = (...a) => driver().listApplications(...a);
export const getCompany = (...a) => driver().getCompany(...a);
export const createApplication = (...a) => driver().createApplication(...a);
export const getApplication = (...a) => driver().getApplication(...a);
export const updateApplication = (...a) => driver().updateApplication(...a);
export const changeStatus = (...a) => driver().changeStatus(...a);
export const getActivity = (...a) => driver().getActivity(...a);
export const deleteApplication = (...a) => driver().deleteApplication(...a);
export const duplicateApplication = (...a) => driver().duplicateApplication(...a);
export const setNextFollowUp = (...a) => driver().setNextFollowUp(...a);
export const getInterview = (...a) => driver().getInterview(...a);
export const saveInterview = (...a) => driver().saveInterview(...a);
export const listMessages = (...a) => driver().listMessages(...a);
export const saveMessage = (...a) => driver().saveMessage(...a);
export const deleteMessage = (...a) => driver().deleteMessage(...a);
export const saveApplicationFile = (...a) => driver().saveApplicationFile(...a);
export const readApplicationFile = (...a) => driver().readApplicationFile(...a);
export const generateResumeDocx = (...a) => driver().generateResumeDocx(...a);
export const generateCoverLetterDocx = (...a) => driver().generateCoverLetterDocx(...a);
