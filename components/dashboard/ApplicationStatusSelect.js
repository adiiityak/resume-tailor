"use client";

import { useState } from "react";
import { STATUS_OPTIONS, STATUS_STYLES } from "@/lib/dashboardShared";

export default function ApplicationStatusSelect({ id, status, onChange, disabled }) {
  const [saving, setSaving] = useState(false);
  const [value, setValue] = useState(status || "Tailored");
  const [error, setError] = useState("");

  async function handleChange(e) {
    const next = e.target.value;
    setValue(next);
    setSaving(true);
    setError("");
    try {
      const res = await fetch(`/api/applications/${encodeURIComponent(id)}/status`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: next }),
      });
      if (!res.ok) throw new Error("Unable to update status");
      onChange?.(next);
    } catch (err) {
      setError(err.message);
      setValue(status);
    } finally {
      setSaving(false);
    }
  }

  const style = STATUS_STYLES[value] || STATUS_STYLES.Tailored;

  return (
    <div className="inline-flex flex-col gap-1">
      <label className="sr-only" htmlFor={`status-${id}`}>Application status</label>
      <select
        id={`status-${id}`}
        value={value}
        onChange={handleChange}
        disabled={disabled || saving}
        className={`rounded-full border px-2.5 py-1 text-xs font-medium shadow-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-500 disabled:opacity-60 ${style}`}
      >
        {STATUS_OPTIONS.map((s) => (
          <option key={s} value={s} className="bg-white text-slate-800">{s}</option>
        ))}
      </select>
      {error && <span className="text-xs text-red-600">{error}</span>}
    </div>
  );
}
