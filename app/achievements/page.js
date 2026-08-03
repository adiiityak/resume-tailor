"use client";

import { useCallback, useEffect, useState } from "react";
import DashboardLoadingState from "@/components/dashboard/DashboardLoadingState";
import ConfirmDialog from "@/components/shared/ConfirmDialog";
import EmptyState from "@/components/dashboard/EmptyState";

const input = "w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500";
const btnPrimary = "rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-slate-700 disabled:opacity-50";
const btnGhost = "rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50";

const BLANK = { title: "", context: "", action: "", result: "", metric: "", company: "", project: "", date: "", skills: "", tags: "", evidence: "", resumeBullet: "" };

function toForm(a) {
  return { ...a, skills: (a.skills || []).join(", "), tags: (a.tags || []).join(", ") };
}

function AchievementForm({ initial, onSave, onCancel, saving }) {
  const [f, setF] = useState(initial);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  return (
    <div className="space-y-2 rounded-xl border border-slate-200 bg-slate-50 p-4">
      <input className={input} placeholder="Achievement title" value={f.title} onChange={set("title")} />
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        <input className={input} placeholder="Company" value={f.company} onChange={set("company")} />
        <input className={input} placeholder="Project" value={f.project} onChange={set("project")} />
      </div>
      <input className={input} placeholder="Context — where / when this happened" value={f.context} onChange={set("context")} />
      <input className={input} placeholder="Action — what you actually did" value={f.action} onChange={set("action")} />
      <input className={input} placeholder="Result — the real outcome" value={f.result} onChange={set("result")} />
      <input className={input} placeholder="Metric — only if you genuinely know it" value={f.metric} onChange={set("metric")} />
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        <input className={input} placeholder="Skills (comma-separated)" value={f.skills} onChange={set("skills")} />
        <input className={input} placeholder="Tags (comma-separated)" value={f.tags} onChange={set("tags")} />
      </div>
      <textarea className={`${input} h-20 resize-y`} placeholder="Resume-ready bullet (optional)" value={f.resumeBullet} onChange={set("resumeBullet")} />
      <div className="flex gap-2">
        <button onClick={() => onSave(f)} disabled={saving} className={btnPrimary}>{saving ? "Saving…" : "Save achievement"}</button>
        <button onClick={onCancel} className={btnGhost}>Cancel</button>
      </div>
    </div>
  );
}

function AchievementCard({ a, onSaved, onDelete }) {
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  async function save(form) {
    setSaving(true);
    try {
      const res = await fetch(`/api/achievements/${encodeURIComponent(a.id)}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
      const data = await res.json();
      if (res.ok) { onSaved(data.achievement); setEditing(false); }
    } finally { setSaving(false); }
  }
  if (editing) return <AchievementForm initial={toForm(a)} onSave={save} onCancel={() => setEditing(false)} saving={saving} />;
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-semibold text-slate-900">{a.title || "(untitled achievement)"}</p>
        {a.metric && <span className="shrink-0 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-700">{a.metric}</span>}
      </div>
      <p className="text-xs text-slate-500">{[a.company, a.project].filter(Boolean).join(" · ")}</p>
      <dl className="mt-2 space-y-1 text-sm text-slate-700">
        {a.context && <div><span className="text-xs font-medium text-slate-400">Context: </span>{a.context}</div>}
        {a.action && <div><span className="text-xs font-medium text-slate-400">Action: </span>{a.action}</div>}
        {a.result && <div><span className="text-xs font-medium text-slate-400">Result: </span>{a.result}</div>}
      </dl>
      {a.resumeBullet && <p className="mt-2 rounded bg-slate-50 px-2 py-1 text-sm italic text-slate-600">“{a.resumeBullet}”</p>}
      {a.skills?.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1">
          {a.skills.map((s) => <span key={s} className="rounded bg-slate-100 px-1.5 py-0.5 text-[11px] text-slate-500">{s}</span>)}
        </div>
      )}
      <div className="mt-3 flex gap-2">
        <button onClick={() => setEditing(true)} className="rounded-md border border-slate-300 bg-white px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50">Edit</button>
        <button onClick={() => onDelete(a)} className="rounded-md border border-slate-300 bg-white px-2.5 py-1 text-xs font-medium text-red-600 hover:bg-red-50">Delete</button>
      </div>
    </div>
  );
}

export default function AchievementsPage() {
  const [items, setItems] = useState(null);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/achievements");
      const data = await res.json();
      if (res.ok) setItems(data.achievements);
    } finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  async function add(form) {
    setSaving(true);
    try {
      const res = await fetch("/api/achievements", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
      if (res.ok) { setAdding(false); await load(); }
    } finally { setSaving(false); }
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await fetch(`/api/achievements/${encodeURIComponent(deleteTarget.id)}`, { method: "DELETE" });
      setDeleteTarget(null); await load();
    } finally { setDeleting(false); }
  }

  function updateInState(a) { setItems((list) => list.map((x) => (x.id === a.id ? a : x))); }

  if (loading) return <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-8 sm:px-6 lg:px-8"><DashboardLoadingState /></main>;

  return (
    <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Achievement Bank</h1>
          <p className="mt-1 max-w-2xl text-sm text-slate-600">
            Store real, verified accomplishments in your own words. Add a metric only if you genuinely know it —
            achievements are suggested during tailoring but never inserted without your approval.
          </p>
        </div>
        <button onClick={() => setAdding((a) => !a)} className={btnPrimary}>{adding ? "Close" : "+ Add achievement"}</button>
      </div>

      {adding && <div className="mb-6"><AchievementForm initial={BLANK} onSave={add} onCancel={() => setAdding(false)} saving={saving} /></div>}

      {!items || items.length === 0 ? (
        <EmptyState title="No achievements yet" message="Add your real accomplishments so they're ready to reuse when tailoring." actionLabel="Add achievement" onAction={() => setAdding(true)} />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {items.map((a) => <AchievementCard key={a.id} a={a} onSaved={updateInState} onDelete={setDeleteTarget} />)}
        </div>
      )}

      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete this achievement?"
        message={deleteTarget ? `Remove “${deleteTarget.title}” from your bank.` : ""}
        confirmLabel="Delete" danger busy={deleting}
        onCancel={() => setDeleteTarget(null)} onConfirm={confirmDelete}
      />
    </main>
  );
}
