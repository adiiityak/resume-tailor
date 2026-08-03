// Client-safe shared constants & formatters for the dashboard (no fs imports).

export const STATUS_OPTIONS = [
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

export const STATUS_STYLES = {
  Saved: "bg-slate-100 text-slate-600 border-slate-200",
  Tailoring: "bg-sky-50 text-sky-700 border-sky-200",
  Tailored: "bg-slate-100 text-slate-700 border-slate-200",
  "Ready to Apply": "bg-violet-50 text-violet-700 border-violet-200",
  Applied: "bg-blue-50 text-blue-700 border-blue-200",
  Assessment: "bg-amber-50 text-amber-700 border-amber-200",
  "Recruiter Screen": "bg-teal-50 text-teal-700 border-teal-200",
  Interviewing: "bg-purple-50 text-purple-700 border-purple-200",
  Offer: "bg-emerald-50 text-emerald-700 border-emerald-200",
  Rejected: "bg-red-50 text-red-700 border-red-200",
  Withdrawn: "bg-slate-100 text-slate-500 border-slate-200",
  Archived: "bg-slate-100 text-slate-400 border-slate-200",
};

// Columns shown on the Kanban pipeline board (a curated subset of the full status list).
export const KANBAN_COLUMNS = [
  "Saved",
  "Ready to Apply",
  "Applied",
  "Assessment",
  "Interviewing",
  "Offer",
  "Rejected",
];

export const PRIORITY_STYLES = {
  High: "bg-red-50 text-red-600 border-red-200",
  Medium: "bg-amber-50 text-amber-600 border-amber-200",
  Low: "bg-slate-100 text-slate-500 border-slate-200",
};

export const SORT_OPTIONS = [
  { value: "newest", label: "Newest First" },
  { value: "oldest", label: "Oldest First" },
  { value: "matchHigh", label: "Highest Match Score" },
  { value: "matchLow", label: "Lowest Match Score" },
  { value: "companyAsc", label: "Company A–Z" },
];

export function formatDate(iso) {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" });
  } catch {
    return "—";
  }
}

export function formatDateShort(iso) {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
  } catch {
    return "—";
  }
}

export function formatTime(iso) {
  if (!iso) return "";
  try {
    return new Date(iso).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
  } catch {
    return "";
  }
}

export function formatBytes(bytes) {
  if (bytes == null) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function matchScoreColor(score) {
  if (typeof score !== "number") return "text-slate-400";
  if (score >= 80) return "text-emerald-600";
  if (score >= 60) return "text-amber-600";
  return "text-slate-600";
}

export function sortApplications(apps, sort) {
  const copy = [...apps];
  switch (sort) {
    case "oldest":
      return copy.sort((a, b) => (a.createdAt || "").localeCompare(b.createdAt || ""));
    case "matchHigh":
      return copy.sort((a, b) => (b.matchScore ?? -1) - (a.matchScore ?? -1));
    case "matchLow":
      return copy.sort((a, b) => (a.matchScore ?? 101) - (b.matchScore ?? 101));
    case "companyAsc":
      return copy.sort((a, b) => (a.company || "").localeCompare(b.company || ""));
    case "newest":
    default:
      return copy.sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""));
  }
}

export function matchesQuery(app, query) {
  if (!query) return true;
  const q = query.toLowerCase();
  return [app.company, app.role, app.location, app.status]
    .filter(Boolean)
    .some((v) => v.toLowerCase().includes(q));
}
