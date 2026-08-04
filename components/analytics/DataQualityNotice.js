function count(value) {
  return Number.isFinite(value) ? value : 0;
}

export default function DataQualityNotice({ dataQuality = {} }) {
  const warnings = Array.isArray(dataQuality.warnings) ? dataQuality.warnings.filter(Boolean) : [];
  const hasWarnings = warnings.length > 0;

  return (
    <section className={`rounded-xl border p-5 shadow-sm ${hasWarnings ? "border-amber-200 bg-amber-50" : "border-slate-200 bg-white"}`} aria-labelledby="data-quality-title">
      <h2 id="data-quality-title" className="text-lg font-semibold text-slate-900">Data quality</h2>
      <p className="mt-1 text-sm text-slate-600">These counts describe which records were available for the displayed metrics.</p>
      <dl className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4"><div className="rounded-lg border border-slate-200 bg-white p-3"><dt className="text-sm text-slate-600">Analyzed job descriptions</dt><dd className="mt-1 text-xl font-semibold text-slate-900">{count(dataQuality.analyzedJobDescriptions)}</dd></div><div className="rounded-lg border border-slate-200 bg-white p-3"><dt className="text-sm text-slate-600">Duplicate descriptions</dt><dd className="mt-1 text-xl font-semibold text-slate-900">{count(dataQuality.duplicateJobDescriptions)}</dd></div><div className="rounded-lg border border-slate-200 bg-white p-3"><dt className="text-sm text-slate-600">Excluded response records</dt><dd className="mt-1 text-xl font-semibold text-slate-900">{count(dataQuality.responseTimeExcluded)}</dd></div><div className="rounded-lg border border-slate-200 bg-white p-3"><dt className="text-sm text-slate-600">Corrupted records</dt><dd className="mt-1 text-xl font-semibold text-slate-900">{count(dataQuality.corruptedRecords)}</dd></div></dl>
      {hasWarnings && <div className="mt-4"><h3 className="text-sm font-semibold text-slate-900">Warnings</h3><ul className="mt-2 list-disc space-y-1 pl-5 text-sm leading-6 text-slate-700">{warnings.map((warning, index) => <li key={`${warning}-${index}`}>{warning}</li>)}</ul></div>}
    </section>
  );
}
