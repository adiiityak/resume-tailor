import { loadPdfParser } from "@/lib/pdfRuntime";

const MAX_BYTES = 25 * 1024 * 1024; // 25 MB

// Page markers some PDF producers inject (e.g. "-- 1 of 2 --"). Stripped before
// deciding whether a PDF actually contains extractable text.
const PAGE_MARKER = /^\s*--\s*\d+\s+of\s+\d+\s*--\s*$/gim;

function meaningfulText(text) {
  return (text || "").replace(PAGE_MARKER, "").replace(/\s+/g, " ").trim();
}

export async function POST(request) {
  let parser;
  try {
    const arrayBuffer = await request.arrayBuffer();

    if (!arrayBuffer.byteLength) {
      return Response.json({ error: "No file received. Try selecting the PDF again." }, { status: 400 });
    }
    if (arrayBuffer.byteLength > MAX_BYTES) {
      return Response.json(
        { error: `That PDF is ${(arrayBuffer.byteLength / 1024 / 1024).toFixed(1)} MB, over the 25 MB limit. Export a smaller version, or paste the text instead.` },
        { status: 413 }
      );
    }

    const bytes = new Uint8Array(arrayBuffer);
    // A valid PDF starts with "%PDF".
    if (!(bytes[0] === 0x25 && bytes[1] === 0x50 && bytes[2] === 0x44 && bytes[3] === 0x46)) {
      return Response.json({ error: "That file doesn't look like a PDF. Please upload a .pdf file." }, { status: 415 });
    }

    // Loaded dynamically (with Node polyfills installed first) so a module or
    // native-binding load failure is caught here and reported as JSON, rather
    // than escaping as a 500 HTML error page.
    const PDFParse = await loadPdfParser();

    parser = new PDFParse({ data: bytes });
    const result = await parser.getText();

    if (!meaningfulText(result?.text)) {
      return Response.json(
        { error: "That PDF has no selectable text — it's likely a scan or an image export. Please paste your resume text instead." },
        { status: 422 }
      );
    }

    return Response.json({ text: result.text });
  } catch (err) {
    const raw = err?.message || String(err);
    console.error("parse-pdf failed:", err);

    let message;
    if (/password|encrypt/i.test(raw)) {
      message = "That PDF is password-protected. Remove the password or paste the text instead.";
    } else if (/cannot find module|worker|napi|\.node\b/i.test(raw)) {
      // Environment/dependency problem rather than a problem with the file.
      message = `PDF reading isn't working in this environment: ${raw.slice(0, 200)}. Paste your resume text instead — and restarting the dev server often clears this.`;
    } else {
      message = `Couldn't read that PDF (${raw.slice(0, 200)}). Try re-exporting it, or paste the text instead.`;
    }
    return Response.json({ error: message }, { status: 422 });
  } finally {
    try {
      await parser?.destroy?.();
    } catch {
      /* ignore cleanup failures */
    }
  }
}
