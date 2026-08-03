"use client";

import { useState } from "react";
import { downloadServerFile } from "@/components/dashboard/downloadFile";
import { formatBytes, formatDateShort } from "@/lib/dashboardShared";

const TYPE_LABEL = {
  ".docx": "Word document",
  ".pdf": "PDF",
  ".txt": "Text",
  ".json": "JSON",
};

function ext(name) {
  const i = name.lastIndexOf(".");
  return i >= 0 ? name.slice(i).toLowerCase() : "";
}

export default function FilesList({ id, files }) {
  const [error, setError] = useState("");

  if (!files || files.length === 0) {
    return <p className="text-sm text-slate-500">No files saved in this application folder yet.</p>;
  }

  async function handleDownload(name) {
    setError("");
    try {
      await downloadServerFile(id, name);
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
      {error && <p className="px-4 pt-3 text-xs text-red-600">{error}</p>}
      <table className="w-full min-w-[560px] text-left text-sm">
        <thead>
          <tr className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500">
            <th scope="col" className="px-4 py-3 font-medium">File name</th>
            <th scope="col" className="px-4 py-3 font-medium">Type</th>
            <th scope="col" className="px-4 py-3 font-medium">Size</th>
            <th scope="col" className="px-4 py-3 font-medium">Last updated</th>
            <th scope="col" className="px-4 py-3 font-medium text-right">Action</th>
          </tr>
        </thead>
        <tbody>
          {files.map((f) => (
            <tr key={f.name} className="border-b border-slate-100 last:border-0">
              <td className="px-4 py-3 font-medium text-slate-800">{f.name}</td>
              <td className="px-4 py-3 text-slate-600">{TYPE_LABEL[ext(f.name)] || "File"}</td>
              <td className="px-4 py-3 text-slate-600">{formatBytes(f.size)}</td>
              <td className="px-4 py-3 text-slate-500">{formatDateShort(f.updatedAt)}</td>
              <td className="px-4 py-3 text-right">
                <button
                  onClick={() => handleDownload(f.name)}
                  className="rounded-md border border-slate-300 bg-white px-2.5 py-1 text-xs font-medium text-slate-700 shadow-sm hover:bg-slate-50"
                >
                  Download
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
