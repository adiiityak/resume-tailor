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

export async function currentUserId() {
  if (process.env.RESUME_TAILOR_USER_ID) return process.env.RESUME_TAILOR_USER_ID;
  if (userIdResolver) {
    try {
      const id = await userIdResolver();
      if (id) return id;
    } catch {
      // fall through to the local id
    }
  }
  return "local";
}
