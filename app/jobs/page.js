"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import JobCard from "@/components/jobs/JobCard";
import DuplicateJobDialog from "@/components/jobs/DuplicateJobDialog";
import ConfirmDialog from "@/components/shared/ConfirmDialog";
import EmptyState from "@/components/dashboard/EmptyState";
import DashboardLoadingState from "@/components/dashboard/DashboardLoadingState";
import { JOB_STATUSES, JOB_PRIORITIES, JOB_SORTS, sortJobs, jobMatchesQuery } from "@/lib/jobsShared";
import { computeJobFit } from "@/lib/jobFit";

const BLANK = {
  company: "", role: "", location: "", workMode: "", jobUrl: "", source: "",
  salaryRange: "", closingDate: "", priority: "Medium", interest: "Medium", notes: "", jobDescription: "",
};

export default function JobsPage() {
  const router = useRouter();
  const [jobs, setJobs] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(BLANK);
  const [saving, setSaving] = useState(false);
  const [dupSimilar, setDupSimilar] = useState(null);

  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("all");
  const [priority, setPriority] = useState("all");
  const [sort, setSort] = useState("newest");

  const [baseResume, setBaseResume] = useState("");
  const [showBase, setShowBase] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(async () => {
    setError("");
    try {
      const res = await fetch("/api/jobs");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Unable to read the job library.");
      setJobs(data.jobs);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    try { setBaseResume(localStorage.getItem("rt_base_resume") || ""); } catch { /* ignore */ }
  }, []);

  function saveBaseResume(v) {
    setBaseResume(v);
    try { localStorage.setItem("rt_base_resume", v); } catch { /* ignore */ }
  }

  async function submitJob(e) {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/jobs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "Unable to save the job."); return; }
      setForm(BLANK);
      setShowForm(false);
      await load();
      if (data.similar && data.similar.length > 0) setDupSimilar(data.similar);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await fetch(`/api/jobs/${encodeURIComponent(deleteTarget.id)}`, { method: "DELETE" });
      setDeleteTarget(null);
      await load();
    } finally {
      setDeleting(false);
    }
  }

  function tailorFromJob(job) {
    router.push(`/?job=${encodeURIComponent(job.id)}`);
  }

  const fitFor = useCallback(
    (job) => (baseResume.trim() && job.jobDescription ? computeJobFit(baseResume, job.jobDescription).overall : undefined),
    [baseResume]
  );

  const filtered = useMemo(() => {
    if (!jobs) return [];
    let list = jobs.filter((j) => jobMatchesQuery(j, query));
    if (status !== "all") list = list.filter((j) => j.status === status);
    if (priority !== "all") list = list.filter((j) => j.priority === priority);
    return sortJobs(list, sort);
  }, [jobs, query, status, priority, sort]);

  const selectClass = "rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500";
  const inputClass = "w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500";

  return (
    <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Job Library</h1>
          <p className="mt-1 max-w-2xl text-sm text-slate-600">
            Save opportunities before tailoring. Optionally set a base resume to see a fit score on each job.
          </p>
        </div>
        <button onClick={() => setShowForm((s) => !s)} className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-slate-700">
          {showForm ? "Close" : "+ Save a job"}
        </button>
      </div>

      {error && <p className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">{error}</p>}

      {showForm && (
        <form onSubmit={submitJob} className="mb-6 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <input className={inputClass} placeholder="Company" value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} />
            <input className={inputClass} placeholder="Role / job title" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} />
            <input className={inputClass} placeholder="Location" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} />
            <input className={inputClass} placeholder="Work mode (Remote/Hybrid/Onsite)" value={form.workMode} onChange={(e) => setForm({ ...form, workMode: e.target.value })} />
            <input className={inputClass} placeholder="Job URL" value={form.jobUrl} onChange={(e) => setForm({ ...form, jobUrl: e.target.value })} />
            <input className={inputClass} placeholder="Source (LinkedIn, referral…)" value={form.source} onChange={(e) => setForm({ ...form, source: e.target.value })} />
            <input className={inputClass} placeholder="Salary range" value={form.salaryRange} onChange={(e) => setForm({ ...form, salaryRange: e.target.value })} />
            <input className={inputClass} type="date" aria-label="Closing date" value={form.closingDate} onChange={(e) => setForm({ ...form, closingDate: e.target.value })} />
            <select className={selectClass} value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })} aria-label="Priority">
              {JOB_PRIORITIES.map((p) => <option key={p} value={p}>Priority: {p}</option>)}
            </select>
          </div>
          <textarea className={`${inputClass} mt-3 h-40 resize-y`} placeholder="Paste the job description here…" value={form.jobDescription} onChange={(e) => setForm({ ...form, jobDescription: e.target.value })} />
          <textarea className={`${inputClass} mt-3 h-20 resize-y`} placeholder="Notes (optional)" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
          <div className="mt-3 flex gap-2">
            <button type="submit" disabled={saving} className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-slate-700 disabled:opacity-50">
              {saving ? "Saving…" : "Save job"}
            </button>
            <button type="button" onClick={() => { setForm(BLANK); setShowForm(false); }} className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50">Cancel</button>
          </div>
        </form>
      )}

      <div className="mb-4 rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
        <button onClick={() => setShowBase((s) => !s)} className="text-sm font-medium text-slate-700">
          {baseResume.trim() ? "✓ Base resume set — used to score fit" : "Set a base resume to score fit (optional)"} {showBase ? "▲" : "▼"}
        </button>
        {showBase && (
          <textarea
            className={`${inputClass} mt-2 h-32 resize-y`}
            placeholder="Paste a base resume here. Stored only in your browser; used locally to compute a fit score per job."
            value={baseResume}
            onChange={(e) => saveBaseResume(e.target.value)}
          />
        )}
      </div>

      <div className="mb-6 flex flex-wrap items-center gap-2 rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
        <input type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search company, role, location…" className={`${selectClass} min-w-[200px] flex-1`} aria-label="Search jobs" />
        <select value={status} onChange={(e) => setStatus(e.target.value)} className={selectClass} aria-label="Filter by status">
          <option value="all">All statuses</option>
          {JOB_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        <select value={priority} onChange={(e) => setPriority(e.target.value)} className={selectClass} aria-label="Filter by priority">
          <option value="all">All priorities</option>
          {JOB_PRIORITIES.map((p) => <option key={p} value={p}>{p}</option>)}
        </select>
        <select value={sort} onChange={(e) => setSort(e.target.value)} className={selectClass} aria-label="Sort jobs">
          {JOB_SORTS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      </div>

      {loading ? (
        <DashboardLoadingState />
      ) : !jobs || jobs.length === 0 ? (
        <EmptyState title="No saved jobs yet" message="Save a job posting and it will appear here. You can tailor a resume to it any time." actionLabel="Save a job" onAction={() => setShowForm(true)} />
      ) : filtered.length === 0 ? (
        <EmptyState title="No jobs match your filters." message="Try adjusting your search or filters." actionLabel="Clear filters" onAction={() => { setQuery(""); setStatus("all"); setPriority("all"); }} />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((job) => (
            <JobCard key={job.id} job={job} fit={fitFor(job)} onTailor={tailorFromJob} onDelete={setDeleteTarget} />
          ))}
        </div>
      )}

      <DuplicateJobDialog open={!!dupSimilar} similar={dupSimilar} onDismiss={() => setDupSimilar(null)} />
      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete this job?"
        message={deleteTarget ? `Remove “${deleteTarget.role} — ${deleteTarget.company}” from your library. This does not affect any tailored applications.` : ""}
        confirmLabel="Delete Job"
        danger
        busy={deleting}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={confirmDelete}
      />
    </main>
  );
}
