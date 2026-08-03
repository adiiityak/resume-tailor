"use client";

import Link from "next/link";
import { JOB_STATUS_STYLES, PRIORITY_STYLES } from "@/lib/jobsShared";
import { formatDateShort } from "@/lib/dashboardShared";

function fitTone(score) {
  if (typeof score !== "number") return "bg-slate-100 text-slate-400";
  if (score >= 80) return "bg-emerald-50 text-emerald-700";
  if (score >= 60) return "bg-blue-50 text-blue-700";
  if (score >= 40) return "bg-amber-50 text-amber-700";
  return "bg-slate-100 text-slate-500";
}

export default function JobCard({ job, fit, onTailor, onDelete }) {
  return (
    <div className="flex flex-col rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-slate-300 hover:shadow-md">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <Link href={`/jobs/${encodeURIComponent(job.id)}`} className="block truncate text-base font-semibold text-slate-900 hover:underline">
            {job.role || "Untitled role"}
          </Link>
          <p className="truncate text-xs text-slate-500">
            {job.company || "Unknown company"}{job.location ? ` · ${job.location}` : ""}{job.workMode ? ` · ${job.workMode}` : ""}
          </p>
        </div>
        <span className={`shrink-0 rounded border px-1.5 py-0.5 text-[10px] font-medium ${PRIORITY_STYLES[job.priority] || PRIORITY_STYLES.Medium}`}>
          {job.priority}
        </span>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-1.5">
        <span className={`rounded-full border px-2 py-0.5 text-[11px] font-medium ${JOB_STATUS_STYLES[job.status] || JOB_STATUS_STYLES.Saved}`}>{job.status}</span>
        {typeof fit === "number" && (
          <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${fitTone(fit)}`}>{fit}% fit</span>
        )}
        {job.closingDate && <span className="text-[11px] text-slate-400">closes {formatDateShort(job.closingDate)}</span>}
      </div>

      {job.notes && <p className="mt-2 line-clamp-2 text-xs text-slate-500">{job.notes}</p>}

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <button onClick={() => onTailor(job)} className="rounded-md bg-slate-900 px-3 py-1.5 text-xs font-medium text-white shadow-sm hover:bg-slate-700">
          Tailor Resume
        </button>
        <Link href={`/jobs/${encodeURIComponent(job.id)}`} className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 shadow-sm hover:bg-slate-50">
          Open
        </Link>
        {job.jobUrl && (
          <a href={job.jobUrl} target="_blank" rel="noreferrer" className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 shadow-sm hover:bg-slate-50">
            Job URL
          </a>
        )}
        {onDelete && (
          <button onClick={() => onDelete(job)} className="ml-auto rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-red-600 shadow-sm hover:bg-red-50">
            Delete
          </button>
        )}
      </div>
    </div>
  );
}
