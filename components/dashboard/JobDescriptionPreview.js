"use client";

import { useState } from "react";
import Link from "next/link";

export default function JobDescriptionPreview({ app }) {
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");
  const text = app.jobDescription || "";

  if (!text.trim()) {
    return <p className="text-sm text-slate-500">No job description was saved for this application.</p>;
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
        <button onClick={copy} className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 shadow-sm hover:bg-slate-50">{copied ? "Copied!" : "Copy Job Description"}</button>
        <Link href={`/?load=${encodeURIComponent(app.id)}`} className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 shadow-sm hover:bg-slate-50">Edit Job Description</Link>
        <Link href={`/?load=${encodeURIComponent(app.id)}`} className="rounded-md bg-slate-900 px-3 py-1.5 text-xs font-medium text-white shadow-sm hover:bg-slate-700">Re-tailor Resume</Link>
      </div>
      {error && <p className="mb-2 text-xs text-red-600">{error}</p>}
      <p className="mb-2 text-xs text-slate-500">Editing the job description does not automatically rewrite the resume. Use “Re-tailor Resume” in the editor.</p>
      <div className="whitespace-pre-wrap rounded-xl border border-slate-200 bg-white p-6 text-sm leading-relaxed text-slate-800 shadow-sm">
        {text}
      </div>
    </div>
  );
}
