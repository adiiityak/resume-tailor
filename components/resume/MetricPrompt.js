"use client";

import { useState } from "react";

const AREAS = [
  "Number of items (pages, features, projects)",
  "Percentage improvement",
  "Volume (campaigns, users, requests)",
  "Turnaround / time saved",
  "Traffic or engagement",
  "Revenue or leads",
  "People or teams supported",
];

// Never invents numbers — collects real values from the user and composes a
// revised bullet only on explicit confirmation.
export default function MetricPrompt({ bullet, onApply, onCancel }) {
  const [metricType, setMetricType] = useState("");
  const [value, setValue] = useState("");
  const [period, setPeriod] = useState("");
  const [context, setContext] = useState("");

  const base = (bullet || "").replace(/\.\s*$/, "");
  const preview =
    value && metricType
      ? `${base} — ${value} ${metricType}${period ? ` in ${period}` : ""}${context ? `; ${context}` : ""}.`
      : "";

  return (
    <div className="mt-2 rounded-md border border-slate-200 bg-slate-50 p-3">
      <p className="mb-2 text-xs text-slate-500">
        Add a metric only if it is genuinely true. Potential measurable areas:
      </p>
      <ul className="mb-3 flex flex-wrap gap-1.5">
        {AREAS.map((a) => (
          <li key={a} className="rounded-full bg-white px-2 py-0.5 text-[11px] text-slate-500">{a}</li>
        ))}
      </ul>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        <input value={metricType} onChange={(e) => setMetricType(e.target.value)} placeholder="Metric type (e.g. landing pages)" className="rounded-md border border-slate-300 px-2 py-1.5 text-sm" />
        <input value={value} onChange={(e) => setValue(e.target.value)} placeholder="Value (e.g. 24)" className="rounded-md border border-slate-300 px-2 py-1.5 text-sm" />
        <input value={period} onChange={(e) => setPeriod(e.target.value)} placeholder="Time period (optional)" className="rounded-md border border-slate-300 px-2 py-1.5 text-sm" />
        <input value={context} onChange={(e) => setContext(e.target.value)} placeholder="Context (optional)" className="rounded-md border border-slate-300 px-2 py-1.5 text-sm" />
      </div>

      {preview && (
        <div className="mt-2 rounded-md border border-emerald-200 bg-emerald-50 p-2">
          <p className="mb-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-700">Preview · user-confirmed metric</p>
          <p className="text-sm text-slate-800">{preview}</p>
        </div>
      )}

      <div className="mt-2 flex gap-2">
        <button
          onClick={() => preview && onApply?.(bullet, preview)}
          disabled={!preview}
          className="rounded-md bg-slate-900 px-3 py-1.5 text-xs font-medium text-white shadow-sm hover:bg-slate-700 disabled:opacity-40"
        >
          Apply to resume
        </button>
        <button onClick={onCancel} className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50">
          Cancel
        </button>
      </div>
    </div>
  );
}
