import { listMessages, saveMessage, deleteMessage } from "@/lib/applications";

export async function GET(request, { params }) {
  const { id } = await params;
  try {
    const data = await listMessages(id);
    if (data === null) return Response.json({ error: "Application not found." }, { status: 404 });
    return Response.json(data);
  } catch (err) {
    console.error(err);
    return Response.json({ error: "Unable to read messages." }, { status: 500 });
  }
}

export async function POST(request, { params }) {
  const { id } = await params;
  try {
    const body = await request.json();
    if (!body.body?.trim()) return Response.json({ error: "Message body is required." }, { status: 400 });
    const message = await saveMessage(id, body);
    if (message === null) return Response.json({ error: "Application not found." }, { status: 404 });
    return Response.json({ ok: true, message });
  } catch (err) {
    console.error(err);
    return Response.json({ error: "Unable to save the message." }, { status: 500 });
  }
}

export async function DELETE(request, { params }) {
  const { id } = await params;
  const { searchParams } = new URL(request.url);
  const messageId = searchParams.get("messageId");
  if (!messageId) return Response.json({ error: "messageId is required." }, { status: 400 });
  try {
    const ok = await deleteMessage(id, messageId);
    if (!ok) return Response.json({ error: "Message not found." }, { status: 404 });
    return Response.json({ ok: true });
  } catch (err) {
    return Response.json({ error: err.message || "Unable to delete the message." }, { status: err.status || 500 });
  }
}
