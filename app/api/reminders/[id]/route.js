import { updateReminder, deleteReminder } from "@/lib/reminders";

export async function PATCH(request, { params }) {
  const { id } = await params;
  try {
    const patch = await request.json();
    const reminder = await updateReminder(id, patch);
    if (!reminder) return Response.json({ error: "Reminder not found." }, { status: 404 });
    return Response.json({ ok: true, reminder });
  } catch (err) {
    console.error(err);
    return Response.json({ error: "Unable to update the reminder." }, { status: 500 });
  }
}

export async function DELETE(request, { params }) {
  const { id } = await params;
  try {
    const ok = await deleteReminder(id);
    if (!ok) return Response.json({ error: "Reminder not found." }, { status: 404 });
    return Response.json({ ok: true });
  } catch (err) {
    console.error(err);
    return Response.json({ error: "Unable to delete the reminder." }, { status: 500 });
  }
}
