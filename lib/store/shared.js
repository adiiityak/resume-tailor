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

// Owner of the rows being read/written. Replaced by the real session user in the
// auth phase; until then everything belongs to a single local user.
export async function currentUserId() {
  if (process.env.RESUME_TAILOR_USER_ID) return process.env.RESUME_TAILOR_USER_ID;
  try {
    const { auth } = await import("@/auth");
    const session = await auth();
    if (session?.user?.id) return session.user.id;
  } catch {
    // auth not configured yet — fall through to the local single-user id
  }
  return "local";
}
