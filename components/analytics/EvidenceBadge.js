const EVIDENCE = {
  Strong: { label: "Strong evidence", className: "border-emerald-200 bg-emerald-50 text-emerald-800" },
  Partial: { label: "Partial evidence", className: "border-sky-200 bg-sky-50 text-sky-800" },
  Weak: { label: "Weak evidence", className: "border-amber-200 bg-amber-50 text-amber-800" },
  None: { label: "No evidence", className: "border-slate-200 bg-slate-50 text-slate-700" },
};

function normalizeLevel(level) {
  const normalized = String(level || "").trim().toLowerCase();
  return ({ strong: "Strong", partial: "Partial", weak: "Weak", none: "None" })[normalized] || "None";
}

export default function EvidenceBadge({ level }) {
  const evidence = EVIDENCE[normalizeLevel(level)];

  return (
    <span aria-label={evidence.label} className={`inline-flex w-fit rounded-full border px-2 py-0.5 text-xs font-medium ${evidence.className}`}>
      {evidence.label}
    </span>
  );
}
