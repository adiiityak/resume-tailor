"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import DashboardLoadingState from "@/components/dashboard/DashboardLoadingState";
import EmptyState from "@/components/dashboard/EmptyState";
import ApplicationStatusBadge from "@/components/dashboard/ApplicationStatusBadge";
import { formatDateShort } from "@/lib/dashboardShared";

const INTERVIEW_STAGES = ["Recruiter Screen", "Assessment", "Interviewing", "Offer"];

export default function InterviewsPage() {
  const [apps, setApps] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/applications");
        const data = await res.json();
        if (res.ok) setApps((data.companies || []).flatMap((c) => c.applications));
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) return <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8 sm:px-6 lg:px-8"><DashboardLoadingState /></main>;

  const list = apps || [];
  const inStage = list.filter((a) => INTERVIEW_STAGES.includes(a.status));
  const others = list.filter((a) => !INTERVIEW_STAGES.includes(a.status));

  function Card({ a }) {
    return (
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-slate-900">{a.role}</p>
          <p className="text-xs text-slate-500">{a.company} · applied {formatDateShort(a.applicationDate)}</p>
        </div>
        <div className="flex items-center gap-3">
          <ApplicationStatusBadge status={a.status} />
          <Link href={`/interviews/${encodeURIComponent(a.id)}`} className="rounded-md bg-slate-900 px-3 py-1.5 text-xs font-medium text-white shadow-sm hover:bg-slate-700">
            Prepare
          </Link>
        </div>
      </div>
    );
  }

  return (
    <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8 sm:px-6 lg:px-8">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Interview Preparation</h1>
        <p className="mt-1 max-w-2xl text-sm text-slate-600">
          Generate role-specific questions, build STAR answers from your real experience, and track interview rounds.
        </p>
      </header>

      {list.length === 0 ? (
        <EmptyState title="No applications yet" message="Tailor a resume first — then you can prepare for its interviews here." actionLabel="Go to Resume Tailor" actionHref="/" />
      ) : (
        <div className="space-y-8">
          <section>
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">In an interview stage</h2>
            {inStage.length === 0 ? (
              <p className="rounded-xl border border-dashed border-slate-300 bg-white px-4 py-6 text-center text-sm text-slate-500">
                No applications are in an interview stage yet. You can still prepare for any application below.
              </p>
            ) : (
              <div className="space-y-3">{inStage.map((a) => <Card key={a.id} a={a} />)}</div>
            )}
          </section>

          {others.length > 0 && (
            <section>
              <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">All applications</h2>
              <div className="space-y-3">{others.map((a) => <Card key={a.id} a={a} />)}</div>
            </section>
          )}
        </div>
      )}
    </main>
  );
}
