function labelFor(key) {
  return String(key).replace(/([A-Z])/g, " $1").replace(/^./, (character) => character.toUpperCase());
}

export default function MetricDefinitions({ definitions = {} }) {
  const entries = Object.entries(definitions);
  if (!entries.length) return null;

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm" aria-labelledby="metric-definitions-title">
      <h2 id="metric-definitions-title" className="text-lg font-semibold text-slate-900">Metric definitions</h2>
      <dl className="mt-4 divide-y divide-slate-200">{entries.map(([term, definition]) => <div key={term} className="py-3 first:pt-0"><dt className="text-sm font-semibold text-slate-900">{labelFor(term)}</dt><dd className="mt-1 text-sm leading-6 text-slate-600">{definition}</dd></div>)}</dl>
    </section>
  );
}
