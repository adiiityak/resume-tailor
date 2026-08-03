import { formatDateShort, formatTime } from "@/lib/dashboardShared";

const LABELS = {
  application_created: "Application created",
  resume_tailored: "Resume tailored",
  resume_retailored: "Resume re-tailored",
  cover_letter_generated: "Cover letter generated",
  file_downloaded: "File downloaded",
  status_changed: "Status changed",
  job_description_edited: "Job description edited",
  follow_up_created: "Follow-up created",
  follow_up_completed: "Follow-up completed",
  contact_added: "Contact added",
  interview_scheduled: "Interview scheduled",
  interview_completed: "Interview completed",
  notes_added: "Notes added",
};

export default function ActivityTimeline({ events }) {
  if (!events || events.length === 0) {
    return <p className="text-sm text-slate-500">No activity has been recorded for this application yet.</p>;
  }

  return (
    <ol className="relative space-y-4 border-l border-slate-200 pl-5">
      {events.map((e) => (
        <li key={e.id} className="relative">
          <span className="absolute -left-[23px] top-1 h-2.5 w-2.5 rounded-full border-2 border-white bg-slate-400" aria-hidden="true" />
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <p className="text-sm font-medium text-slate-800">
              {LABELS[e.type] || e.type}
              {e.type === "status_changed" && e.from && (
                <span className="font-normal text-slate-500"> — {e.from} → {e.to}</span>
              )}
            </p>
            <span className="text-xs text-slate-400">
              {formatDateShort(e.createdAt)} · {formatTime(e.createdAt)}
            </span>
          </div>
          {e.detail && e.type !== "status_changed" && <p className="text-xs text-slate-500">{e.detail}</p>}
        </li>
      ))}
    </ol>
  );
}
