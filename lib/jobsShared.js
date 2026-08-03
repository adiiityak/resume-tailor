// Client-safe constants & helpers for the Job Library (no fs imports).

export const JOB_STATUSES = ["Saved", "Researching", "Apply Soon", "Applied", "Skipped", "Expired"];
export const JOB_PRIORITIES = ["High", "Medium", "Low"];
export const INTEREST_LEVELS = ["High", "Medium", "Low"];

export const JOB_STATUS_STYLES = {
  Saved: "bg-slate-100 text-slate-600 border-slate-200",
  Researching: "bg-sky-50 text-sky-700 border-sky-200",
  "Apply Soon": "bg-violet-50 text-violet-700 border-violet-200",
  Applied: "bg-blue-50 text-blue-700 border-blue-200",
  Skipped: "bg-slate-100 text-slate-400 border-slate-200",
  Expired: "bg-red-50 text-red-600 border-red-200",
};

export const PRIORITY_STYLES = {
  High: "bg-red-50 text-red-600 border-red-200",
  Medium: "bg-amber-50 text-amber-600 border-amber-200",
  Low: "bg-slate-100 text-slate-500 border-slate-200",
};

export const JOB_SORTS = [
  { value: "newest", label: "Newest saved" },
  { value: "oldest", label: "Oldest saved" },
  { value: "closing", label: "Closing soonest" },
  { value: "priority", label: "Priority" },
  { value: "company", label: "Company A–Z" },
];

const PRIORITY_RANK = { High: 0, Medium: 1, Low: 2 };

export function sortJobs(jobs, sort) {
  const copy = [...jobs];
  switch (sort) {
    case "oldest":
      return copy.sort((a, b) => (a.dateSaved || "").localeCompare(b.dateSaved || ""));
    case "closing":
      return copy.sort((a, b) => (a.closingDate || "9999").localeCompare(b.closingDate || "9999"));
    case "priority":
      return copy.sort((a, b) => (PRIORITY_RANK[a.priority] ?? 1) - (PRIORITY_RANK[b.priority] ?? 1));
    case "company":
      return copy.sort((a, b) => (a.company || "").localeCompare(b.company || ""));
    case "newest":
    default:
      return copy.sort((a, b) => (b.dateSaved || "").localeCompare(a.dateSaved || ""));
  }
}

export function jobMatchesQuery(job, q) {
  if (!q) return true;
  const s = q.toLowerCase();
  return [job.company, job.role, job.location, job.status, job.notes].filter(Boolean).some((v) => v.toLowerCase().includes(s));
}
