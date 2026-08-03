import { addEntry, importFromResume } from "@/lib/masterResume";

export async function POST(request) {
  try {
    const body = await request.json();
    if (typeof body.resumeText === "string" && body.resumeText.trim()) {
      const result = await importFromResume(body.resumeText);
      return Response.json({ ok: true, ...result });
    }
    const entry = await addEntry(body.entry || body);
    return Response.json({ ok: true, entry });
  } catch (err) {
    console.error(err);
    return Response.json({ error: "Unable to add the entry." }, { status: 500 });
  }
}
