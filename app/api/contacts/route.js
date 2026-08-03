import { listContacts, createContact } from "@/lib/contacts";

export async function GET() {
  try {
    return Response.json(await listContacts());
  } catch (err) {
    console.error(err);
    return Response.json({ error: "Unable to read contacts." }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    if (!body.name?.trim()) return Response.json({ error: "A contact name is required." }, { status: 400 });
    const contact = await createContact(body);
    return Response.json({ ok: true, contact });
  } catch (err) {
    console.error(err);
    return Response.json({ error: "Unable to save the contact." }, { status: 500 });
  }
}
