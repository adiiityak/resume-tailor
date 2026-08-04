export default function AnalyticsHeader() {
  return (
    <header className="flex flex-col gap-4 border-b border-slate-200 pb-6 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">Job-Search Analytics</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
          Transparent metrics calculated from your saved job-search records. Definitions and record counts stay visible.
        </p>
      </div>
      <p className="inline-flex w-fit items-center rounded-full border border-blue-200 bg-blue-50 px-3 py-1.5 text-sm font-medium text-blue-800">
        Local-first analysis
      </p>
    </header>
  );
}
