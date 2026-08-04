import { formatMetricValue, formatRate } from "@/lib/analytics/client";

function percentageFor(row) {
  return Number.isFinite(row?.percentage) ? Math.max(0, Math.min(100, row.percentage)) : 0;
}

function formatPercentage(row) {
  return formatRate({ value: row?.percentage });
}

export default function PipelineConversionChart({ data = [] }) {
  const total = data[0]?.count || 0;
  const visualSummary = data.length ? data.map((row) => `${row.stage || row.label}: ${formatMetricValue(row.count)} (${formatPercentage(row)})`).join(", ") : "No pipeline data available.";

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm" aria-labelledby="pipeline-conversion-title">
      <h2 id="pipeline-conversion-title" className="text-lg font-semibold text-slate-900">Pipeline conversion</h2>
      <p className="mt-1 text-sm text-slate-600">Each stage is measured against submitted applications.</p>
      {data.length ? (
        <>
          <div className="mt-4" role="img" aria-label={`Pipeline conversion: ${visualSummary}`}>
            <ul className="space-y-3" data-analytics-fallback>
              {data.map((row, index) => {
                const label = row.stage || row.label || `Stage ${index + 1}`;
                const percentage = percentageFor(row);
                return (
                  <li key={label} className="space-y-1.5">
                    <div className="flex items-baseline justify-between gap-3 text-sm"><span className="font-medium text-slate-800">{label}</span><span className="text-slate-600">{formatMetricValue(row.count)} · {formatPercentage(row)}</span></div>
                    <div className="h-2 overflow-hidden rounded-full bg-slate-200" role="progressbar" aria-label={`${label}: ${formatPercentage(row)}`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Number.isFinite(row.percentage) ? percentage : undefined}>
                      <div className="h-full rounded-full bg-blue-700" style={{ width: `${percentage}%` }} />
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
          <p className="mt-4 text-sm text-slate-600">{total} submitted applications provide the pipeline baseline.</p>
        </>
      ) : <p className="mt-3 text-sm text-slate-600" data-analytics-fallback>No pipeline data available.</p>}
    </section>
  );
}
