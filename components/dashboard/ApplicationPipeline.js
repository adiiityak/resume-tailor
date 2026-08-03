"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { KANBAN_COLUMNS, STATUS_STYLES, PRIORITY_STYLES, formatDateShort, matchScoreColor } from "@/lib/dashboardShared";

function PipelineCard({ app, onDragStart }) {
  const router = useRouter();
  return (
    <div
      draggable
      onDragStart={(e) => onDragStart(e, app)}
      onClick={() => router.push(`/dashboard/application/${encodeURIComponent(app.id)}`)}
      className="cursor-grab rounded-lg border border-slate-200 bg-white p-3 shadow-sm transition hover:border-slate-300 hover:shadow active:cursor-grabbing"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-slate-900">{app.role}</p>
          <p className="truncate text-xs text-slate-500">{app.company}{app.location ? ` · ${app.location}` : ""}</p>
        </div>
        <span className={`shrink-0 rounded border px-1.5 py-0.5 text-[10px] font-medium ${PRIORITY_STYLES[app.priority] || PRIORITY_STYLES.Medium}`}>
          {app.priority || "Medium"}
        </span>
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-slate-500">
        <span>{formatDateShort(app.createdAt)}</span>
        <span className={`font-semibold ${matchScoreColor(app.matchScore)}`}>
          {typeof app.matchScore === "number" ? `${app.matchScore}%` : "—"}
        </span>
        {app.nextFollowUpAt && <span className="text-amber-600">Follow-up {formatDateShort(app.nextFollowUpAt)}</span>}
      </div>
      <div className="mt-2 flex gap-1">
        <span className={`rounded px-1.5 py-0.5 text-[10px] ${app.hasResume ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-300"}`}>Resume</span>
        <span className={`rounded px-1.5 py-0.5 text-[10px] ${app.hasCoverLetter ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-300"}`}>Cover</span>
      </div>
    </div>
  );
}

export default function ApplicationPipeline({ applications, onChanged }) {
  const [cards, setCards] = useState(applications);
  const [dragId, setDragId] = useState(null);
  const [dragOver, setDragOver] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => { setCards(applications); }, [applications]);

  function onDragStart(e, app) {
    setDragId(app.id);
    e.dataTransfer.effectAllowed = "move";
  }

  async function onDrop(status) {
    const id = dragId;
    setDragOver(null);
    setDragId(null);
    if (!id) return;
    const app = cards.find((c) => c.id === id);
    if (!app || app.status === status) return;

    const prev = app.status;
    setCards((cs) => cs.map((c) => (c.id === id ? { ...c, status } : c)));
    setError("");
    try {
      const res = await fetch(`/api/applications/${encodeURIComponent(id)}/status`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error("Unable to update status");
      onChanged?.();
    } catch (err) {
      setError(err.message);
      setCards((cs) => cs.map((c) => (c.id === id ? { ...c, status: prev } : c)));
    }
  }

  const shown = cards.filter((c) => KANBAN_COLUMNS.includes(c.status));
  const hidden = cards.length - shown.length;

  return (
    <div>
      {error && <p className="mb-2 text-sm text-red-600">{error}</p>}
      <div className="flex gap-3 overflow-x-auto pb-2">
        {KANBAN_COLUMNS.map((status) => {
          const items = shown.filter((c) => c.status === status);
          return (
            <div
              key={status}
              onDragOver={(e) => { e.preventDefault(); setDragOver(status); }}
              onDragLeave={() => setDragOver((s) => (s === status ? null : s))}
              onDrop={() => onDrop(status)}
              className={`flex w-64 shrink-0 flex-col rounded-xl border p-2 transition ${
                dragOver === status ? "border-slate-400 bg-slate-100" : "border-slate-200 bg-slate-50"
              }`}
            >
              <div className="mb-2 flex items-center justify-between px-1">
                <span className={`rounded-full border px-2 py-0.5 text-xs font-medium ${STATUS_STYLES[status]}`}>{status}</span>
                <span className="text-xs text-slate-400">{items.length}</span>
              </div>
              <div className="flex min-h-[60px] flex-col gap-2">
                {items.map((app) => (
                  <PipelineCard key={app.id} app={app} onDragStart={onDragStart} />
                ))}
              </div>
            </div>
          );
        })}
      </div>
      {hidden > 0 && (
        <p className="mt-2 text-xs text-slate-400">
          {hidden} application{hidden === 1 ? "" : "s"} in other statuses (Tailoring, Recruiter Screen, Withdrawn, Archived) are not shown on the board — see Table or Company view.
        </p>
      )}
    </div>
  );
}
