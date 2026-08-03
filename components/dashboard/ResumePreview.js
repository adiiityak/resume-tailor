"use client";

import { useState } from "react";
import Link from "next/link";
import { parseResume } from "@/lib/resumeParser";
import { downloadServerFile } from "@/components/dashboard/downloadFile";

export default function ResumePreview({ app }) {
  const [error, setError] = useState("");
  const text = app.tailoredResume || "";
  const hasDocx = (app.fileList || []).some((f) => f.name === "resume.docx");
  const hasPdf = (app.fileList || []).some((f) => f.name === "resume.pdf");

  if (!text.trim()) {
    return <p className="text-sm text-slate-500">No tailored resume was saved for this application.</p>;
  }

  const parsed = parseResume(text);

  async function dl(file) {
    setError("");
    try {
      await downloadServerFile(app.id, file);
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div>
      <div className="mb-3 flex flex-wrap gap-2">
        <Link href={`/?load=${encodeURIComponent(app.id)}`} className="rounded-md bg-slate-900 px-3 py-1.5 text-xs font-medium text-white shadow-sm hover:bg-slate-700">
          Edit in Resume Tailor
        </Link>
        <button onClick={() => dl("resume.docx")} disabled={!hasDocx} className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 shadow-sm hover:bg-slate-50 disabled:opacity-40">
          Download DOCX
        </button>
        <button onClick={() => dl("resume.pdf")} disabled={!hasPdf} title={hasPdf ? "" : "Use Save as PDF in the editor to create a PDF copy"} className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 shadow-sm hover:bg-slate-50 disabled:opacity-40">
          Download PDF
        </button>
      </div>
      {error && <p className="mb-2 text-xs text-red-600">{error}</p>}

      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mx-auto max-w-2xl font-serif text-slate-800">
          <div className="text-center text-xl font-bold uppercase tracking-wide">{parsed.name}</div>
          {parsed.contact.map((c, i) => (
            <div key={i} className="text-center text-sm text-slate-600">{c}</div>
          ))}
          {parsed.sections.map((s, i) => (
            <div key={i} className="mt-5">
              {s.title && <div className="border-b border-slate-300 pb-1 text-sm font-bold uppercase tracking-wide">{s.title}</div>}
              <div className="mt-2 space-y-1">
                {s.items.map((item, j) => {
                  if (item.kind === "entry") {
                    return (
                      <div key={j} className="flex justify-between gap-4 font-semibold">
                        <span>{item.left}</span>
                        <span className="whitespace-nowrap font-normal text-slate-600">{item.right}</span>
                      </div>
                    );
                  }
                  if (item.kind === "sub") return <div key={j} className="italic text-slate-600">{item.text}</div>;
                  if (item.kind === "bullet") return <div key={j} className="pl-4 -indent-3 text-sm">• {item.text}</div>;
                  return <div key={j} className="text-sm">{item.text}</div>;
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
