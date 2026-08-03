"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { REMINDER_TYPES, bucketReminders } from "@/lib/remindersShared";
import { formatDateShort } from "@/lib/dashboardShared";

const input = "w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500";

// Snoozing pushes a reminder forward from today (or from its due date if that is
// still in the future), so snoozing an overdue item actually moves it off Overdue.
function snoozeDate(dateStr, days = 1) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = dateStr ? new Date(dateStr) : today;
  due.setHours(0, 0, 0, 0);
  const base = due > today ? due : today;
  base.setDate(base.getDate() + days);
  return `${base.getFullYear()}-${String(base.getMonth() + 1).padStart(2, "0")}-${String(base.getDate()).padStart(2, "0")}`;
}

function ReminderRow({ r, onComplete, onSnooze, onDelete }) {
  return (
    <li className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-200 bg-white p-2.5 text-sm">
      <div className="min-w-0">
        <p className="font-medium text-slate-800">{r.title}</p>
        <p className="text-xs text-slate-500">
          {r.type}{r.company ? ` · ${r.company}${r.role ? ` (${r.role})` : ""}` : ""}
          {r.dueDate ? ` · due ${formatDateShort(r.dueDate)}${r.dueTime ? ` ${r.dueTime}` : ""}` : ""}
        </p>
      </div>
      <div className="flex items-center gap-1.5">
        <button onClick={() => onComplete(r)} className="rounded-md border border-slate-300 bg-white px-2 py-1 text-xs font-medium text-emerald-700 hover:bg-emerald-50">Done</button>
        <button onClick={() => onSnooze(r)} className="rounded-md border border-slate-300 bg-white px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50">Snooze</button>
        {r.applicationId && <Link href={`/dashboard/application/${encodeURIComponent(r.applicationId)}`} className="rounded-md border border-slate-300 bg-white px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50">Open</Link>}
        <button onClick={() => onDelete(r)} className="rounded-md border border-slate-300 bg-white px-2 py-1 text-xs font-medium text-red-600 hover:bg-red-50" aria-label="Delete reminder">✕</button>
      </div>
    </li>
  );
}

export default function RemindersPanel({ applications = [] }) {
  const [reminders, setReminders] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title: "", type: "Application follow-up", dueDate: "", dueTime: "", applicationId: "", notes: "" });
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/reminders");
      const data = await res.json();
      if (res.ok) setReminders(data.reminders || []);
    } catch { /* non-fatal */ }
  }, []);
  useEffect(() => { load(); }, [load]);

  async function add(e) {
    e.preventDefault();
    setSaving(true);
    try {
      const app = applications.find((a) => a.id === form.applicationId);
      const body = { ...form, company: app?.company || "", role: app?.role || "", applicationId: form.applicationId || null };
      const res = await fetch("/api/reminders", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      if (res.ok) { setForm({ title: "", type: "Application follow-up", dueDate: "", dueTime: "", applicationId: "", notes: "" }); setShowForm(false); await load(); }
    } finally { setSaving(false); }
  }

  async function patch(id, body) {
    await fetch(`/api/reminders/${encodeURIComponent(id)}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    await load();
  }
  async function remove(r) {
    await fetch(`/api/reminders/${encodeURIComponent(r.id)}`, { method: "DELETE" });
    await load();
  }

  const { overdue, dueToday, upcoming } = bucketReminders(reminders);
  const complete = (r) => patch(r.id, { status: "Completed" });
  const snooze = (r) => patch(r.id, { status: "Pending", dueDate: snoozeDate(r.dueDate, 1) });

  const Widget = ({ title, items, tone }) => (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-2 flex items-center justify-between">
        <h3 className="text-sm font-medium text-slate-700">{title}</h3>
        <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${tone}`}>{items.length}</span>
      </div>
      {items.length === 0 ? (
        <p className="text-xs text-slate-400">Nothing here.</p>
      ) : (
        <ul className="space-y-2">{items.map((r) => <ReminderRow key={r.id} r={r} onComplete={complete} onSnooze={snooze} onDelete={remove} />)}</ul>
      )}
    </div>
  );

  return (
    <section>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-slate-900">Follow-ups & reminders</h2>
        <button onClick={() => setShowForm((s) => !s)} className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50">
          {showForm ? "Close" : "+ Add reminder"}
        </button>
      </div>

      {showForm && (
        <form onSubmit={add} className="mb-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
            <input className={input} placeholder="Reminder title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
            <select className={input} value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} aria-label="Reminder type">
              {REMINDER_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
            <select className={input} value={form.applicationId} onChange={(e) => setForm({ ...form, applicationId: e.target.value })} aria-label="Link to application">
              <option value="">No linked application</option>
              {applications.map((a) => <option key={a.id} value={a.id}>{a.company} — {a.role}</option>)}
            </select>
            <input className={input} type="date" aria-label="Due date" value={form.dueDate} onChange={(e) => setForm({ ...form, dueDate: e.target.value })} />
            <input className={input} type="time" aria-label="Due time" value={form.dueTime} onChange={(e) => setForm({ ...form, dueTime: e.target.value })} />
          </div>
          <div className="mt-2 flex gap-2">
            <button type="submit" disabled={saving} className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-slate-700 disabled:opacity-50">{saving ? "Saving…" : "Add reminder"}</button>
            <button type="button" onClick={() => setShowForm(false)} className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50">Cancel</button>
          </div>
        </form>
      )}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Widget title="Overdue" items={overdue} tone="bg-red-50 text-red-700" />
        <Widget title="Due Today" items={dueToday} tone="bg-amber-50 text-amber-700" />
        <Widget title="Upcoming This Week" items={upcoming} tone="bg-blue-50 text-blue-700" />
      </div>
    </section>
  );
}
