"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import ApplicationTabs from "@/components/dashboard/ApplicationTabs";
import DeleteApplicationDialog from "@/components/dashboard/DeleteApplicationDialog";
import DashboardLoadingState from "@/components/dashboard/DashboardLoadingState";
import EmptyState from "@/components/dashboard/EmptyState";

export default function ApplicationDetailPage() {
  const params = useParams();
  const router = useRouter();
  const applicationId = params.applicationId;

  const [app, setApp] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showDelete, setShowDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(async () => {
    setError("");
    try {
      const res = await fetch(`/api/applications/${encodeURIComponent(applicationId)}?full=1`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Application folder not found.");
      setApp(json);
    } catch (err) {
      setError(err.message);
      setApp(null);
    } finally {
      setLoading(false);
    }
  }, [applicationId]);

  useEffect(() => { load(); }, [load]);

  function handleStatusChange(next) {
    setApp((prev) => (prev ? { ...prev, status: next } : prev));
  }

  async function handleDuplicate() {
    try {
      const res = await fetch(`/api/applications/${encodeURIComponent(applicationId)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "duplicate" }),
      });
      const json = await res.json();
      if (res.ok) router.push(`/dashboard/application/${encodeURIComponent(json.application.id)}`);
    } catch {
      /* non-fatal */
    }
  }

  async function confirmDelete() {
    setDeleting(true);
    try {
      await fetch(`/api/applications/${encodeURIComponent(applicationId)}`, { method: "DELETE" });
      const slug = app?.companySlug;
      router.push(slug ? `/dashboard/company/${encodeURIComponent(slug)}` : "/dashboard");
    } catch {
      setDeleting(false);
    }
  }

  return (
    <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8 sm:px-6 lg:px-8">
      <nav className="mb-4 text-sm text-slate-500" aria-label="Breadcrumb">
        <Link href="/dashboard" className="hover:text-slate-800">Dashboard</Link>
        <span className="mx-1.5">/</span>
        {app ? (
          <>
            <Link href={`/dashboard/company/${encodeURIComponent(app.companySlug)}`} className="hover:text-slate-800">{app.company}</Link>
            <span className="mx-1.5">/</span>
            <span className="text-slate-800">{app.role}</span>
          </>
        ) : (
          <span className="text-slate-800">Application</span>
        )}
      </nav>

      {loading ? (
        <DashboardLoadingState />
      ) : error || !app ? (
        <EmptyState
          title="Application folder not found."
          message={error || "This application could not be loaded."}
          actionLabel="Back to Dashboard"
          actionHref="/dashboard"
        />
      ) : (
        <>
          <header className="mb-6">
            <h1 className="text-2xl font-semibold tracking-tight text-slate-900">{app.role}</h1>
            <p className="mt-1 text-sm text-slate-600">{app.company}</p>
          </header>

          <ApplicationTabs
            app={app}
            onStatusChange={handleStatusChange}
            onDuplicate={handleDuplicate}
            onDelete={() => setShowDelete(true)}
          />
        </>
      )}

      <DeleteApplicationDialog
        open={showDelete}
        application={app}
        busy={deleting}
        onCancel={() => setShowDelete(false)}
        onConfirm={confirmDelete}
      />
    </main>
  );
}
