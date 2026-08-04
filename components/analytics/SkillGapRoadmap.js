"use client";

import { useState } from "react";
import EvidenceBadge from "./EvidenceBadge";
import SkillGapEditor from "./SkillGapEditor";

const focusClass = "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2";

function RelatedJobs({ jobs = [] }) {
  if (!jobs.length) return <span>—</span>;
  return <ul className="space-y-1">{jobs.map((job) => <li key={job.id || `${job.company}-${job.role}`}>{[job.company, job.role].filter(Boolean).join(" — ") || job.id}</li>)}</ul>;
}

function EditButton({ onClick }) {
  return <button type="button" onClick={onClick} className={`rounded-lg border border-blue-700 bg-white px-3 py-1.5 text-sm font-medium text-blue-700 hover:bg-blue-50 ${focusClass}`}>Edit</button>;
}

export default function SkillGapRoadmap({ records = [], updatingId, onUpdate }) {
  const [editingId, setEditingId] = useState(null);
  const editingRecord = records.find((record) => record.id === editingId);

  function save(patch) {
    if (editingRecord) onUpdate(editingRecord.id, patch);
  }

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm" aria-labelledby="skill-gap-roadmap-title">
      <h2 id="skill-gap-roadmap-title" className="text-lg font-semibold text-slate-900">Skill-gap roadmap</h2>
      <p className="mt-1 text-sm leading-6 text-slate-600">Review repeated requirements and update your own learning plan. Evidence comes only from verified records.</p>
      {records.length ? <><div className="mt-4 hidden overflow-x-auto md:block"><table className="min-w-full text-left text-sm"><thead className="border-b border-slate-200 text-xs font-semibold uppercase tracking-wide text-slate-600"><tr><th scope="col" className="px-3 py-2">Skill</th><th scope="col" className="px-3 py-2 text-right">Frequency</th><th scope="col" className="px-3 py-2">Importance</th><th scope="col" className="px-3 py-2">Evidence</th><th scope="col" className="px-3 py-2">Learning status</th><th scope="col" className="px-3 py-2">Notes</th><th scope="col" className="px-3 py-2">Related jobs</th><th scope="col" className="px-3 py-2">Portfolio opportunity</th><th scope="col" className="px-3 py-2"><span className="sr-only">Actions</span></th></tr></thead><tbody>{records.map((record) => <tr key={record.id} className="border-b border-slate-100 align-top text-slate-700"><th scope="row" className="px-3 py-3 font-medium text-slate-900">{record.skill}</th><td className="px-3 py-3 text-right">{record.frequency}</td><td className="px-3 py-3">{record.importance}</td><td className="px-3 py-3"><EvidenceBadge level={record.evidenceLevel} /></td><td className="px-3 py-3">{record.learningStatus}</td><td className="max-w-48 px-3 py-3">{record.notes || "—"}</td><td className="px-3 py-3"><RelatedJobs jobs={record.relatedJobs} /></td><td className="max-w-48 px-3 py-3">{record.portfolioOpportunity || "—"}</td><td className="px-3 py-3"><EditButton onClick={() => setEditingId(record.id)} /></td></tr>)}</tbody></table></div><div className="mt-4 space-y-3 md:hidden">{records.map((record) => <article key={record.id} className="rounded-lg border border-slate-200 p-4"><div className="flex items-start justify-between gap-3"><h3 className="font-semibold text-slate-900">{record.skill}</h3><EditButton onClick={() => setEditingId(record.id)} /></div><dl className="mt-3 space-y-2 text-sm text-slate-700"><div className="flex justify-between gap-3"><dt>Frequency</dt><dd>{record.frequency}</dd></div><div className="flex justify-between gap-3"><dt>Importance</dt><dd>{record.importance}</dd></div><div><dt className="mb-1">Evidence</dt><dd><EvidenceBadge level={record.evidenceLevel} /></dd></div><div className="flex justify-between gap-3"><dt>Learning status</dt><dd>{record.learningStatus}</dd></div><div><dt className="font-medium">Notes</dt><dd>{record.notes || "—"}</dd></div><div><dt className="font-medium">Related jobs</dt><dd><RelatedJobs jobs={record.relatedJobs} /></dd></div><div><dt className="font-medium">Portfolio opportunity</dt><dd>{record.portfolioOpportunity || "—"}</dd></div></dl></article>)}</div></> : <p className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">No skill gaps are available for the current records.</p>}
      {editingRecord && <div className="mt-5"><SkillGapEditor key={editingRecord.id} record={editingRecord} saving={updatingId === editingRecord.id} error={null} onSave={save} onCancel={() => setEditingId(null)} /></div>}
    </section>
  );
}
