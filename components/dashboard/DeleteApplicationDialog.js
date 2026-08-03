"use client";

import { useEffect, useRef } from "react";

export default function DeleteApplicationDialog({ open, application, onCancel, onConfirm, busy }) {
  const confirmRef = useRef(null);

  useEffect(() => {
    if (open && confirmRef.current) confirmRef.current.focus();
  }, [open]);

  useEffect(() => {
    function onKey(e) {
      if (e.key === "Escape" && !busy) onCancel?.();
    }
    if (open) document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, busy, onCancel]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/40" onClick={() => !busy && onCancel?.()} aria-hidden="true" />
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="delete-title"
        aria-describedby="delete-desc"
        className="relative z-10 w-full max-w-md rounded-xl border border-slate-200 bg-white p-6 shadow-xl"
      >
        <h2 id="delete-title" className="text-lg font-semibold text-slate-900">Delete this application?</h2>
        <p id="delete-desc" className="mt-2 text-sm text-slate-600">
          This will permanently remove the saved resume, cover letter, job description, match report,
          and metadata from your local history
          {application ? ` for ${application.company} — ${application.role}.` : "."}
        </p>
        <div className="mt-6 flex justify-end gap-2">
          <button
            onClick={onCancel}
            disabled={busy}
            className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            ref={confirmRef}
            onClick={onConfirm}
            disabled={busy}
            className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-red-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-400 disabled:opacity-50"
          >
            {busy ? "Deleting…" : "Delete Application"}
          </button>
        </div>
      </div>
    </div>
  );
}
