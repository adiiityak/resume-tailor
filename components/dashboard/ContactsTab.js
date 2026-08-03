"use client";

import { useCallback, useEffect, useState } from "react";
import { CONTACT_RELATIONSHIPS, RELATIONSHIP_STYLES } from "@/lib/contactsShared";

const input = "w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500";
const BLANK = { name: "", role: "", email: "", phone: "", linkedin: "", relationship: "Recruiter", source: "", notes: "" };

export default function ContactsTab({ app }) {
  const [contacts, setContacts] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(BLANK);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/contacts");
      const data = await res.json();
      if (res.ok) setContacts((data.contacts || []).filter((c) => c.applicationId === app.id));
    } catch { /* non-fatal */ }
  }, [app.id]);
  useEffect(() => { load(); }, [load]);

  async function add(e) {
    e.preventDefault();
    setSaving(true);
    try {
      const body = { ...form, applicationId: app.id, company: app.company, companySlug: app.companySlug };
      const res = await fetch("/api/contacts", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      if (res.ok) { setForm(BLANK); setShowForm(false); await load(); }
    } finally { setSaving(false); }
  }

  async function remove(c) {
    await fetch(`/api/contacts/${encodeURIComponent(c.id)}`, { method: "DELETE" });
    await load();
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <p className="text-sm text-slate-600">People connected to this application — recruiters, interviewers, referrals.</p>
        <button onClick={() => setShowForm((s) => !s)} className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50">
          {showForm ? "Close" : "+ Add contact"}
        </button>
      </div>

      {showForm && (
        <form onSubmit={add} className="mb-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <input className={input} placeholder="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
            <input className={input} placeholder="Role / title" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} />
            <select className={input} value={form.relationship} onChange={(e) => setForm({ ...form, relationship: e.target.value })} aria-label="Relationship">
              {CONTACT_RELATIONSHIPS.map((r) => <option key={r} value={r}>{r}</option>)}
            </select>
            <input className={input} placeholder="Source (LinkedIn, referral…)" value={form.source} onChange={(e) => setForm({ ...form, source: e.target.value })} />
            <input className={input} placeholder="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            <input className={input} placeholder="Phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            <input className={input} placeholder="LinkedIn URL" value={form.linkedin} onChange={(e) => setForm({ ...form, linkedin: e.target.value })} />
          </div>
          <textarea className={`${input} mt-2 h-16 resize-y`} placeholder="Notes" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
          <div className="mt-2 flex gap-2">
            <button type="submit" disabled={saving} className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-slate-700 disabled:opacity-50">{saving ? "Saving…" : "Add contact"}</button>
            <button type="button" onClick={() => setShowForm(false)} className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50">Cancel</button>
          </div>
        </form>
      )}

      {contacts.length === 0 ? (
        <p className="rounded-xl border border-dashed border-slate-300 bg-white px-4 py-8 text-center text-sm text-slate-500">No contacts added for this application yet.</p>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {contacts.map((c) => (
            <div key={c.id} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-slate-900">{c.name}</p>
                  <p className="text-xs text-slate-500">{[c.role, c.company].filter(Boolean).join(" · ")}</p>
                </div>
                <span className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium ${RELATIONSHIP_STYLES[c.relationship] || "bg-slate-100 text-slate-500"}`}>{c.relationship}</span>
              </div>
              <div className="mt-2 space-y-0.5 text-xs text-slate-600">
                {c.email && <p>✉ <a href={`mailto:${c.email}`} className="text-blue-600 underline">{c.email}</a></p>}
                {c.phone && <p>☎ {c.phone}</p>}
                {c.linkedin && <p>in <a href={c.linkedin} target="_blank" rel="noreferrer" className="text-blue-600 underline">LinkedIn</a></p>}
              </div>
              {c.notes && <p className="mt-2 text-sm text-slate-700">{c.notes}</p>}
              <div className="mt-3">
                <button onClick={() => remove(c)} className="rounded-md border border-slate-300 bg-white px-2.5 py-1 text-xs font-medium text-red-600 hover:bg-red-50">Delete</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
