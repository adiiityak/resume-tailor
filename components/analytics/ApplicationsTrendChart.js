function countFor(row) {
  return Number.isFinite(row?.count) ? row.count : 0;
}

export default function ApplicationsTrendChart({ data = [] }) {
  if (!data.length) {
    return (
      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm" aria-labelledby="applications-trend-title">
        <h2 id="applications-trend-title" className="text-lg font-semibold text-slate-900">Applications over time</h2>
        <p className="mt-3 text-sm text-slate-600">No submitted applications in this range.</p>
      </section>
    );
  }

  const width = 600;
  const height = 220;
  const padding = 28;
  const total = data.reduce((sum, row) => sum + countFor(row), 0);
  const maxCount = Math.max(...data.map(countFor), 1);
  const usableWidth = width - padding * 2;
  const usableHeight = height - padding * 2;
  const points = data.map((row, index) => {
    const x = padding + (data.length === 1 ? usableWidth / 2 : (index / (data.length - 1)) * usableWidth);
    const y = height - padding - (countFor(row) / maxCount) * usableHeight;
    return `${x},${y}`;
  }).join(" ");
  const ariaLabel = `${total} submitted applications across ${data.length} period${data.length === 1 ? "" : "s"}.`;

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm" aria-labelledby="applications-trend-title">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 id="applications-trend-title" className="text-lg font-semibold text-slate-900">Applications over time</h2>
        <p className="text-sm text-slate-600">{total} submitted</p>
      </div>
      <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label={ariaLabel} className="mt-4 h-52 w-full overflow-visible">
        <line x1={padding} x2={width - padding} y1={height - padding} y2={height - padding} stroke="#cbd5e1" strokeWidth="1" />
        <polyline points={points} fill="none" stroke="#2563eb" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
        {data.map((row, index) => {
          const [x, y] = points.split(" ")[index].split(",");
          return <circle key={row.period || index} cx={x} cy={y} r="4" fill="#2563eb" />;
        })}
      </svg>
      <div className="mt-4 overflow-x-auto" data-analytics-fallback>
        <table className="min-w-full text-left text-sm">
          <thead className="border-b border-slate-200 text-xs font-semibold uppercase tracking-wide text-slate-600">
            <tr><th scope="col" className="px-3 py-2">Week</th><th scope="col" className="px-3 py-2 text-right">Submitted</th></tr>
          </thead>
          <tbody>
            {data.map((row, index) => <tr key={row.period || index} className="border-b border-slate-100 text-slate-700"><th scope="row" className="px-3 py-2 font-medium">{row.period}</th><td className="px-3 py-2 text-right">{countFor(row)}</td></tr>)}
          </tbody>
        </table>
      </div>
    </section>
  );
}
