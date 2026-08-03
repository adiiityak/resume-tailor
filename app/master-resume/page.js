"use client";

import { useCallback, useEffect, useState } from "react";
import DashboardLoadingState from "@/components/dashboard/DashboardLoadingState";
import ConfirmDialog from "@/components/shared/ConfirmDialog";
import { SECTIONS, ENTRY_STATUSES, ENTRY_STATUS_STYLES } from "@/lib/masterResumeShared";

const input = "w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500";
const btnPrimary = "rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-slate-700 disabled:opacity-50";
const btnGhost = "rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50";

const BLANK_ENTRY = { section: "Experience", title: "", org: "", dates: "", bullets: "", skills: "", tags: "", metrics: "", status: "Needs Review" };

function EntryForm({ initial, onSave, onCancel, saving }) {
  const [f, setF] = useState(initial);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  return (
    <div className="space-y-2 rounded-lg border border-slate-200 bg-slate-50 p-3">
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        <select className={input} value={f.section} onChange={set("section")} aria-label="Section">
          {SECTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        <select className={input} value={f.status} onChange={set("status")} aria-label="Status">
          {ENTRY_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        <input className={input} placeholder="Title / role" value={f.title} onChange={set("title")} />
        <input className={input} placeholder="Organization / company" value={f.org} onChange={set("org")} />
        <input className={input} placeholder="Dates (e.g. 2021 – 2025)" value={f.dates} onChange={set("dates")} />
        <input className={input} placeholder="Metrics (only if real)" value={f.metrics} onChange={set("metrics")} />
      </div>
      <textarea className={`${input} h-24 resize-y`} placeholder="Bullets — one per line" value={f.bullets} onChange={set("bullets")} />
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        <input className={input} placeholder="Skills (comma-separated)" value={f.skills} onChange={set("skills")} />
        <input className={input} placeholder="Tags (comma-separated)" value={f.tags} onChange={set("tags")} />
      </div>
      <div className="flex gap-2">
        <button onClick={() => onSave(f)} disabled={saving} className={btnPrimary}>{saving ? "Saving…" : "Save entry"}</button>
        <button onClick={onCancel} className={btnGhost}>Cancel</button>
      </div>
    </div>
  );
}

function toForm(entry) {
  return { ...entry, bullets: (entry.bullets || []).join("\n"), skills: (entry.skills || []).join(", "), tags: (entry.tags || []).join(", ") };
}

function EntryCard({ entry, onSaved, onDelete }) {
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  async function save(form) {
    setSaving(true);
    try {
      const res = await fetch(`/api/master-resume/entries/${encodeURIComponent(entry.id)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (res.ok) { onSaved(data.entry); setEditing(false); }
    } finally {
      setSaving(false);
    }
  }

  async function setStatus(status) {
    const res = await fetch(`/api/master-resume/entries/${encodeURIComponent(entry.id)}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status }),
    });
    const data = await res.json();
    if (res.ok) onSaved(data.entry);
  }

  if (editing) return <EntryForm initial={toForm(entry)} onSave={save} onCancel={() => setEditing(false)} saving={saving} />;

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-slate-900">{entry.title || entry.org || "(untitled)"}</p>
          <p className="text-xs text-slate-500">{[entry.org && entry.org !== entry.title ? entry.org : null, entry.dates].filter(Boolean).join(" · ")}</p>
        </div>
        <select value={entry.status} onChange={(e) => setStatus(e.target.value)} aria-label="Entry status"
          className={`rounded-full border px-2 py-0.5 text-xs font-medium ${ENTRY_STATUS_STYLES[entry.status] || ""}`}>
          {ENTRY_STATUSES.map((s) => <option key={s} value={s} className="bg-white text-slate-800">{s}</option>)}
        </select>
      </div>
      {entry.bullets?.length > 0 && (
        <ul className="mt-2 space-y-1">
          {entry.bullets.map((b, i) => <li key={i} className="pl-4 -indent-3 text-sm text-slate-700">• {b}</li>)}
        </ul>
      )}
      {entry.metrics && <p className="mt-1 text-xs text-emerald-700">Metric: {entry.metrics}</p>}
      {entry.skills?.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1">
          {entry.skills.map((s) => <span key={s} className="rounded bg-slate-100 px-1.5 py-0.5 text-[11px] text-slate-500">{s}</span>)}
        </div>
      )}
      <div className="mt-3 flex gap-2">
        <button onClick={() => setEditing(true)} className="rounded-md border border-slate-300 bg-white px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50">Edit</button>
        <button onClick={() => onDelete(entry)} className="rounded-md border border-slate-300 bg-white px-2.5 py-1 text-xs font-medium text-red-600 hover:bg-red-50">Delete</button>
      </div>
    </div>
  );
}

export default function MasterResumePage() {
  const [doc, setDoc] = useState(null);
  const [loading, setLoading] = useState(true);
  const [contact, setContact] = useState({});
  const [summary, setSummary] = useState("");
  const [savingHeader, setSavingHeader] = useState(false);
  const [headerNote, setHeaderNote] = useState("");

  const [adding, setAdding] = useState(false);
  const [addingSaving, setAddingSaving] = useState(false);

  const [showImport, setShowImport] = useState(false);
  const [importText, setImportText] = useState("");
  const [importing, setImporting] = useState(false);
  const [importNote, setImportNote] = useState("");

  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/master-resume");
      const data = await res.json();
      if (res.ok) { setDoc(data); setContact(data.contact || {}); setSummary(data.summary || ""); }
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => { load(); }, [load]);

  async function saveHeader() {
    setSavingHeader(true); setHeaderNote("");
    try {
      const res = await fetch("/api/master-resume", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ contact, summary }) });
      if (res.ok) setHeaderNote("Saved.");
    } finally { setSavingHeader(false); }
  }

  async function addEntry(form) {
    setAddingSaving(true);
    try {
      const res = await fetch("/api/master-resume/entries", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
      if (res.ok) { setAdding(false); await load(); }
    } finally { setAddingSaving(false); }
  }

  async function runImport() {
    setImporting(true); setImportNote("");
    try {
      const res = await fetch("/api/master-resume/entries", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ resumeText: importText }) });
      const data = await res.json();
      if (res.ok) { setImportNote(`Imported ${data.added} entries — all marked “Needs Review” for you to approve.`); setImportText(""); setShowImport(false); await load(); }
    } finally { setImporting(false); }
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await fetch(`/api/master-resume/entries/${encodeURIComponent(deleteTarget.id)}`, { method: "DELETE" });
      setDeleteTarget(null); await load();
    } finally { setDeleting(false); }
  }

  function updateEntryInState(entry) {
    setDoc((d) => ({ ...d, entries: d.entries.map((e) => (e.id === entry.id ? entry : e)) }));
  }

  if (loading) {
    return <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-8 sm:px-6 lg:px-8"><DashboardLoadingState /></main>;
  }

  const entries = doc?.entries || [];
  const approvedCount = entries.filter((e) => e.status === "Approved").length;
  const setContactField = (k) => (e) => setContact({ ...contact, [k]: e.target.value });

  return (
    <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Master Resume</h1>
          <p className="mt-1 max-w-2xl text-sm text-slate-600">
            Your single source of verified experience. {entries.length} entries · {approvedCount} approved. Tailored
            resumes draw from this — nothing here is ever changed without you.
          </p>
        </div>
        <button onClick={() => setShowImport((s) => !s)} className={btnGhost}>{showImport ? "Close import" : "Import from resume"}</button>
      </div>

      {importNote && <p className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm text-emerald-700">{importNote}</p>}

      {showImport && (
        <div className="mb-6 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="mb-2 text-sm text-slate-600">Paste an existing resume. Entries are extracted verbatim and marked “Needs Review” — nothing is invented.</p>
          <textarea className={`${input} h-48 resize-y`} placeholder="Paste your resume text…" value={importText} onChange={(e) => setImportText(e.target.value)} />
          <div className="mt-2 flex gap-2">
            <button onClick={runImport} disabled={importing || !importText.trim()} className={btnPrimary}>{importing ? "Importing…" : "Import entries"}</button>
            <button onClick={() => setShowImport(false)} className={btnGhost}>Cancel</button>
          </div>
        </div>
      )}

      {/* Contact + summary */}
      <section className="mb-8 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="mb-3 text-sm font-medium text-slate-700">Contact & summary</h2>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          <input className={input} placeholder="Name" value={contact.name || ""} onChange={setContactField("name")} />
          <input className={input} placeholder="Email" value={contact.email || ""} onChange={setContactField("email")} />
          <input className={input} placeholder="Phone" value={contact.phone || ""} onChange={setContactField("phone")} />
          <input className={input} placeholder="Location" value={contact.location || ""} onChange={setContactField("location")} />
          <input className={input} placeholder="LinkedIn" value={contact.linkedin || ""} onChange={setContactField("linkedin")} />
          <input className={input} placeholder="Portfolio" value={contact.portfolio || ""} onChange={setContactField("portfolio")} />
        </div>
        <textarea className={`${input} mt-2 h-24 resize-y`} placeholder="Professional summary" value={summary} onChange={(e) => setSummary(e.target.value)} />
        <div className="mt-2 flex items-center gap-3">
          <button onClick={saveHeader} disabled={savingHeader} className={btnPrimary}>{savingHeader ? "Saving…" : "Save contact & summary"}</button>
          {headerNote && <span className="text-xs text-emerald-700">{headerNote}</span>}
        </div>
      </section>

      {/* Entries by section */}
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-slate-900">Entries</h2>
        <button onClick={() => setAdding((a) => !a)} className={btnGhost}>{adding ? "Close" : "+ Add entry"}</button>
      </div>

      {adding && <div className="mb-6"><EntryForm initial={BLANK_ENTRY} onSave={addEntry} onCancel={() => setAdding(false)} saving={addingSaving} /></div>}

      {entries.length === 0 ? (
        <p className="rounded-xl border border-dashed border-slate-300 bg-white px-4 py-10 text-center text-sm text-slate-500">
          No entries yet. Import a resume or add entries manually.
        </p>
      ) : (
        <div className="space-y-8">
          {SECTIONS.map((section) => {
            const secEntries = entries.filter((e) => e.section === section);
            if (secEntries.length === 0) return null;
            return (
              <section key={section}>
                <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-500">{section}</h3>
                <div className="space-y-3">
                  {secEntries.map((e) => <EntryCard key={e.id} entry={e} onSaved={updateEntryInState} onDelete={setDeleteTarget} />)}
                </div>
              </section>
            );
          })}
        </div>
      )}

      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete this entry?"
        message={deleteTarget ? `Remove “${deleteTarget.title || deleteTarget.org}” from your master resume.` : ""}
        confirmLabel="Delete Entry" danger busy={deleting}
        onCancel={() => setDeleteTarget(null)} onConfirm={confirmDelete}
      />
    </main>
  );
}
