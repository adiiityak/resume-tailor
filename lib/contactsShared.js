// Client-safe constants for contacts (no fs imports).

export const CONTACT_RELATIONSHIPS = [
  "Recruiter",
  "Hiring Manager",
  "Employee",
  "Referral",
  "Interviewer",
  "Agency Recruiter",
  "Other",
];

export const RELATIONSHIP_STYLES = {
  Recruiter: "bg-blue-50 text-blue-700",
  "Hiring Manager": "bg-violet-50 text-violet-700",
  Employee: "bg-slate-100 text-slate-600",
  Referral: "bg-emerald-50 text-emerald-700",
  Interviewer: "bg-teal-50 text-teal-700",
  "Agency Recruiter": "bg-amber-50 text-amber-700",
  Other: "bg-slate-100 text-slate-500",
};
