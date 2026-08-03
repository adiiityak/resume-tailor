"use client";

import { useCallback, useEffect, useState } from "react";
import { MESSAGE_TYPES, buildMessage, messageTypeLabel } from "@/lib/messageTemplates";
import { formatDateShort, formatTime } from "@/lib/dashboardShared";

const input = "w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500";

export default function MessagesTab({ app }) {
  const [contacts, setContacts] = useState([]);
  const [saved, setSaved] = useState([]);
  const [type, setType] = useState("application_follow_up");
  const [contactId, setContactId] = useState("");
  const [candidateName, setCandidateName] = useState("");
  const [draft, setDraft] = useState({ subject: "", body: "" });
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);
  const [note, setNote] = useState("");

  const loadContacts = useCallback(async () => {
    try {
      const res = await fetch("/api/contacts");
      const data = await res.json();
      if (res.ok) setContacts((data.contacts || []).filter((c) => c.applicationId === app.id));
    } catch { /* non-fatal */ }
  }, [app.id]);

  const loadMessages = useCallback(async () => {
    try {
      const res = await fetch(`/api/applications/${encodeURIComponent(app.id)}/messages`);
      const data = await res.json();
      if (res.ok) setSaved(data.messages || []);
    } catch { /* non-fatal */ }
  }, [app.id]);

  useEffect(() => { loadContacts(); loadMessages(); }, [loadContacts, loadMessages]);

  // Default the sender name to the name at the top of the resume, if present.
  useEffect(() => {
    const first = (app.tailoredResume || app.originalResume || "").split("\n").map((l) => l.trim()).find(Boolean);
    if (first && first.length <= 60) setCandidateName(first);
  }, [app.tailoredResume, app.originalResume]);

  function generate() {
    const contact = contacts.find((c) => c.id === contactId) || null;
    const built = buildMessage(type, app, contact, candidateName);
    setDraft(built);
    setNote("Draft generated — review and edit before sending. Nothing is sent automatically.");
  }

  async function save() {
    if (!draft.body.trim()) return;
    setSaving(true);
    try {
      const contact = contacts.find((c) => c.id === contactId) || null;
      const res = await fetch(`/api/applications/${encodeURIComponent(app.id)}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, subject: draft.subject, body: draft.body, contactId: contactId || null, contactName: contact?.name || "" }),
      });
      if (res.ok) { setNote("Draft saved."); await loadMessages(); }
    } finally { setSaving(false); }
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText([draft.subject && `Subject: ${draft.subject}`, draft.body].filter(Boolean).join("\n\n"));
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch { setNote("Copy failed — select the text manually."); }
  }

  async function remove(m) {
    await fetch(`/api/applications/${encodeURIComponent(app.id)}/messages?messageId=${encodeURIComponent(m.id)}`, { method: "DELETE" });
    await loadMessages();
  }

  const contact = contacts.find((c) => c.id === contactId) || null;
  const mailto = contact?.email
    ? `mailto:${encodeURIComponent(contact.email)}?subject=${encodeURIComponent(draft.subject || "")}&body=${encodeURIComponent(draft.body || "")}`
    : null;

  return (
    <div>
      <p className="mb-3 text-sm text-slate-600">
        Draft outreach and follow-up messages from this application&apos;s real details. Anything unknown is left as a
        <span className="mx-1 rounded bg-slate-100 px-1 py-0.5 font-mono text-xs">[placeholder]</span>
        for you to fill — nothing is invented, and nothing is ever sent automatically.
      </p>

      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
          <select className={input} value={type} onChange={(e) => setType(e.target.value)} aria-label="Message type">
            {MESSAGE_TYPES.map((t) => <option key={t.key} value={t.key}>{t.label}</option>)}
          </select>
          <select className={input} value={contactId} onChange={(e) => setContactId(e.target.value)} aria-label="Recipient contact">
            <option value="">No contact selected</option>
            {contacts.map((c) => <option key={c.id} value={c.id}>{c.name}{c.role ? ` — ${c.role}` : ""}</option>)}
          </select>
          <input className={input} placeholder="Your name (sign-off)" value={candidateName} onChange={(e) => setCandidateName(e.target.value)} aria-label="Your name" />
        </div>
        {contacts.length === 0 && (
          <p className="mt-2 text-xs text-slate-500">Tip: add a contact in the Contacts tab to address the message by name.</p>
        )}
        <button onClick={generate} className="mt-3 rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-slate-700">
          Generate draft
        </button>
      </div>

      {draft.body && (
        <div className="mt-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          {note && <p className="mb-2 text-xs text-emerald-700">{note}</p>}
          <label className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Subject</label>
          <input className={`${input} mt-1`} value={draft.subject} onChange={(e) => setDraft({ ...draft, subject: e.target.value })} placeholder="(no subject — e.g. LinkedIn note)" />
          <label className="mt-3 block text-[11px] font-semibold uppercase tracking-wide text-slate-500">Message</label>
          <textarea className={`${input} mt-1 h-64 resize-y`} value={draft.body} onChange={(e) => setDraft({ ...draft, body: e.target.value })} />
          <div className="mt-3 flex flex-wrap gap-2">
            <button onClick={save} disabled={saving} className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-slate-700 disabled:opacity-50">{saving ? "Saving…" : "Save draft"}</button>
            <button onClick={copy} className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50">{copied ? "Copied!" : "Copy"}</button>
            {mailto && (
              <a href={mailto} className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50">
                Open in email client
              </a>
            )}
          </div>
        </div>
      )}

      <div className="mt-6">
        <h3 className="mb-2 text-sm font-medium text-slate-700">Saved drafts</h3>
        {saved.length === 0 ? (
          <p className="text-sm text-slate-500">No saved drafts yet.</p>
        ) : (
          <ul className="space-y-2">
            {saved.map((m) => (
              <li key={m.id} className="rounded-lg border border-slate-200 bg-white p-3 shadow-sm">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-slate-800">{messageTypeLabel(m.type)}{m.contactName ? ` → ${m.contactName}` : ""}</p>
                    <p className="text-xs text-slate-500">{m.subject || "(no subject)"} · {formatDateShort(m.createdAt)} {formatTime(m.createdAt)}</p>
                  </div>
                  <div className="flex gap-1.5">
                    <button onClick={() => { setDraft({ subject: m.subject, body: m.body }); setType(m.type); }} className="rounded-md border border-slate-300 bg-white px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50">Load</button>
                    <button onClick={() => remove(m)} className="rounded-md border border-slate-300 bg-white px-2.5 py-1 text-xs font-medium text-red-600 hover:bg-red-50">Delete</button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
