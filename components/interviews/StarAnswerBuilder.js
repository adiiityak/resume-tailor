"use client";

import { CONFIDENCE_LEVELS } from "@/lib/interviewPrep";

const FIELDS = [
  { key: "situation", label: "Situation", hint: "Real context — where and when." },
  { key: "task", label: "Task", hint: "What you needed to accomplish." },
  { key: "action", label: "Action", hint: "What you actually did." },
  { key: "result", label: "Result", hint: "The real outcome (only add a number if you know it)." },
  { key: "learned", label: "What I learned", hint: "Optional reflection." },
];

const CONFIDENCE_STYLES = {
  "Not Practised": "bg-slate-100 text-slate-500",
  "Needs Work": "bg-amber-50 text-amber-700",
  Comfortable: "bg-blue-50 text-blue-700",
  Strong: "bg-emerald-50 text-emerald-700",
};

export default function StarAnswerBuilder({ star = {}, confidence, onStarChange, onConfidenceChange }) {
  return (
    <div className="mt-2 space-y-2 rounded-md border border-slate-200 bg-slate-50 p-3">
      {FIELDS.map((f) => (
        <div key={f.key}>
          <label className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">{f.label}</label>
          <textarea
            value={star[f.key] || ""}
            onChange={(e) => onStarChange(f.key, e.target.value)}
            placeholder={f.hint}
            className="mt-0.5 h-14 w-full resize-y rounded border border-slate-300 bg-white px-2 py-1.5 text-sm text-slate-800 focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
          />
        </div>
      ))}
      <div className="flex items-center gap-2">
        <label className="text-xs text-slate-500">Confidence</label>
        <select
          value={confidence || "Not Practised"}
          onChange={(e) => onConfidenceChange(e.target.value)}
          className={`rounded-full px-2.5 py-1 text-xs font-medium ${CONFIDENCE_STYLES[confidence] || CONFIDENCE_STYLES["Not Practised"]}`}
        >
          {CONFIDENCE_LEVELS.map((c) => <option key={c} value={c} className="bg-white text-slate-800">{c}</option>)}
        </select>
      </div>
    </div>
  );
}
