"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import ApplicationCard from "@/components/dashboard/ApplicationCard";
import DeleteApplicationDialog from "@/components/dashboard/DeleteApplicationDialog";
import DashboardLoadingState from "@/components/dashboard/DashboardLoadingState";
import EmptyState from "@/components/dashboard/EmptyState";
import { formatDate } from "@/lib/dashboardShared";

export default function CompanyDetailPage() {
  const params = useParams();
  const companySlug = params.companySlug;

  const [company, setCompany] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(async () => {
    setError("");
    try {
      const res = await fetch(`/api/companies/${encodeURIComponent(companySlug)}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Company not found.");
      setCompany(json);
    } catch (err) {
      setError(err.message);
      setCompany(null);
    } finally {
      setLoading(false);
    }
  }, [companySlug]);

  useEffect(() => { load(); }, [load]);

  const groupedByDate = useMemo(() => {
    if (!company) return [];
    const map = new Map();
    for (const app of company.applications) {
      const key = app.applicationDate || "Unknown date";
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(app);
    }
    return [...map.entries()]
      .sort((a, b) => b[0].localeCompare(a[0]))
      .map(([date, apps]) => ({ date, apps }));
  }, [company]);

  async function confirmDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await fetch(`/api/applications/${encodeURIComponent(deleteTarget.id)}`, { method: "DELETE" });
      setDeleteTarget(null);
      await load();
    } catch {
      /* keep dialog on failure */
    } finally {
      setDeleting(false);
    }
  }

  return (
    <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6 lg:px-8">
      <nav className="mb-4 text-sm text-slate-500" aria-label="Breadcrumb">
        <Link href="/dashboard" className="hover:text-slate-800">Dashboard</Link>
        <span className="mx-1.5">/</span>
        <span className="text-slate-800">{company?.name || companySlug}</span>
      </nav>

      {loading ? (
        <DashboardLoadingState />
      ) : error || !company ? (
        <EmptyState
          title="No valid applications were found in this folder."
          message={error || "This company folder has no readable applications."}
          actionLabel="Back to Dashboard"
          actionHref="/dashboard"
        />
      ) : (
        <>
          <header className="mb-6">
            <h1 className="text-2xl font-semibold tracking-tight text-slate-900">{company.name}</h1>
            <p className="mt-1 text-sm text-slate-600">
              {company.applicationCount} {company.applicationCount === 1 ? "application" : "applications"}
            </p>
          </header>

          <div className="space-y-8">
            {groupedByDate.map(({ date, apps }) => (
              <section key={date}>
                <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">
                  {formatDate(date)}
                </h2>
                <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                  {apps.map((app) => (
                    <ApplicationCard key={app.id} app={app} onDelete={setDeleteTarget} />
                  ))}
                </div>
              </section>
            ))}
          </div>
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
