"use client";

import { useState } from "react";
import Link from "next/link";
import ApplicationStatusBadge from "@/components/dashboard/ApplicationStatusBadge";
import { downloadServerFile } from "@/components/dashboard/downloadFile";
import { formatTime, matchScoreColor } from "@/lib/dashboardShared";

export default function ApplicationCard({ app, onDelete }) {
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");

  async function download(kind) {
    setError("");
    setBusy(kind);
    try {
      if (kind === "resume") await downloadServerFile(app.id, "resume.docx", `resume-${app.roleSlug || "tailored"}.docx`);
      if (kind === "cover") await downloadServerFile(app.id, "cover-letter.docx", `cover-letter-${app.roleSlug || "tailored"}.docx`);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy("");
    }
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-slate-300 hover:shadow-md">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h3 className="text-base font-semibold text-slate-900">{app.role}</h3>
          <p className="text-xs text-slate-500">{app.company} · Created {formatTime(app.createdAt)}</p>
        </div>
        <ApplicationStatusBadge status={app.status} />
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500">
        <span className={`font-semibold ${matchScoreColor(app.matchScore)}`}>
          {typeof app.matchScore === "number" ? `${app.matchScore}% match` : "No score"}
        </span>
        <span>Design {String(app.resumeVariant || "v1").toUpperCase()}</span>
        <span className="capitalize">{app.mode === "api" ? "Claude API" : "Local"} mode</span>
        <span className="inline-flex gap-1">
          {app.hasResume && <span className="rounded bg-emerald-50 px-1.5 py-0.5 text-emerald-700">Resume</span>}
          {app.hasCoverLetter && <span className="rounded bg-emerald-50 px-1.5 py-0.5 text-emerald-700">Cover letter</span>}
          {app.hasJobDescription && <span className="rounded bg-slate-100 px-1.5 py-0.5 text-slate-600">JD</span>}
        </span>
      </div>

      {error && <p className="mt-2 text-xs text-red-600">{error}</p>}

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <Link
          href={`/dashboard/application/${encodeURIComponent(app.id)}`}
          className="rounded-md bg-slate-900 px-3 py-1.5 text-xs font-medium text-white shadow-sm hover:bg-slate-700"
        >
          Open
        </Link>
        <button
          onClick={() => download("resume")}
          disabled={!app.hasResume || busy === "resume"}
          className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 shadow-sm hover:bg-slate-50 disabled:opacity-40"
        >
          {busy === "resume" ? "…" : "Download Resume"}
        </button>
        <button
          onClick={() => download("cover")}
          disabled={!app.hasCoverLetter || busy === "cover"}
          className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 shadow-sm hover:bg-slate-50 disabled:opacity-40"
        >
          {busy === "cover" ? "…" : "Download Cover Letter"}
        </button>
        {onDelete && (
          <button
            onClick={() => onDelete(app)}
            className="ml-auto rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-red-600 shadow-sm hover:bg-red-50"
          >
            Delete
          </button>
        )}
      </div>
    </div>
  );
}
