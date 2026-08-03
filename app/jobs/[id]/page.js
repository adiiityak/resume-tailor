"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import ConfirmDialog from "@/components/shared/ConfirmDialog";
import DashboardLoadingState from "@/components/dashboard/DashboardLoadingState";
import EmptyState from "@/components/dashboard/EmptyState";
import { JOB_STATUSES, JOB_PRIORITIES, INTEREST_LEVELS, JOB_STATUS_STYLES } from "@/lib/jobsShared";
import { formatDateShort } from "@/lib/dashboardShared";

function Field({ label, children }) {
  return (
    <div>
      <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</dt>
      <dd className="mt-0.5 text-sm text-slate-800">{children || "—"}</dd>
    </div>
  );
}

export default function JobDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id;

  const [job, setJob] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notes, setNotes] = useState("");
  const [savingNotes, setSavingNotes] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(async () => {
    setError("");
    try {
      const res = await fetch(`/api/jobs/${encodeURIComponent(id)}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Job not found.");
      setJob(data);
      setNotes(data.notes || "");
    } catch (err) {
      setError(err.message);
      setJob(null);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  async function patch(body) {
    const res = await fetch(`/api/jobs/${encodeURIComponent(id)}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    if (res.ok) setJob(data.job);
  }

  async function saveNotes() {
    setSavingNotes(true);
    try { await patch({ notes }); } finally { setSavingNotes(false); }
  }

  async function confirmDelete() {
    setDeleting(true);
    try {
      await fetch(`/api/jobs/${encodeURIComponent(id)}`, { method: "DELETE" });
      router.push("/jobs");
    } catch {
      setDeleting(false);
    }
  }

  const selectClass = "rounded-md border border-slate-300 bg-white px-2 py-1.5 text-xs font-medium text-slate-700 shadow-sm";

  return (
    <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-8 sm:px-6 lg:px-8">
      <nav className="mb-4 text-sm text-slate-500" aria-label="Breadcrumb">
        <Link href="/jobs" className="hover:text-slate-800">Job Library</Link>
        <span className="mx-1.5">/</span>
        <span className="text-slate-800">{job ? job.role || "Job" : "Job"}</span>
      </nav>

      {loading ? (
        <DashboardLoadingState />
      ) : error || !job ? (
        <EmptyState title="Job not found." message={error || "This job could not be loaded."} actionLabel="Back to Job Library" actionHref="/jobs" />
      ) : (
        <>
          <header className="mb-6 flex flex-wrap items-start justify-between gap-3">
            <div>
              <h1 className="text-2xl font-semibold tracking-tight text-slate-900">{job.role || "Untitled role"}</h1>
              <p className="mt-1 text-sm text-slate-600">{job.company}{job.location ? ` · ${job.location}` : ""}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link href={`/?job=${encodeURIComponent(job.id)}`} className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-slate-700">Tailor Resume</Link>
              {job.jobUrl && <a href={job.jobUrl} target="_blank" rel="noreferrer" className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50">Open Job URL</a>}
              <button onClick={() => setShowDelete(true)} className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-red-600 shadow-sm hover:bg-red-50">Delete</button>
            </div>
          </header>

          <div className="mb-6 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-4 flex flex-wrap items-center gap-4">
              <label className="flex items-center gap-1.5 text-xs text-slate-500">
                Status
                <select value={job.status} onChange={(e) => patch({ status: e.target.value })} className={`${selectClass} ${JOB_STATUS_STYLES[job.status] || ""}`}>
                  {JOB_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </label>
              <label className="flex items-center gap-1.5 text-xs text-slate-500">
                Priority
                <select value={job.priority} onChange={(e) => patch({ priority: e.target.value })} className={selectClass}>
                  {JOB_PRIORITIES.map((p) => <option key={p} value={p}>{p}</option>)}
                </select>
              </label>
              <label className="flex items-center gap-1.5 text-xs text-slate-500">
                Interest
                <select value={job.interest} onChange={(e) => patch({ interest: e.target.value })} className={selectClass}>
                  {INTEREST_LEVELS.map((p) => <option key={p} value={p}>{p}</option>)}
                </select>
              </label>
            </div>

            <dl className="grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-3">
              <Field label="Company">{job.company}</Field>
              <Field label="Location">{job.location}</Field>
              <Field label="Work mode">{job.workMode}</Field>
              <Field label="Salary range">{job.salaryRange}</Field>
              <Field label="Source">{job.source}</Field>
              <Field label="Closing date">{job.closingDate ? formatDateShort(job.closingDate) : "—"}</Field>
              <Field label="Saved">{formatDateShort(job.dateSaved)}</Field>
              <Field label="Job URL">{job.jobUrl ? <a href={job.jobUrl} target="_blank" rel="noreferrer" className="text-blue-600 underline">Open</a> : "—"}</Field>
              <Field label="Linked application">{job.applicationId ? <Link href={`/dashboard/application/${encodeURIComponent(job.applicationId)}`} className="text-blue-600 underline">View</Link> : "Not tailored yet"}</Field>
            </dl>
          </div>

          <div className="mb-6 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="mb-2 text-sm font-medium text-slate-700">Notes</h2>
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} className="h-28 w-full resize-y rounded-lg border border-slate-300 p-3 text-sm text-slate-900 focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500" placeholder="Your notes about this role…" />
            <button onClick={saveNotes} disabled={savingNotes} className="mt-2 rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 shadow-sm hover:bg-slate-50 disabled:opacity-50">
              {savingNotes ? "Saving…" : "Save notes"}
            </button>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="mb-2 text-sm font-medium text-slate-700">Job description</h2>
            {job.jobDescription ? (
              <div className="whitespace-pre-wrap text-sm leading-relaxed text-slate-700">{job.jobDescription}</div>
            ) : (
              <p className="text-sm text-slate-400">No job description saved.</p>
            )}
          </div>
        </>
      )}

      <ConfirmDialog
        open={showDelete}
        title="Delete this job?"
        message={job ? `Remove “${job.role} — ${job.company}” from your library.` : ""}
        confirmLabel="Delete Job"
        danger
        busy={deleting}
        onCancel={() => setShowDelete(false)}
        onConfirm={confirmDelete}
      />
    </main>
  );
}
