import { matchScoreColor } from "@/lib/dashboardShared";

function Chips({ items, tone }) {
  if (!items || items.length === 0) return <p className="text-sm text-slate-400">None.</p>;
  const cls = tone === "green" ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700";
  return (
    <div className="flex flex-wrap gap-1.5">
      {items.map((k) => (
        <span key={k} className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${cls}`}>{k}</span>
      ))}
    </div>
  );
}

export default function MatchReport({ report }) {
  if (!report) {
    return <p className="text-sm text-slate-500">No match report was saved for this application.</p>;
  }
  const { matchScore, matchedKeywords = [], missingKeywords = [], notes } = report;

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Overall Match Score</p>
        <p className={`mt-1 text-4xl font-semibold ${matchScoreColor(matchScore)}`}>
          {typeof matchScore === "number" ? `${matchScore}` : "—"}
          <span className="text-lg font-normal text-slate-400">/100</span>
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <h3 className="mb-2 text-sm font-medium text-slate-700">Matched Keywords</h3>
          <Chips items={matchedKeywords} tone="green" />
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <h3 className="mb-2 text-sm font-medium text-slate-700">Missing Keywords</h3>
          <Chips items={missingKeywords} tone="amber" />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <h3 className="mb-2 text-sm font-medium text-slate-700">Resume Strengths</h3>
          <p className="mb-2 text-xs text-slate-500">Evidence already present in your resume.</p>
          <Chips items={matchedKeywords} tone="green" />
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <h3 className="mb-2 text-sm font-medium text-slate-700">Honest Gaps</h3>
          <p className="mb-2 text-xs text-slate-500">Requirements with no evidence in your resume yet.</p>
          <Chips items={missingKeywords} tone="amber" />
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <h3 className="mb-2 text-sm font-medium text-slate-700">Recommendations</h3>
        <p className="text-sm text-slate-600">{notes || "No additional notes."}</p>
        <p className="mt-3 rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-500">
          Only add missing items if they are genuinely true of your experience. This tool never
          fabricates skills, achievements, or history.
        </p>
      </div>
    </div>
  );
}
