import {
  readApplicationFile,
  saveApplicationFile,
  generateResumeDocx,
  generateCoverLetterDocx,
} from "@/lib/applications";

export async function GET(request, { params }) {
  const { id } = await params;
  const { searchParams } = new URL(request.url);
  const file = searchParams.get("file");
  if (!file) return Response.json({ error: "Missing file parameter." }, { status: 400 });

  try {
    const { buffer, contentType } = await readApplicationFile(id, file);
    return new Response(buffer, {
      headers: {
        "Content-Type": contentType,
        "Content-Disposition": `attachment; filename="${file}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    return Response.json({ error: err.message || "Unable to download file." }, { status: err.status || 500 });
  }
}

export async function POST(request, { params }) {
  const { id } = await params;
  try {
    const body = await request.json();

    // Regenerate a document from the stored text and persist it.
    if (body.generate === "resume") {
      await generateResumeDocx(id, body.variant);
      return Response.json({ ok: true });
    }
    if (body.generate === "coverLetter") {
      await generateCoverLetterDocx(id, body.variant);
      return Response.json({ ok: true });
    }

    // Save a text/json file directly.
    if (body.filename && typeof body.content === "string") {
      const next = await saveApplicationFile(id, body.filename, body.content);
      // Keep a Word copy of the cover letter in sync when its text is saved.
      if (body.filename === "cover-letter.txt") {
        try {
          await generateCoverLetterDocx(id, body.variant);
        } catch {
          /* non-fatal */
        }
      }
      return Response.json({ ok: true, application: next });
    }

    // Save a binary file (base64-encoded).
    if (body.filename && typeof body.base64 === "string") {
      const next = await saveApplicationFile(id, body.filename, Buffer.from(body.base64, "base64"));
      return Response.json({ ok: true, application: next });
    }

    return Response.json({ error: "Nothing to save." }, { status: 400 });
  } catch (err) {
    return Response.json({ error: err.message || "Unable to save file." }, { status: err.status || 500 });
  }
}
