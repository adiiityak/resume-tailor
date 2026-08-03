// Client-safe constants for the Master Resume (no fs imports).

export const ENTRY_STATUSES = ["Approved", "Needs Review", "Outdated", "Do Not Use"];

export const SECTIONS = ["Experience", "Projects", "Education", "Skills", "Certifications", "Awards", "Other"];

export const ENTRY_STATUS_STYLES = {
  Approved: "bg-emerald-50 text-emerald-700 border-emerald-200",
  "Needs Review": "bg-amber-50 text-amber-700 border-amber-200",
  Outdated: "bg-slate-100 text-slate-500 border-slate-200",
  "Do Not Use": "bg-red-50 text-red-600 border-red-200",
};
