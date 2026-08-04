import { formatRate, rateDetail } from "@/lib/analytics/client";

const CAUSATION_NOTICE = "Patterns describe your current records. They do not prove that a resume design, profile, or match score caused an outcome.";

function Rate({ metric, label }) {
  return <span>{label}: {rateDetail(metric)} ({formatRate(metric)})</span>;
}

export default function MatchScorePatterns({ data = [] }) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm" aria-labelledby="match-score-patterns-title">
      <h2 id="match-score-patterns-title" className="text-lg font-semibold text-slate-900">Match-score patterns</h2>
      <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-600">{CAUSATION_NOTICE}</p>
      {data.length ? (
        <>
          <div className="mt-4 hidden overflow-x-auto md:block">
            <table className="min-w-full text-left text-sm">
              <thead className="border-b border-slate-200 text-xs font-semibold uppercase tracking-wide text-slate-600">
                <tr>
                  <th scope="col" className="px-3 py-2">Score band</th><th scope="col" className="px-3 py-2 text-right">Applications</th><th scope="col" className="px-3 py-2 text-right">Responses</th><th scope="col" className="px-3 py-2 text-right">Response rate</th><th scope="col" className="px-3 py-2 text-right">Interviews</th><th scope="col" className="px-3 py-2 text-right">Interview rate</th>
                </tr>
              </thead>
              <tbody>
                {data.map((row) => <tr key={row.label} className="border-b border-slate-100 text-slate-700"><th scope="row" className="px-3 py-3 font-medium text-slate-900">{row.label}</th><td className="px-3 py-3 text-right">{row.submitted}</td><td className="px-3 py-3 text-right">{row.responses}</td><td className="px-3 py-3 text-right">{rateDetail(row.responseRate)} · {formatRate(row.responseRate)}</td><td className="px-3 py-3 text-right">{row.interviews}</td><td className="px-3 py-3 text-right">{rateDetail(row.interviewRate)} · {formatRate(row.interviewRate)}</td></tr>)}
              </tbody>
            </table>
          </div>
          <div className="mt-4 space-y-3 md:hidden">
            {data.map((row) => <article key={row.label} className="rounded-lg border border-slate-200 p-4"><h3 className="font-semibold text-slate-900">{row.label}</h3><dl className="mt-3 space-y-2 text-sm text-slate-700"><div className="flex justify-between gap-3"><dt>Applications</dt><dd>{row.submitted}</dd></div><div className="flex justify-between gap-3"><dt>Responses</dt><dd>{row.responses}</dd></div><div><dt className="font-medium">Response rate</dt><dd><Rate metric={row.responseRate} label="Submitted applications" /></dd></div><div className="flex justify-between gap-3"><dt>Interviews</dt><dd>{row.interviews}</dd></div><div><dt className="font-medium">Interview rate</dt><dd><Rate metric={row.interviewRate} label="Submitted applications" /></dd></div></dl></article>)}
          </div>
        </>
      ) : <p className="mt-3 text-sm text-slate-600">No submitted applications with a numeric match score are available for these patterns.</p>}
    </section>
  );
}
