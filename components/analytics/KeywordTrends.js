"use client";

import { useMemo, useState } from "react";
import { filterKeywordTrends, formatRate, keywordTrendsEmptyMessage } from "@/lib/analytics/client";
import EvidenceBadge from "./EvidenceBadge";

const focusClass = "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2";
const controlClass = `min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 ${focusClass}`;

export default function KeywordTrends({ trends = [], analyzedJobDescriptions }) {
  const [category, setCategory] = useState("");
  const [evidenceLevel, setEvidenceLevel] = useState("");
  const categories = [...new Set(trends.map((trend) => trend.category).filter(Boolean))];
  const evidenceLevels = [...new Set(trends.map((trend) => trend.evidenceLevel).filter(Boolean))];
  const filtered = useMemo(() => filterKeywordTrends(trends, { category, evidenceLevel }), [trends, category, evidenceLevel]);
  const emptyMessage = keywordTrendsEmptyMessage({
    analyzedJobDescriptions,
    trendCount: trends.length,
    filteredCount: filtered.length,
  });

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm" aria-labelledby="keyword-trends-title">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 id="keyword-trends-title" className="text-lg font-semibold text-slate-900">Keyword trends</h2>
          <p className="mt-1 text-sm text-slate-600">Terms are ordered by the backend result for the current filters.</p>
        </div>
        <div className="grid w-full gap-3 sm:w-auto sm:grid-cols-2">
          <div>
            <label htmlFor="keyword-trends-category" className="mb-1 block text-sm font-medium text-slate-700">Category</label>
            <select id="keyword-trends-category" value={category} onChange={(event) => setCategory(event.target.value)} className={controlClass}>
              <option value="">All categories</option>
              {categories.map((value) => <option key={value} value={value}>{value}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="keyword-trends-evidence" className="mb-1 block text-sm font-medium text-slate-700">Evidence level</label>
            <select id="keyword-trends-evidence" value={evidenceLevel} onChange={(event) => setEvidenceLevel(event.target.value)} className={controlClass}>
              <option value="">All evidence levels</option>
              {evidenceLevels.map((value) => <option key={value} value={value}>{value}</option>)}
            </select>
          </div>
        </div>
      </div>
      {filtered.length ? (
        <>
          <div className="mt-4 hidden overflow-x-auto md:block">
            <table className="min-w-full text-left text-sm">
              <thead className="border-b border-slate-200 text-xs font-semibold uppercase tracking-wide text-slate-600">
                <tr><th scope="col" className="px-3 py-2">Term</th><th scope="col" className="px-3 py-2">Category</th><th scope="col" className="px-3 py-2 text-right">Frequency</th><th scope="col" className="px-3 py-2 text-right">Percentage</th><th scope="col" className="px-3 py-2">Evidence</th></tr>
              </thead>
              <tbody>
                {filtered.map((trend) => <tr key={trend.slug || trend.term} className="border-b border-slate-100 text-slate-700"><th scope="row" className="px-3 py-3 font-medium text-slate-900">{trend.term}</th><td className="px-3 py-3">{trend.category}</td><td className="px-3 py-3 text-right">{trend.count}</td><td className="px-3 py-3 text-right">{formatRate({ value: trend.percentage })}</td><td className="px-3 py-3"><EvidenceBadge level={trend.evidenceLevel} /></td></tr>)}
              </tbody>
            </table>
          </div>
          <div className="mt-4 space-y-3 md:hidden">
            {filtered.map((trend) => <article key={trend.slug || trend.term} className="rounded-lg border border-slate-200 p-4"><h3 className="font-semibold text-slate-900">{trend.term}</h3><dl className="mt-3 space-y-2 text-sm text-slate-700"><div className="flex justify-between gap-3"><dt>Category</dt><dd>{trend.category}</dd></div><div className="flex justify-between gap-3"><dt>Frequency</dt><dd>{trend.count}</dd></div><div className="flex justify-between gap-3"><dt>Percentage</dt><dd>{formatRate({ value: trend.percentage })}</dd></div><div><dt className="mb-1">Evidence</dt><dd><EvidenceBadge level={trend.evidenceLevel} /></dd></div></dl></article>)}
          </div>
        </>
      ) : (
        <p className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700" role="status">{emptyMessage}</p>
      )}
    </section>
  );
}
