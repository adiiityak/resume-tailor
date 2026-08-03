import { updateAchievement, deleteAchievement } from "@/lib/achievements";

export async function PATCH(request, { params }) {
  const { id } = await params;
  try {
    const patch = await request.json();
    const achievement = await updateAchievement(id, patch);
    if (!achievement) return Response.json({ error: "Achievement not found." }, { status: 404 });
    return Response.json({ ok: true, achievement });
  } catch (err) {
    console.error(err);
    return Response.json({ error: "Unable to update the achievement." }, { status: 500 });
  }
}

export async function DELETE(request, { params }) {
  const { id } = await params;
  try {
    const ok = await deleteAchievement(id);
    if (!ok) return Response.json({ error: "Achievement not found." }, { status: 404 });
    return Response.json({ ok: true });
  } catch (err) {
    console.error(err);
    return Response.json({ error: "Unable to delete the achievement." }, { status: 500 });
  }
}
