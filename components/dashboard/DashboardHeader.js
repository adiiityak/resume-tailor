import Link from "next/link";

export default function DashboardHeader() {
  return (
    <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Application Dashboard</h1>
        <p className="mt-1 max-w-2xl text-sm text-slate-600">
          Manage your tailored resumes, cover letters, job descriptions, and application history.
        </p>
      </div>
      <Link
        href="/"
        className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-slate-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-500"
      >
        <span aria-hidden="true">+</span> New Tailoring
      </Link>
    </div>
  );
}
