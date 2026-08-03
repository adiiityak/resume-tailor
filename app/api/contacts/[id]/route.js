import { updateContact, deleteContact } from "@/lib/contacts";

export async function PATCH(request, { params }) {
  const { id } = await params;
  try {
    const patch = await request.json();
    const contact = await updateContact(id, patch);
    if (!contact) return Response.json({ error: "Contact not found." }, { status: 404 });
    return Response.json({ ok: true, contact });
  } catch (err) {
    console.error(err);
    return Response.json({ error: "Unable to update the contact." }, { status: 500 });
  }
}

export async function DELETE(request, { params }) {
  const { id } = await params;
  try {
    const ok = await deleteContact(id);
    if (!ok) return Response.json({ error: "Contact not found." }, { status: 404 });
    return Response.json({ ok: true });
  } catch (err) {
    console.error(err);
    return Response.json({ error: "Unable to delete the contact." }, { status: 500 });
  }
}
