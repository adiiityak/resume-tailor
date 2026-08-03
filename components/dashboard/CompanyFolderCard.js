import Link from "next/link";
import { formatDate } from "@/lib/dashboardShared";

export default function CompanyFolderCard({ company }) {
  return (
    <Link
      href={`/dashboard/company/${encodeURIComponent(company.slug)}`}
      className="group flex flex-col rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-500"
    >
      <div className="mb-3 flex items-start justify-between">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-100 text-slate-500" aria-hidden="true">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7Z" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
        <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-600">
          {company.applicationCount} {company.applicationCount === 1 ? "application" : "applications"}
        </span>
      </div>

      <h3 className="text-base font-semibold text-slate-900">{company.name}</h3>
      <p className="mt-0.5 text-xs text-slate-400">Last updated {formatDate(company.lastUpdated)}</p>

      <ul className="mt-3 space-y-1">
        {company.recentRoles.map((role, i) => (
          <li key={i} className="truncate text-sm text-slate-600">{role}</li>
        ))}
      </ul>

      <span className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-slate-900">
        Open Company
        <span className="transition-transform group-hover:translate-x-0.5" aria-hidden="true">→</span>
      </span>
    </Link>
  );
}
