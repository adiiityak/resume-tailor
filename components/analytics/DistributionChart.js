import { formatMetricValue, formatRate } from "@/lib/analytics/client";

function percentageFor(row) {
  return Number.isFinite(row?.percentage) ? Math.max(0, Math.min(100, row.percentage)) : 0;
}

function formatPercentage(row) {
  return formatRate({ value: row?.percentage });
}

export default function DistributionChart({ title, data = [] }) {
  const visualSummary = data.length ? data.map((row) => `${row.label}: ${formatMetricValue(row.count)} (${formatPercentage(row)})`).join(", ") : `No ${title?.toLowerCase() || "distribution"} data available.`;

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm" aria-labelledby="distribution-chart-title">
      <h2 id="distribution-chart-title" className="text-lg font-semibold text-slate-900">{title}</h2>
      {data.length ? (
        <>
          <div className="mt-4" role="img" aria-label={`${title} distribution: ${visualSummary}`}>
            <ul className="space-y-3" data-analytics-fallback>
              {data.map((row, index) => {
                const label = row.label || `Group ${index + 1}`;
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
          <p className="mt-4 text-sm text-slate-600">{data.length} {data.length === 1 ? "group is" : "groups are"} shown with their count and percentage.</p>
        </>
      ) : <p className="mt-3 text-sm text-slate-600" data-analytics-fallback>No distribution data available.</p>}
    </section>
  );
}
