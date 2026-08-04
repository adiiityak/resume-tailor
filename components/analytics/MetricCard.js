export default function MetricCard({ label, value, detail, definition }) {
  return (
    <article className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <h3 className="text-sm font-medium text-slate-700">{label}</h3>
      <p className="mt-2 text-2xl font-semibold tracking-tight text-slate-900">{value}</p>
      {detail && <p className="mt-2 text-sm text-slate-600">{detail}</p>}
      {definition && <p className="mt-3 border-t border-slate-100 pt-3 text-xs leading-5 text-slate-500">{definition}</p>}
    </article>
  );
}
