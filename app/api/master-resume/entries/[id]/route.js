import { updateEntry, deleteEntry } from "@/lib/masterResume";

export async function PATCH(request, { params }) {
  const { id } = await params;
  try {
    const patch = await request.json();
    const entry = await updateEntry(id, patch);
    if (!entry) return Response.json({ error: "Entry not found." }, { status: 404 });
    return Response.json({ ok: true, entry });
  } catch (err) {
    console.error(err);
    return Response.json({ error: "Unable to update the entry." }, { status: 500 });
  }
}

export async function DELETE(request, { params }) {
  const { id } = await params;
  try {
    const ok = await deleteEntry(id);
    if (!ok) return Response.json({ error: "Entry not found." }, { status: 404 });
    return Response.json({ ok: true });
  } catch (err) {
    console.error(err);
    return Response.json({ error: "Unable to delete the entry." }, { status: 500 });
  }
}
