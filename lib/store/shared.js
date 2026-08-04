// Shared by both storage drivers.

export const STATUSES = [
  "Saved",
  "Tailoring",
  "Ready to Apply",
  "Applied",
  "Assessment",
  "Recruiter Screen",
  "Interviewing",
  "Offer",
  "Rejected",
  "Withdrawn",
  "Archived",
];

export function createSlug(value) {
  return (value || "")
    .toLowerCase()
    .trim()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

// Owner of the rows being read/written.
//
// The storage layer deliberately does not import the auth module — the auth layer
// registers a resolver instead, so storage stays usable (and testable) without any
// auth configured. Falls back to a single local user.
let userIdResolver = null;

export function setUserIdResolver(fn) {
  userIdResolver = fn;
}

export function usesDatabaseStorage() {
  if (process.env.STORAGE_DRIVER === "db") return true;
  if (process.env.STORAGE_DRIVER === "fs") return false;
  return Boolean(process.env.DATABASE_URL);
}

function authenticationRequired(cause) {
  return Object.assign(new Error("Authentication is required."), {
    status: 401,
    ...(cause ? { cause } : {}),
  });
}

export async function currentUserId() {
  if (process.env.RESUME_TAILOR_USER_ID) return process.env.RESUME_TAILOR_USER_ID;
  if (userIdResolver) {
    try {
      const id = await userIdResolver();
      if (id) return id;
      if (usesDatabaseStorage()) throw authenticationRequired();
    } catch (error) {
      if (usesDatabaseStorage()) {
        if (error?.status === 401) throw error;
        throw authenticationRequired(error);
      }
    }
  }

  // Filesystem mode is deliberately single-user and offline. Database mode is
  // multi-user, so silently sharing a fallback owner would expose private data.
  if (usesDatabaseStorage()) throw authenticationRequired();
  return "local";
}
