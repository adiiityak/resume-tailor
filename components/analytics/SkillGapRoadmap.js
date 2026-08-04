"use client";

import { useMemo, useState } from "react";
import {
  createEmptySkillGapFilters,
  filterSkillGaps,
  skillGapFrequencyLabel,
} from "@/lib/analytics/client";
import EvidenceBadge from "./EvidenceBadge";
import SkillGapEditor from "./SkillGapEditor";

const EVIDENCE_OPTIONS = ["Strong", "Partial", "Weak", "None"];
const LEARNING_STATUS_OPTIONS = ["Not Started", "Learning", "Practising", "Used in Project", "Added to Portfolio", "Verified in Resume"];
const IMPORTANCE_OPTIONS = ["High", "Medium", "Low"];
const CATEGORY_OPTIONS = ["Skills", "Tools", "Responsibilities", "Seniority", "Soft Skills", "Domain Knowledge"];
const focusClass = "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2";
const controlClass = `min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 ${focusClass}`;

function RelatedJobs({ jobs = [] }) {
  if (!jobs.length) return <span>—</span>;
  return <ul className="space-y-1">{jobs.map((job) => <li key={job.id || `${job.company}-${job.role}`}>{[job.company, job.role].filter(Boolean).join(" — ") || job.id}</li>)}</ul>;
}

function EditButton({ onClick }) {
  return <button type="button" onClick={onClick} className={`inline-flex min-h-11 min-w-11 items-center justify-center rounded-lg border border-blue-700 bg-white px-3 py-1.5 text-sm font-medium text-blue-700 hover:bg-blue-50 ${focusClass}`}>Edit</button>;
}

function FrequencyLabel({ frequency }) {
  const label = skillGapFrequencyLabel(frequency);
  if (!label) return <span>—</span>;
  return <span className={`inline-flex rounded-full border px-2 py-0.5 text-xs font-medium ${label === "Emerging" ? "border-amber-200 bg-amber-50 text-amber-800" : "border-violet-200 bg-violet-50 text-violet-800"}`}>{label}</span>;
}

function SelectFilter({ field, label, value, options, onChange }) {
  const id = `skill-gap-filter-${field}`;
  return (
    <div>
      <label htmlFor={id} className="mb-1 block text-sm font-medium text-slate-700">{label}</label>
      <select id={id} name={field} value={value} onChange={onChange} className={controlClass}>
        <option value="">All {label.toLowerCase()}</option>
        {options.map((option) => <option key={option} value={option}>{option}</option>)}
      </select>
    </div>
  );
}

export default function SkillGapRoadmap({ records = [], updatingId, onUpdate }) {
  const [editingId, setEditingId] = useState(null);
  const [filters, setFilters] = useState(createEmptySkillGapFilters);
  const filteredRecords = useMemo(() => filterSkillGaps(records, filters), [records, filters]);
  const editingRecord = records.find((record) => record.id === editingId);
  const hasActiveFilters = Object.values(filters).some(Boolean);

  function changeFilter(event) {
    const { name, value } = event.target;
    setFilters((current) => ({ ...current, [name]: value }));
  }

  function resetFilters() {
    setFilters(createEmptySkillGapFilters());
  }

  function save(patch) {
    if (editingRecord) onUpdate(editingRecord.id, patch);
  }

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm" aria-labelledby="skill-gap-roadmap-title">
      <h2 id="skill-gap-roadmap-title" className="text-lg font-semibold text-slate-900">Skill-gap roadmap</h2>
      <p className="mt-1 text-sm leading-6 text-slate-600">Review recurring and emerging requirements and update your own learning plan. Evidence comes only from verified records.</p>

      <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4" aria-label="Skill-gap roadmap filters">
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          <div className="sm:col-span-2 xl:col-span-1">
            <label htmlFor="skill-gap-filter-search" className="mb-1 block text-sm font-medium text-slate-700">Search roadmap</label>
            <input id="skill-gap-filter-search" name="search" type="search" value={filters.search} onChange={changeFilter} className={controlClass} placeholder="Search skills or notes" />
          </div>
          <SelectFilter field="evidenceLevel" label="Evidence level" value={filters.evidenceLevel} options={EVIDENCE_OPTIONS} onChange={changeFilter} />
          <SelectFilter field="learningStatus" label="Learning status" value={filters.learningStatus} options={LEARNING_STATUS_OPTIONS} onChange={changeFilter} />
          <SelectFilter field="importance" label="Importance" value={filters.importance} options={IMPORTANCE_OPTIONS} onChange={changeFilter} />
          <SelectFilter field="category" label="Category" value={filters.category} options={CATEGORY_OPTIONS} onChange={changeFilter} />
        </div>
        <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-slate-600" role="status" aria-live="polite">Showing {filteredRecords.length} of {records.length} roadmap items.</p>
          <button type="button" onClick={resetFilters} disabled={!hasActiveFilters} className={`min-h-11 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50 ${focusClass}`}>Reset roadmap filters</button>
        </div>
      </div>

      {records.length ? filteredRecords.length ? (
        <>
          <div className="mt-4 hidden overflow-x-auto md:block">
            <table className="min-w-full text-left text-sm">
              <thead className="border-b border-slate-200 text-xs font-semibold uppercase tracking-wide text-slate-600">
                <tr><th scope="col" className="px-3 py-2">Skill</th><th scope="col" className="px-3 py-2 text-right">Frequency</th><th scope="col" className="px-3 py-2">Pattern</th><th scope="col" className="px-3 py-2">Importance</th><th scope="col" className="px-3 py-2">Evidence</th><th scope="col" className="px-3 py-2">Learning status</th><th scope="col" className="px-3 py-2">Notes</th><th scope="col" className="px-3 py-2">Related jobs</th><th scope="col" className="px-3 py-2">Portfolio opportunity</th><th scope="col" className="px-3 py-2"><span className="sr-only">Actions</span></th></tr>
              </thead>
              <tbody>
                {filteredRecords.map((record) => <tr key={record.id} className="border-b border-slate-100 align-top text-slate-700"><th scope="row" className="px-3 py-3 font-medium text-slate-900">{record.skill}</th><td className="px-3 py-3 text-right">{record.frequency}</td><td className="px-3 py-3"><FrequencyLabel frequency={record.frequency} /></td><td className="px-3 py-3">{record.importance}</td><td className="px-3 py-3"><EvidenceBadge level={record.evidenceLevel} /></td><td className="px-3 py-3">{record.learningStatus}</td><td className="max-w-48 px-3 py-3">{record.notes || "—"}</td><td className="px-3 py-3"><RelatedJobs jobs={record.relatedJobs} /></td><td className="max-w-48 px-3 py-3">{record.portfolioOpportunity || "—"}</td><td className="px-3 py-3"><EditButton onClick={() => setEditingId(record.id)} /></td></tr>)}
              </tbody>
            </table>
          </div>
          <div className="mt-4 space-y-3 md:hidden">
            {filteredRecords.map((record) => <article key={record.id} className="rounded-lg border border-slate-200 p-4"><div className="flex items-start justify-between gap-3"><div><h3 className="font-semibold text-slate-900">{record.skill}</h3><div className="mt-2"><FrequencyLabel frequency={record.frequency} /></div></div><EditButton onClick={() => setEditingId(record.id)} /></div><dl className="mt-3 space-y-2 text-sm text-slate-700"><div className="flex justify-between gap-3"><dt>Frequency</dt><dd>{record.frequency}</dd></div><div className="flex justify-between gap-3"><dt>Importance</dt><dd>{record.importance}</dd></div><div className="flex justify-between gap-3"><dt>Category</dt><dd>{record.category}</dd></div><div><dt className="mb-1">Evidence</dt><dd><EvidenceBadge level={record.evidenceLevel} /></dd></div><div className="flex justify-between gap-3"><dt>Learning status</dt><dd>{record.learningStatus}</dd></div><div><dt className="font-medium">Notes</dt><dd>{record.notes || "—"}</dd></div><div><dt className="font-medium">Related jobs</dt><dd><RelatedJobs jobs={record.relatedJobs} /></dd></div><div><dt className="font-medium">Portfolio opportunity</dt><dd>{record.portfolioOpportunity || "—"}</dd></div></dl></article>)}
          </div>
        </>
      ) : (
        <p className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700" role="status">No skill gaps match these roadmap filters.</p>
      ) : (
        <p className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">No skill gaps are available for the current records.</p>
      )}
      {editingRecord && <div className="mt-5"><SkillGapEditor key={editingRecord.id} record={editingRecord} saving={updatingId === editingRecord.id} error={null} onSave={save} onCancel={() => setEditingId(null)} /></div>}
    </section>
  );
}
