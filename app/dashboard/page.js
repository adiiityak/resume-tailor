"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import DashboardHeader from "@/components/dashboard/DashboardHeader";
import DashboardStats from "@/components/dashboard/DashboardStats";
import DashboardFilters from "@/components/dashboard/DashboardFilters";
import CompanyGrid from "@/components/dashboard/CompanyGrid";
import RecentApplications from "@/components/dashboard/RecentApplications";
import ApplicationTable from "@/components/dashboard/ApplicationTable";
import ApplicationPipeline from "@/components/dashboard/ApplicationPipeline";
import EmptyState from "@/components/dashboard/EmptyState";
import DashboardLoadingState from "@/components/dashboard/DashboardLoadingState";
import DeleteApplicationDialog from "@/components/dashboard/DeleteApplicationDialog";
import RemindersPanel from "@/components/dashboard/RemindersPanel";
import { sortApplications, matchesQuery } from "@/lib/dashboardShared";

export default function DashboardPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("all");
  const [companyFilter, setCompanyFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState("");
  const [sort, setSort] = useState("newest");
  const [view, setView] = useState("company");

  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(async () => {
    setError("");
    try {
      const res = await fetch("/api/applications");
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Unable to read history folder.");
      setData(json);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const allApps = useMemo(
    () => (data?.companies || []).flatMap((c) => c.applications),
    [data]
  );

  const filteredApps = useMemo(() => {
    let apps = allApps;
    if (query) apps = apps.filter((a) => matchesQuery(a, query));
    if (status !== "all") apps = apps.filter((a) => a.status === status);
    if (companyFilter !== "all") apps = apps.filter((a) => a.companySlug === companyFilter);
    if (dateFilter) apps = apps.filter((a) => a.applicationDate === dateFilter);
    return sortApplications(apps, sort);
  }, [allApps, query, status, companyFilter, dateFilter, sort]);

  const filteredCompanies = useMemo(() => {
    const map = new Map();
    for (const app of filteredApps) {
      if (!map.has(app.companySlug)) {
        map.set(app.companySlug, { name: app.company, slug: app.companySlug, applications: [] });
      }
      map.get(app.companySlug).applications.push(app);
    }
    return [...map.values()].map((c) => {
      const lastUpdated = c.applications.map((a) => a.updatedAt || a.createdAt).sort().slice(-1)[0] || null;
      return {
        ...c,
        applicationCount: c.applications.length,
        lastUpdated,
        recentRoles: [...new Set(c.applications.map((a) => a.role))].slice(0, 3),
      };
    }).sort((a, b) => (b.lastUpdated || "").localeCompare(a.lastUpdated || ""));
  }, [filteredApps]);

  const hasFilters = query || status !== "all" || companyFilter !== "all" || dateFilter;

  function clearFilters() {
    setQuery(""); setStatus("all"); setCompanyFilter("all"); setDateFilter(""); setSort("newest");
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await fetch(`/api/applications/${encodeURIComponent(deleteTarget.id)}`, { method: "DELETE" });
      setDeleteTarget(null);
      await load();
    } catch {
      /* keep dialog open on failure */
    } finally {
      setDeleting(false);
    }
  }

  if (loading) {
    return (
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6 lg:px-8">
        <DashboardHeader />
        <DashboardLoadingState />
      </main>
    );
  }

  const noHistory = !allApps.length;

  return (
    <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6 lg:px-8">
      <DashboardHeader />

      {error && (
        <p className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">{error}</p>
      )}

      {noHistory ? (
        <EmptyState
          title="No applications yet"
          message="Tailor your first resume and it will appear here automatically."
          actionLabel="Create Your First Tailored Resume"
          actionHref="/"
        />
      ) : (
        <>
          <div className="mb-6">
            <DashboardStats summary={data.summary} />
          </div>

          <div className="mb-8">
            <RemindersPanel applications={allApps} />
          </div>

          {data.summary?.corrupted > 0 && (
            <p className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-2 text-sm text-amber-700">
              {data.summary.corrupted} saved application{data.summary.corrupted === 1 ? "" : "s"} could not be loaded and were skipped.
            </p>
          )}

          <div className="mb-6">
            <DashboardFilters
              query={query} setQuery={setQuery}
              status={status} setStatus={setStatus}
              companyFilter={companyFilter} setCompanyFilter={setCompanyFilter}
              dateFilter={dateFilter} setDateFilter={setDateFilter}
              sort={sort} setSort={setSort}
              view={view} setView={setView}
              companies={data.companies}
            />
          </div>

          {filteredApps.length === 0 ? (
            <EmptyState
              title="No applications match your search."
              message="Try adjusting or clearing your filters."
              actionLabel="Clear Filters"
              onAction={clearFilters}
            />
          ) : view === "company" ? (
            <div className="space-y-10">
              <CompanyGrid companies={filteredCompanies} />
              <RecentApplications applications={filteredApps.slice(0, 8)} onDelete={setDeleteTarget} />
            </div>
          ) : view === "kanban" ? (
            <ApplicationPipeline applications={filteredApps} onChanged={load} />
          ) : (
            <ApplicationTable applications={filteredApps} showTime onDelete={setDeleteTarget} />
          )}
        </>
      )}

      <DeleteApplicationDialog
        open={!!deleteTarget}
        application={deleteTarget}
        busy={deleting}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={confirmDelete}
      />
    </main>
  );
}
