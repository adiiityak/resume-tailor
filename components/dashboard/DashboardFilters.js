"use client";

import { STATUS_OPTIONS, SORT_OPTIONS } from "@/lib/dashboardShared";

export default function DashboardFilters({
  query, setQuery,
  status, setStatus,
  companyFilter, setCompanyFilter,
  dateFilter, setDateFilter,
  sort, setSort,
  view, setView,
  companies = [],
}) {
  const selectClass =
    "rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500";

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
      <div className="relative min-w-[200px] flex-1">
        <label htmlFor="dash-search" className="sr-only">Search company or role</label>
        <input
          id="dash-search"
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search company, role, location, status…"
          className={`w-full ${selectClass}`}
        />
      </div>

      <label htmlFor="dash-status" className="sr-only">Filter by status</label>
      <select id="dash-status" value={status} onChange={(e) => setStatus(e.target.value)} className={selectClass}>
        <option value="all">All Statuses</option>
        {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
      </select>

      <label htmlFor="dash-company" className="sr-only">Filter by company</label>
      <select id="dash-company" value={companyFilter} onChange={(e) => setCompanyFilter(e.target.value)} className={selectClass}>
        <option value="all">All Companies</option>
        {companies.map((c) => <option key={c.slug} value={c.slug}>{c.name}</option>)}
      </select>

      <label htmlFor="dash-date" className="sr-only">Filter by date</label>
      <input
        id="dash-date"
        type="date"
        value={dateFilter}
        onChange={(e) => setDateFilter(e.target.value)}
        className={selectClass}
        aria-label="Filter by application date"
      />

      <label htmlFor="dash-sort" className="sr-only">Sort applications</label>
      <select id="dash-sort" value={sort} onChange={(e) => setSort(e.target.value)} className={selectClass}>
        {SORT_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>

      <div className="inline-flex rounded-lg border border-slate-300 bg-white p-0.5 shadow-sm" role="group" aria-label="View toggle">
        {[
          { key: "company", label: "Company" },
          { key: "application", label: "Table" },
          { key: "kanban", label: "Kanban" },
        ].map((v) => (
          <button
            key={v.key}
            onClick={() => setView(v.key)}
            aria-pressed={view === v.key}
            className={`rounded-md px-3 py-1.5 text-sm font-medium transition ${view === v.key ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-100"}`}
          >
            {v.label}
          </button>
        ))}
      </div>
    </div>
  );
}
