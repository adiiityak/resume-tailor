import { formatMetricValue, formatRateWithDetail } from "@/lib/analytics/client";

const GROUPS = [
  { key: "roles", title: "By role", emptyLabel: "role" },
  { key: "companies", title: "By company", emptyLabel: "company" },
  { key: "sources", title: "By source", emptyLabel: "source" },
];

function Progression({ metric, singular, plural }) {
  const count = Number.isFinite(metric?.numerator) ? metric.numerator : null;
  const label = count === 1 ? singular : plural;
  return <span>{formatMetricValue(count)} {label} · {formatRateWithDetail(metric)}</span>;
}

function BreakdownGroup({ groupKey, title, emptyLabel, rows }) {
  const titleId = `application-breakdown-${groupKey}-title`;

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm" aria-labelledby={titleId}>
      <h3 id={titleId} className="text-base font-semibold text-slate-900">{title}</h3>
      {rows.length ? (
        <>
          <div className="mt-4 hidden overflow-x-auto md:block">
            <table className="min-w-full text-left text-sm">
              <thead className="border-b border-slate-200 text-xs font-semibold uppercase tracking-wide text-slate-600">
                <tr>
                  <th scope="col" className="px-3 py-2">Group</th>
                  <th scope="col" className="px-3 py-2 text-right">Records</th>
                  <th scope="col" className="px-3 py-2 text-right">Submitted</th>
                  <th scope="col" className="px-3 py-2 text-right">Response progression</th>
                  <th scope="col" className="px-3 py-2 text-right">Interview progression</th>
                  <th scope="col" className="px-3 py-2 text-right">Offer progression</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.key || row.label} className="border-b border-slate-100 text-slate-700">
                    <th scope="row" className="px-3 py-3 font-medium text-slate-900">{row.label}</th>
                    <td className="px-3 py-3 text-right">{formatMetricValue(row.count)}</td>
                    <td className="px-3 py-3 text-right">{formatMetricValue(row.submitted)}</td>
                    <td className="px-3 py-3 text-right"><Progression metric={row.responseRate} singular="response" plural="responses" /></td>
                    <td className="px-3 py-3 text-right"><Progression metric={row.interviewRate} singular="interview" plural="interviews" /></td>
                    <td className="px-3 py-3 text-right"><Progression metric={row.offerRate} singular="offer" plural="offers" /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-4 space-y-3 md:hidden">
            {rows.map((row) => (
              <article key={row.key || row.label} className="rounded-lg border border-slate-200 p-4">
                <h4 className="font-semibold text-slate-900">{row.label}</h4>
                <dl className="mt-3 space-y-2 text-sm text-slate-700">
                  <div className="flex justify-between gap-3"><dt>Records</dt><dd>{formatMetricValue(row.count)}</dd></div>
                  <div className="flex justify-between gap-3"><dt>Submitted</dt><dd>{formatMetricValue(row.submitted)}</dd></div>
                  <div><dt className="font-medium">Response progression</dt><dd><Progression metric={row.responseRate} singular="response" plural="responses" /></dd></div>
                  <div><dt className="font-medium">Interview progression</dt><dd><Progression metric={row.interviewRate} singular="interview" plural="interviews" /></dd></div>
                  <div><dt className="font-medium">Offer progression</dt><dd><Progression metric={row.offerRate} singular="offer" plural="offers" /></dd></div>
                </dl>
              </article>
            ))}
          </div>
        </>
      ) : (
        <p className="mt-3 text-sm text-slate-600">No {emptyLabel} breakdown is available for the current filters.</p>
      )}
    </section>
  );
}

export default function ApplicationBreakdowns({ breakdowns = {} }) {
  return (
    <section aria-labelledby="application-breakdowns-title">
      <div className="mb-4">
        <h2 id="application-breakdowns-title" className="text-lg font-semibold text-slate-900">Application breakdowns</h2>
        <p className="mt-1 text-sm leading-6 text-slate-600">Recorded outcome progressions are descriptive and do not identify what caused an outcome.</p>
      </div>
      <div className="space-y-6">
        {GROUPS.map((group) => (
          <BreakdownGroup
            key={group.key}
            groupKey={group.key}
            title={group.title}
            emptyLabel={group.emptyLabel}
            rows={Array.isArray(breakdowns[group.key]) ? breakdowns[group.key] : []}
          />
        ))}
      </div>
    </section>
  );
}
