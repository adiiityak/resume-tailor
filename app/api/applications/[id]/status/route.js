import { changeStatus } from "@/lib/applications";

export async function POST(request, { params }) {
  const { id } = await params;
  try {
    const { status } = await request.json();
    if (!status) return Response.json({ error: "status is required." }, { status: 400 });
    const next = await changeStatus(id, status);
    if (!next) return Response.json({ error: "Application folder not found." }, { status: 404 });
    return Response.json({ ok: true, application: next });
  } catch (err) {
    return Response.json({ error: err.message || "Unable to update status." }, { status: err.status || 500 });
  }
}
