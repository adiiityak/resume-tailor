"use client";

import { useState } from "react";
import Link from "next/link";
import ApplicationStatusSelect from "@/components/dashboard/ApplicationStatusSelect";
import { downloadServerFile } from "@/components/dashboard/downloadFile";
import { formatDate, formatDateShort, formatTime } from "@/lib/dashboardShared";

function Field({ label, children }) {
  return (
    <div>
      <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</dt>
      <dd className="mt-0.5 text-sm text-slate-800">{children || "—"}</dd>
    </div>
  );
}

export default function ApplicationDetails({ app, onStatusChange, onDuplicate, onDelete }) {
  const [error, setError] = useState("");
  const [busy, setBusy] = useState("");

  async function dl(kind) {
    setError("");
    setBusy(kind);
    try {
      if (kind === "resume") await downloadServerFile(app.id, "resume.docx", `resume-${app.roleSlug}.docx`);
      if (kind === "cover") await downloadServerFile(app.id, "cover-letter.docx", `cover-letter-${app.roleSlug}.docx`);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy("");
    }
  }

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <dl className="grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-3">
          <Field label="Company">{app.company}</Field>
          <Field label="Role">{app.role}</Field>
          <Field label="Location">{app.location}</Field>
          <Field label="Application Date">{formatDate(app.applicationDate)}</Field>
          <Field label="Created">{`${formatDateShort(app.createdAt)} ${formatTime(app.createdAt)}`}</Field>
          <Field label="Updated">{`${formatDateShort(app.updatedAt)} ${formatTime(app.updatedAt)}`}</Field>
          <Field label="Tailoring Mode">{app.mode === "api" ? "Claude API" : "Local"}</Field>
          <Field label="Resume Variant">{String(app.resumeVariant || "v1").toUpperCase()}</Field>
          <Field label="Match Score">{typeof app.matchScore === "number" ? `${app.matchScore}%` : "—"}</Field>
          <Field label="Job URL">
            {app.jobUrl ? <a href={app.jobUrl} className="text-blue-600 underline" target="_blank" rel="noreferrer">{app.jobUrl}</a> : "—"}
          </Field>
          <div>
            <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">Application Status</dt>
            <dd className="mt-1">
              <ApplicationStatusSelect id={app.id} status={app.status} onChange={onStatusChange} />
            </dd>
          </div>
        </dl>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="flex flex-wrap gap-2">
        <Link href={`/?load=${encodeURIComponent(app.id)}`} className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-slate-700">
          Load in Resume Tailor
        </Link>
        <button onClick={() => dl("resume")} disabled={!app.hasResume || busy === "resume"} className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50 disabled:opacity-40">
          Download Resume
        </button>
        <button onClick={() => dl("cover")} disabled={!app.hasCoverLetter || busy === "cover"} className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50 disabled:opacity-40">
          Download Cover Letter
        </button>
        <button onClick={onDuplicate} className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50">
          Duplicate Application
        </button>
        <button onClick={onDelete} className="ml-auto rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-red-600 shadow-sm hover:bg-red-50">
          Delete Application
        </button>
      </div>
    </div>
  );
}
