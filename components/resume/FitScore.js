import ScoreRing from "@/components/shared/ScoreRing";

const LABEL_STYLES = {
  "Strong Fit": "bg-emerald-50 text-emerald-700 border-emerald-200",
  "Good Fit": "bg-blue-50 text-blue-700 border-blue-200",
  "Stretch Role": "bg-amber-50 text-amber-700 border-amber-200",
  "Low-Evidence Match": "bg-slate-100 text-slate-600 border-slate-200",
};

const BREAKDOWN_LABELS = {
  keywordMatch: "Keyword match",
  experienceRelevance: "Experience relevance",
  skillsCoverage: "Skills coverage",
  seniorityAlignment: "Seniority alignment",
  domainAlignment: "Domain alignment",
  toolAlignment: "Tool alignment",
};

function Bar({ label, value }) {
  return (
    <div>
      <div className="mb-1 flex justify-between text-xs">
        <span className="text-slate-600">{label}</span>
        <span className="font-medium text-slate-800">{value}%</span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
        <div className="h-full rounded-full bg-slate-700" style={{ width: `${value}%` }} />
      </div>
    </div>
  );
}

function Chips({ items, tone }) {
  if (!items || items.length === 0) return <p className="text-xs text-slate-400">None.</p>;
  const cls = tone === "strong" ? "bg-emerald-50 text-emerald-700" : tone === "partial" ? "bg-blue-50 text-blue-700" : "bg-amber-50 text-amber-700";
  return (
    <div className="flex flex-wrap gap-1.5">
      {items.map((k) => <span key={k} className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${cls}`}>{k}</span>)}
    </div>
  );
}

export default function FitScore({ fit, actions }) {
  if (!fit) return null;
  const labelStyle = LABEL_STYLES[fit.label] || LABEL_STYLES["Low-Evidence Match"];

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-center gap-4">
        <ScoreRing score={fit.overall} label="Fit" />
        <div className="min-w-0 flex-1">
          <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${labelStyle}`}>{fit.label}</span>
          <p className="mt-2 text-sm text-slate-600">{fit.message}</p>
        </div>
      </div>

      <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
        {Object.entries(BREAKDOWN_LABELS).map(([key, label]) => (
          <Bar key={key} label={label} value={fit.breakdown?.[key] ?? 0} />
        ))}
      </div>

      <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div>
          <h4 className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-emerald-700">Strong match</h4>
          <Chips items={fit.strong} tone="strong" />
        </div>
        <div>
          <h4 className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-blue-700">Partial match</h4>
          <Chips items={fit.partial} tone="partial" />
        </div>
        <div>
          <h4 className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-amber-700">Missing evidence</h4>
          <Chips items={fit.missing} tone="missing" />
        </div>
      </div>

      {fit.seniorityNote && <p className="mt-4 text-xs text-slate-500">Seniority: {fit.seniorityNote}</p>}

      {actions && <div className="mt-5 flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}
