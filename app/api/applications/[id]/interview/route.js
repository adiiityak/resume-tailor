import { getInterview, saveInterview } from "@/lib/applications";

export async function GET(request, { params }) {
  const { id } = await params;
  try {
    const data = await getInterview(id);
    if (data === null) return Response.json({ error: "Application not found." }, { status: 404 });
    return Response.json(data);
  } catch (err) {
    console.error(err);
    return Response.json({ error: "Unable to read interview prep." }, { status: 500 });
  }
}

export async function PUT(request, { params }) {
  const { id } = await params;
  try {
    const body = await request.json();
    const next = await saveInterview(id, body);
    if (next === null) return Response.json({ error: "Application not found." }, { status: 404 });
    return Response.json({ ok: true, interview: next });
  } catch (err) {
    console.error(err);
    return Response.json({ error: "Unable to save interview prep." }, { status: 500 });
  }
}
