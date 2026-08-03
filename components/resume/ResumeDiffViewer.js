"use client";

import { useState } from "react";

const TYPE_META = {
  unchanged: { label: "Unchanged", cls: "border-slate-200 bg-slate-50", dot: "bg-slate-400" },
  reordered: { label: "Reordered", cls: "border-amber-200 bg-amber-50", dot: "bg-amber-400" },
  rephrased: { label: "Rephrased", cls: "border-blue-200 bg-blue-50", dot: "bg-blue-400" },
  shortened: { label: "Shortened", cls: "border-indigo-200 bg-indigo-50", dot: "bg-indigo-400" },
  expanded: { label: "Expanded from evidence", cls: "border-emerald-200 bg-emerald-50", dot: "bg-emerald-500" },
  removed: { label: "Removed", cls: "border-red-200 bg-white", dot: "bg-red-400" },
  added: { label: "Unsupported — verify or remove", cls: "border-red-300 bg-red-50", dot: "bg-red-500" },
};

function Change({ change, evidenceMap }) {
  const [open, setOpen] = useState(false);
  const meta = TYPE_META[change.changeType] || TYPE_META.unchanged;
  const isRemoved = change.changeType === "removed";
  const unsupported = !change.supported;

  return (
    <li className={`rounded-lg border p-3 ${meta.cls} ${isRemoved ? "border-dashed" : ""}`}>
      <div className="mb-1.5 flex flex-wrap items-center gap-2">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-white/70 px-2 py-0.5 text-[11px] font-medium text-slate-700">
          <span className={`h-1.5 w-1.5 rounded-full ${meta.dot}`} aria-hidden="true" />
          {meta.label}
        </span>
        {change.section && <span className="text-[11px] text-slate-500">{change.section}</span>}
      </div>

      <p className={`text-sm ${isRemoved ? "text-slate-500 line-through" : "text-slate-800"}`}>
        {change.tailoredText || change.originalText}
      </p>

      {change.originalText && change.tailoredText && change.originalText !== change.tailoredText && !isRemoved && (
        <p className="mt-1 text-xs text-slate-400">was: {change.originalText}</p>
      )}

      <p className="mt-1.5 text-xs text-slate-500">{change.reason}</p>

      {!isRemoved && (
        <button
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          className="mt-2 text-xs font-medium text-slate-700 underline hover:text-slate-900"
        >
          {open ? "Hide evidence" : "View evidence"}
        </button>
      )}

      {open && (
        <div className="mt-2 rounded-md border border-slate-200 bg-white p-3">
          {unsupported ? (
            <p className="text-xs text-red-600">
              No supporting evidence was found in your original resume for this statement. Confirm it is
              genuinely true or remove it — this tool will not vouch for it.
            </p>
          ) : (
            <>
              <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-slate-500">Supported by</p>
              <ul className="space-y-1.5">
                {change.evidenceIds.length === 0 && <li className="text-xs text-slate-400">—</li>}
                {change.evidenceIds.map((eid) => {
                  const ev = evidenceMap[eid];
                  if (!ev) return null;
                  return (
                    <li key={eid} className="text-xs text-slate-600">
                      <span className="mr-1.5 rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-500">
                        {ev.type === "skill" ? "Skill" : ev.section || "Resume"}
                      </span>
                      {ev.text}
                    </li>
                  );
                })}
              </ul>
            </>
          )}
        </div>
      )}
    </li>
  );
}

export default function ResumeDiffViewer({ diff }) {
  if (!diff || !diff.changes) {
    return <p className="text-sm text-slate-500">No comparison data was saved for this application.</p>;
  }
  const evidenceMap = Object.fromEntries((diff.evidence || []).map((e) => [e.id, e]));
  const s = diff.summary || {};
  const parts = [
    s.reordered && `${s.reordered} reordered`,
    s.rephrased && `${s.rephrased} rephrased`,
    s.shortened && `${s.shortened} shortened`,
    s.expanded && `${s.expanded} expanded`,
    s.removed && `${s.removed} removed`,
    s.unchanged && `${s.unchanged} unchanged`,
  ].filter(Boolean);

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-2 rounded-lg border border-slate-200 bg-white p-3 text-sm text-slate-700 shadow-sm">
        {parts.length > 0 ? parts.map((p, i) => (
          <span key={i} className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium">{p}</span>
        )) : <span className="text-xs text-slate-400">No changes</span>}
        <span className={`ml-auto rounded-full px-2.5 py-0.5 text-xs font-semibold ${s.unsupported ? "bg-red-50 text-red-700" : "bg-emerald-50 text-emerald-700"}`}>
          {s.unsupported || 0} unsupported claims added
        </span>
      </div>

      <ul className="space-y-2">
        {diff.changes.map((c) => <Change key={c.id} change={c} evidenceMap={evidenceMap} />)}
      </ul>
    </div>
  );
}
