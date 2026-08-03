"use client";

import { useEffect, useRef } from "react";

export default function ConfirmDialog({ open, title, message, confirmLabel = "Confirm", danger, busy, onCancel, onConfirm }) {
  const ref = useRef(null);
  useEffect(() => { if (open && ref.current) ref.current.focus(); }, [open]);
  useEffect(() => {
    function onKey(e) { if (e.key === "Escape" && !busy) onCancel?.(); }
    if (open) document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, busy, onCancel]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/40" onClick={() => !busy && onCancel?.()} aria-hidden="true" />
      <div role="alertdialog" aria-modal="true" aria-labelledby="confirm-title" className="relative z-10 w-full max-w-md rounded-xl border border-slate-200 bg-white p-6 shadow-xl">
        <h2 id="confirm-title" className="text-lg font-semibold text-slate-900">{title}</h2>
        {message && <p className="mt-2 text-sm text-slate-600">{message}</p>}
        <div className="mt-6 flex justify-end gap-2">
          <button onClick={onCancel} disabled={busy} className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50 disabled:opacity-50">Cancel</button>
          <button ref={ref} onClick={onConfirm} disabled={busy}
            className={`rounded-lg px-4 py-2 text-sm font-medium text-white shadow-sm disabled:opacity-50 ${danger ? "bg-red-600 hover:bg-red-500" : "bg-slate-900 hover:bg-slate-700"}`}>
            {busy ? "Working…" : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
