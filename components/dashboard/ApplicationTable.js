"use client";

import { useRouter } from "next/navigation";
import ApplicationStatusBadge from "@/components/dashboard/ApplicationStatusBadge";
import { formatDateShort, formatTime, matchScoreColor } from "@/lib/dashboardShared";

function FileDots({ app }) {
  const items = [
    { on: app.hasResume, label: "Resume", letter: "R" },
    { on: app.hasCoverLetter, label: "Cover letter", letter: "C" },
    { on: app.hasJobDescription, label: "Job description", letter: "J" },
  ];
  return (
    <span className="inline-flex gap-1">
      {items.map((it) => (
        <span
          key={it.letter}
          title={`${it.label}: ${it.on ? "saved" : "missing"}`}
          className={`inline-flex h-5 w-5 items-center justify-center rounded text-[10px] font-semibold ${
            it.on ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-300"
          }`}
        >
          {it.letter}
        </span>
      ))}
    </span>
  );
}

export default function ApplicationTable({ applications, showTime = false, onDelete }) {
  const router = useRouter();

  function open(id) {
    router.push(`/dashboard/application/${encodeURIComponent(id)}`);
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
      <table className="w-full min-w-[720px] text-left text-sm">
        <thead>
          <tr className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500">
            <th scope="col" className="px-4 py-3 font-medium">Company</th>
            <th scope="col" className="px-4 py-3 font-medium">Role</th>
            <th scope="col" className="px-4 py-3 font-medium">Date</th>
            {showTime && <th scope="col" className="px-4 py-3 font-medium">Created</th>}
            <th scope="col" className="px-4 py-3 font-medium">Match</th>
            <th scope="col" className="px-4 py-3 font-medium">Status</th>
            <th scope="col" className="px-4 py-3 font-medium">Files</th>
            <th scope="col" className="px-4 py-3 font-medium text-right">Actions</th>
          </tr>
        </thead>
        <tbody>
          {applications.map((app) => (
            <tr
              key={app.id}
              onClick={() => open(app.id)}
              className="cursor-pointer border-b border-slate-100 last:border-0 transition hover:bg-slate-50"
            >
              <td className="px-4 py-3 font-medium text-slate-900">{app.company}</td>
              <td className="px-4 py-3 text-slate-700">
                {app.role}
                {app.migrated && <span className="ml-1.5 rounded bg-slate-100 px-1.5 py-0.5 text-[10px] text-slate-500">migrated</span>}
              </td>
              <td className="px-4 py-3 text-slate-600">{formatDateShort(app.createdAt)}</td>
              {showTime && <td className="px-4 py-3 text-slate-500">{formatTime(app.createdAt)}</td>}
              <td className={`px-4 py-3 font-semibold ${matchScoreColor(app.matchScore)}`}>
                {typeof app.matchScore === "number" ? `${app.matchScore}%` : "—"}
              </td>
              <td className="px-4 py-3"><ApplicationStatusBadge status={app.status} /></td>
              <td className="px-4 py-3"><FileDots app={app} /></td>
              <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                <div className="inline-flex items-center gap-2">
                  <button
                    onClick={() => open(app.id)}
                    className="rounded-md border border-slate-300 bg-white px-2.5 py-1 text-xs font-medium text-slate-700 shadow-sm hover:bg-slate-50"
                  >
                    Open
                  </button>
                  {onDelete && (
                    <button
                      onClick={() => onDelete(app)}
                      className="rounded-md border border-slate-300 bg-white px-2.5 py-1 text-xs font-medium text-red-600 shadow-sm hover:bg-red-50"
                    >
                      Delete
                    </button>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
