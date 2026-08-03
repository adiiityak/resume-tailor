import Link from "next/link";

export default function PlannedPage({ title, phase, description, features = [], children }) {
  return (
    <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-6 flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">{title}</h1>
        {phase && (
          <span className="rounded-full border border-slate-200 bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-500">
            Planned · {phase}
          </span>
        )}
      </div>
      {description && <p className="mb-6 max-w-2xl text-sm text-slate-600">{description}</p>}

      {children}

      {features.length > 0 && (
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="mb-3 text-sm font-medium text-slate-700">What this section will include</h2>
          <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {features.map((f) => (
              <li key={f} className="flex items-start gap-2 text-sm text-slate-600">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-slate-300" aria-hidden="true" />
                {f}
              </li>
            ))}
          </ul>
        </div>
      )}

      <p className="mt-6 text-sm text-slate-500">
        In the meantime, head to the{" "}
        <Link href="/dashboard" className="font-medium text-slate-900 underline">Dashboard</Link> or{" "}
        <Link href="/" className="font-medium text-slate-900 underline">Resume Tailor</Link>, which are live now.
      </p>
    </main>
  );
}
