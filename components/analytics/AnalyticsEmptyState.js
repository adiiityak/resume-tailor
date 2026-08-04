export default function AnalyticsEmptyState({ title, message, actions = [] }) {
  return (
    <section className="rounded-xl border border-dashed border-slate-300 bg-white px-6 py-12 text-center shadow-sm" aria-labelledby="analytics-empty-title">
      <h2 id="analytics-empty-title" className="text-lg font-semibold text-slate-900">{title}</h2>
      <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-slate-600">{message}</p>
      {actions.length > 0 && (
        <nav className="mt-5 flex flex-wrap justify-center gap-3" aria-label="Analytics next steps">
          {actions.map((action) => <a key={action.href} href={action.href} className="inline-flex min-h-11 items-center justify-center rounded-lg bg-blue-700 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2">{action.label}</a>)}
        </nav>
      )}
    </section>
  );
}
