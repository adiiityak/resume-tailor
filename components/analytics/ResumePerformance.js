"use client";

import { useState } from "react";
import { formatRate, rateDetail } from "@/lib/analytics/client";

const GROUPS = [
  ["variants", "Variants"],
  ["profiles", "Profiles"],
  ["versions", "Versions"],
  ["modes", "Modes"],
];
const MINIMUM_DATA_WARNING = "Not enough applications to identify a reliable pattern.";
const CAUSATION_NOTICE = "Patterns describe your current records. They do not prove that a resume design, profile, or match score caused an outcome.";
const focusClass = "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2";

function warningFor(row) {
  if (row?.warning === MINIMUM_DATA_WARNING) return MINIMUM_DATA_WARNING;
  return typeof row?.warning === "string" ? row.warning : null;
}

function PerformanceRows({ rows }) {
  if (!rows.length) return <p className="mt-4 text-sm text-slate-600">No submitted applications are available for this grouping.</p>;

  return (
    <>
      <div className="mt-4 hidden overflow-x-auto md:block">
        <table className="min-w-full text-left text-sm">
          <thead className="border-b border-slate-200 text-xs font-semibold uppercase tracking-wide text-slate-600"><tr><th scope="col" className="px-3 py-2">Group</th><th scope="col" className="px-3 py-2 text-right">Submitted</th><th scope="col" className="px-3 py-2 text-right">Interview progression</th><th scope="col" className="px-3 py-2 text-right">Offer progression</th><th scope="col" className="px-3 py-2">Data note</th></tr></thead>
          <tbody>{rows.map((row) => <tr key={row.key || row.label} className="border-b border-slate-100 text-slate-700"><th scope="row" className="px-3 py-3 font-medium text-slate-900">{row.label}</th><td className="px-3 py-3 text-right">{row.submitted}</td><td className="px-3 py-3 text-right">{rateDetail(row.interviewRate)} · {formatRate(row.interviewRate)}</td><td className="px-3 py-3 text-right">{rateDetail(row.offerRate)} · {formatRate(row.offerRate)}</td><td className="px-3 py-3 text-slate-600">{warningFor(row) || "—"}</td></tr>)}</tbody>
        </table>
      </div>
      <div className="mt-4 space-y-3 md:hidden">{rows.map((row) => <article key={row.key || row.label} className="rounded-lg border border-slate-200 p-4"><h3 className="font-semibold text-slate-900">{row.label}</h3><dl className="mt-3 space-y-2 text-sm text-slate-700"><div className="flex justify-between gap-3"><dt>Submitted</dt><dd>{row.submitted}</dd></div><div><dt className="font-medium">Interview progression</dt><dd>{rateDetail(row.interviewRate)} · {formatRate(row.interviewRate)}</dd></div><div><dt className="font-medium">Offer progression</dt><dd>{rateDetail(row.offerRate)} · {formatRate(row.offerRate)}</dd></div>{warningFor(row) && <div><dt className="font-medium">Data note</dt><dd>{warningFor(row)}</dd></div>}</dl></article>)}</div>
    </>
  );
}

export default function ResumePerformance({ data = {} }) {
  const [activeGroup, setActiveGroup] = useState("variants");
  const rows = Array.isArray(data[activeGroup]) ? data[activeGroup] : [];

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm" aria-labelledby="resume-performance-title">
      <h2 id="resume-performance-title" className="text-lg font-semibold text-slate-900">Resume performance</h2>
      <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-600">{CAUSATION_NOTICE}</p>
      <div className="mt-4 flex flex-wrap gap-2" aria-label="Resume performance grouping">
        {GROUPS.map(([key, label]) => <button key={key} type="button" onClick={() => setActiveGroup(key)} aria-pressed={activeGroup === key} className={`rounded-lg px-3 py-2 text-sm font-medium ${focusClass} ${activeGroup === key ? "bg-blue-700 text-white" : "border border-slate-300 bg-white text-slate-700 hover:bg-slate-50"}`}>{label}</button>)}
      </div>
      <p className="sr-only" aria-live="polite">Showing {GROUPS.find(([key]) => key === activeGroup)?.[1]} performance.</p>
      <PerformanceRows rows={rows} />
    </section>
  );
}
