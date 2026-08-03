import { PDFParse } from "pdf-parse";

export async function POST(request) {
  const arrayBuffer = await request.arrayBuffer();

  if (!arrayBuffer.byteLength) {
    return Response.json({ error: "No file received." }, { status: 400 });
  }

  let parser;
  try {
    parser = new PDFParse({ data: new Uint8Array(arrayBuffer) });
    const result = await parser.getText();

    if (!result.text?.trim()) {
      return Response.json(
        { error: "Couldn't find any text in that PDF. If it's a scanned image, paste your resume text manually instead." },
        { status: 422 }
      );
    }

    return Response.json({ text: result.text });
  } catch (err) {
    console.error(err);
    return Response.json({ error: "Failed to parse that PDF. Make sure it's a valid PDF file." }, { status: 422 });
  } finally {
    await parser?.destroy?.();
  }
}
