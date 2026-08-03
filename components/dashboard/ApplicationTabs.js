"use client";

import { useState } from "react";
import ApplicationDetails from "@/components/dashboard/ApplicationDetails";
import ResumePreview from "@/components/dashboard/ResumePreview";
import CoverLetterPreview from "@/components/dashboard/CoverLetterPreview";
import JobDescriptionPreview from "@/components/dashboard/JobDescriptionPreview";
import MatchReport from "@/components/dashboard/MatchReport";
import FilesList from "@/components/dashboard/FilesList";
import ActivityTimeline from "@/components/dashboard/ActivityTimeline";

const TABS = ["Overview", "Resume", "Cover Letter", "Job Description", "Match Report", "Timeline", "Files"];

export default function ApplicationTabs({ app, onStatusChange, onDuplicate, onDelete }) {
  const [active, setActive] = useState("Overview");

  return (
    <div>
      <div className="mb-5 overflow-x-auto border-b border-slate-200">
        <div role="tablist" aria-label="Application sections" className="flex min-w-max gap-1">
          {TABS.map((tab) => {
            const selected = active === tab;
            return (
              <button
                key={tab}
                role="tab"
                aria-selected={selected}
                onClick={() => setActive(tab)}
                className={`whitespace-nowrap border-b-2 px-3 py-2 text-sm font-medium transition ${
                  selected
                    ? "border-slate-900 text-slate-900"
                    : "border-transparent text-slate-500 hover:text-slate-800"
                }`}
              >
                {tab}
              </button>
            );
          })}
        </div>
      </div>

      <div role="tabpanel">
        {active === "Overview" && (
          <ApplicationDetails app={app} onStatusChange={onStatusChange} onDuplicate={onDuplicate} onDelete={onDelete} />
        )}
        {active === "Resume" && <ResumePreview app={app} />}
        {active === "Cover Letter" && <CoverLetterPreview app={app} />}
        {active === "Job Description" && <JobDescriptionPreview app={app} />}
        {active === "Match Report" && <MatchReport report={app.matchReport} />}
        {active === "Timeline" && <ActivityTimeline events={app.activity} />}
        {active === "Files" && <FilesList id={app.id} files={app.fileList} />}
      </div>
    </div>
  );
}
