import { getActivity } from "@/lib/applications";

export async function GET(request, { params }) {
  const { id } = await params;
  try {
    const events = await getActivity(id);
    if (events === null) return Response.json({ error: "Application folder not found." }, { status: 404 });
    return Response.json({ events });
  } catch (err) {
    return Response.json({ error: err.message || "Unable to read timeline." }, { status: err.status || 500 });
  }
}
