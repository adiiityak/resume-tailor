// Client helper: download a saved file from an application folder via the API.
export async function downloadServerFile(id, file, downloadName) {
  const res = await fetch(`/api/applications/${encodeURIComponent(id)}/files?file=${encodeURIComponent(file)}`);
  if (!res.ok) {
    let msg = "Unable to download file.";
    try {
      msg = (await res.json()).error || msg;
    } catch {
      /* ignore */
    }
    throw new Error(msg);
  }
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = downloadName || file;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
