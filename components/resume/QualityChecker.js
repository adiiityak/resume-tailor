"use client";

import { useState } from "react";
import MetricPrompt from "@/components/resume/MetricPrompt";

const SEVERITY = {
  Critical: { order: 0, cls: "border-red-200 bg-red-50", badge: "bg-red-100 text-red-700" },
  Important: { order: 1, cls: "border-amber-200 bg-amber-50", badge: "bg-amber-100 text-amber-700" },
  Suggestion: { order: 2, cls: "border-slate-200 bg-white", badge: "bg-slate-100 text-slate-600" },
};

function Warning({ w, onApplyMetric }) {
  const [resolved, setResolved] = useState(false);
  const [showPrompt, setShowPrompt] = useState(false);
  const sev = SEVERITY[w.severity] || SEVERITY.Suggestion;
  const isMetric = w.problem === "Bullet has no measurable outcome";

  return (
    <li className={`rounded-lg border p-3 ${sev.cls} ${resolved ? "opacity-50" : ""}`}>
      <div className="flex flex-wrap items-center gap-2">
        <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${sev.badge}`}>{w.severity}</span>
        <span className="text-sm font-medium text-slate-800">{w.problem}</span>
        {w.section && <span className="text-[11px] text-slate-400">{w.section}</span>}
      </div>
      <p className="mt-1 text-xs text-slate-500">{w.why}</p>
      {w.line && <p className="mt-1 rounded bg-white/70 px-2 py-1 text-xs italic text-slate-600">“{w.line}”</p>}
      <p className="mt-1 text-xs text-slate-600"><span className="font-medium">Suggested:</span> {w.suggestion}</p>

      <div className="mt-2 flex flex-wrap gap-2">
        {isMetric && onApplyMetric && !resolved && (
          <button onClick={() => setShowPrompt((s) => !s)} className="rounded-md border border-slate-300 bg-white px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50">
            Add a real metric
          </button>
        )}
        {!resolved && (
          <button onClick={() => setResolved(true)} className="rounded-md border border-slate-300 bg-white px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50">
            Mark resolved
          </button>
        )}
      </div>

      {showPrompt && !resolved && (
        <MetricPrompt
          bullet={w.line}
          onApply={(orig, revised) => { onApplyMetric?.(orig, revised); setShowPrompt(false); setResolved(true); }}
          onCancel={() => setShowPrompt(false)}
        />
      )}
    </li>
  );
}

export default function QualityChecker({ report, onApplyMetric }) {
  if (!report || !report.warnings) {
    return <p className="text-sm text-slate-500">No quality report was saved for this application.</p>;
  }
  const { warnings, counts } = report;
  const sorted = [...warnings].sort((a, b) => (SEVERITY[a.severity]?.order ?? 3) - (SEVERITY[b.severity]?.order ?? 3));

  return (
    <div>
      <div className="mb-4 flex flex-wrap gap-2 text-sm">
        <span className="rounded-full bg-red-50 px-2.5 py-0.5 text-xs font-medium text-red-700">{counts.critical} critical</span>
        <span className="rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-medium text-amber-700">{counts.important} important</span>
        <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-600">{counts.suggestion} suggestions</span>
      </div>
      {sorted.length === 0 ? (
        <p className="text-sm text-emerald-700">No issues found — nice work.</p>
      ) : (
        <ul className="space-y-2">
          {sorted.map((w) => <Warning key={w.id} w={w} onApplyMetric={onApplyMetric} />)}
        </ul>
      )}
    </div>
  );
}
