"use client";

import { useState } from "react";

const IMPORTANCE_OPTIONS = ["High", "Medium", "Low"];
const LEARNING_STATUS_OPTIONS = ["Not Started", "Learning", "Practising", "Used in Project", "Added to Portfolio", "Verified in Resume"];
const LEARNING_EVIDENCE_NOTICE = "Learning progress does not count as resume evidence. Add and approve real evidence in Master Resume or Achievements first.";
const focusClass = "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2";
const controlClass = `mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 ${focusClass}`;

export default function SkillGapEditor({ record, saving = false, error, onSave, onCancel }) {
  const [importance, setImportance] = useState(record?.importance || "Medium");
  const [learningStatus, setLearningStatus] = useState(record?.learningStatus || "Not Started");
  const [notes, setNotes] = useState(record?.notes || "");
  const [portfolioOpportunity, setPortfolioOpportunity] = useState(record?.portfolioOpportunity || "");
  const needsAllowedStatus = learningStatus === "Verified in Resume" && record.evidenceLevel !== "Strong";

  function submit(event) {
    event.preventDefault();
    if (needsAllowedStatus) return;
    onSave({ importance, learningStatus, notes, portfolioOpportunity });
  }

  return (
    <form onSubmit={submit} className="rounded-xl border border-slate-200 bg-slate-50 p-4" aria-labelledby="skill-gap-editor-title">
      <h3 id="skill-gap-editor-title" className="text-base font-semibold text-slate-900">Edit roadmap: {record.skill}</h3>
      <p className="mt-2 text-sm leading-6 text-slate-600">{LEARNING_EVIDENCE_NOTICE}</p>
      <fieldset disabled={saving} className="mt-4 grid gap-4 sm:grid-cols-2">
        <label htmlFor="skill-gap-importance" className="text-sm font-medium text-slate-700">Importance<select id="skill-gap-importance" value={importance} onChange={(event) => setImportance(event.target.value)} className={controlClass}>{IMPORTANCE_OPTIONS.map((value) => <option key={value} value={value}>{value}</option>)}</select></label>
        <label htmlFor="skill-gap-learningStatus" className="text-sm font-medium text-slate-700">Learning status<select id="skill-gap-learningStatus" value={learningStatus} onChange={(event) => setLearningStatus(event.target.value)} className={controlClass}>{LEARNING_STATUS_OPTIONS.map((value) => <option key={value} value={value} disabled={value === "Verified in Resume" && record.evidenceLevel !== "Strong"}>{value}</option>)}</select></label>
        <label htmlFor="skill-gap-notes" className="sm:col-span-2 text-sm font-medium text-slate-700">Notes<textarea id="skill-gap-notes" value={notes} onChange={(event) => setNotes(event.target.value)} className={`${controlClass} min-h-24 resize-y`} maxLength={4000} /></label>
        <label htmlFor="skill-gap-portfolioOpportunity" className="sm:col-span-2 text-sm font-medium text-slate-700">Portfolio opportunity<textarea id="skill-gap-portfolioOpportunity" value={portfolioOpportunity} onChange={(event) => setPortfolioOpportunity(event.target.value)} className={`${controlClass} min-h-20 resize-y`} maxLength={1000} /></label>
      </fieldset>
      {record.evidenceLevel !== "Strong" && <p className="mt-3 text-sm text-slate-600">Verified in Resume is unavailable until this skill has Strong evidence.</p>}
      {needsAllowedStatus && <p className="mt-3 text-sm font-medium text-amber-800">The saved status is no longer supported by this evidence level. Choose another learning status before saving.</p>}
      <div role="alert" aria-live="assertive" className="mt-3 text-sm text-red-700">{error || ""}</div>
      <div className="mt-4 flex flex-wrap gap-2"><button type="submit" disabled={saving || needsAllowedStatus} className={`rounded-lg bg-blue-700 px-4 py-2 text-sm font-medium text-white hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-60 ${focusClass}`}>{saving ? "Saving…" : "Save changes"}</button><button type="button" onClick={onCancel} disabled={saving} className={`rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60 ${focusClass}`}>Cancel</button></div>
    </form>
  );
}
