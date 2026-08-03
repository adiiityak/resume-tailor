"use client";

import { useState } from "react";
import Link from "next/link";
import { downloadServerFile } from "@/components/dashboard/downloadFile";
import EmptyState from "@/components/dashboard/EmptyState";

export default function CoverLetterPreview({ app }) {
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const text = app.coverLetterText || "";
  const hasDocx = (app.fileList || []).some((f) => f.name === "cover-letter.docx");
  const hasPdf = (app.fileList || []).some((f) => f.name === "cover-letter.pdf");

  if (!text.trim()) {
    return (
      <EmptyState
        title="No cover letter has been generated for this application."
        message="Open this application in Resume Tailor and click “Write cover letter” to create one."
        actionLabel="Generate Cover Letter"
        actionHref={`/?load=${encodeURIComponent(app.id)}`}
      />
    );
  }

  async function dl(file) {
    setError("");
    try {
      await downloadServerFile(app.id, file);
    } catch (err) {
      setError(err.message);
    }
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      setError("Copy failed.");
    }
  }

  return (
    <div>
      <div className="mb-3 flex flex-wrap gap-2">
        <Link href={`/?load=${encodeURIComponent(app.id)}`} className="rounded-md bg-slate-900 px-3 py-1.5 text-xs font-medium text-white shadow-sm hover:bg-slate-700">Edit</Link>
        <button onClick={copy} className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 shadow-sm hover:bg-slate-50">{copied ? "Copied!" : "Copy"}</button>
        <button onClick={() => dl("cover-letter.docx")} disabled={!hasDocx} className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 shadow-sm hover:bg-slate-50 disabled:opacity-40">Download DOCX</button>
        <button onClick={() => dl("cover-letter.pdf")} disabled={!hasPdf} title={hasPdf ? "" : "Use Save as PDF in the editor to create a PDF copy"} className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 shadow-sm hover:bg-slate-50 disabled:opacity-40">Download PDF</button>
      </div>
      {error && <p className="mb-2 text-xs text-red-600">{error}</p>}
      <div className="whitespace-pre-wrap rounded-xl border border-slate-200 bg-white p-6 text-sm leading-relaxed text-slate-800 shadow-sm">
        {text}
      </div>
    </div>
  );
}
