"use client";

import Link from "next/link";
import { formatDateShort } from "@/lib/dashboardShared";

export default function DuplicateJobDialog({ open, similar, onKeepBoth, onDismiss, busy }) {
  if (!open || !similar || similar.length === 0) return null;
  const top = similar[0];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/40" onClick={() => !busy && onDismiss?.()} aria-hidden="true" />
      <div role="alertdialog" aria-modal="true" aria-labelledby="dup-title" className="relative z-10 w-full max-w-md rounded-xl border border-slate-200 bg-white p-6 shadow-xl">
        <h2 id="dup-title" className="text-lg font-semibold text-slate-900">Possible duplicate job</h2>
        <p className="mt-2 text-sm text-slate-600">
          A similar {top.role || "role"}{top.company ? ` at ${top.company}` : ""} was saved on {formatDateShort(top.dateSaved)}.
        </p>
        <div className="mt-3 space-y-1.5">
          {similar.slice(0, 3).map((s) => (
            <div key={s.id} className="flex items-center justify-between rounded-lg border border-slate-200 px-3 py-2 text-sm">
              <span className="text-slate-700">{s.role} — {s.company}</span>
              <span className="flex items-center gap-2">
                <span className="rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700">{s.similarity}%</span>
                <Link href={`/jobs/${encodeURIComponent(s.id)}`} className="text-xs font-medium text-slate-700 underline">Open</Link>
              </span>
            </div>
          ))}
        </div>
        <p className="mt-3 text-xs text-slate-500">The new job has already been saved. You can keep both, or open the existing one and delete this one.</p>
        <div className="mt-5 flex justify-end gap-2">
          <button onClick={onDismiss} disabled={busy} className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50 disabled:opacity-50">
            Keep both
          </button>
        </div>
      </div>
    </div>
  );
}
