import {
  getApplication,
  updateApplication,
  deleteApplication,
  duplicateApplication,
} from "@/lib/applications";

export async function GET(request, { params }) {
  const { id } = await params;
  const { searchParams } = new URL(request.url);
  const full = searchParams.get("full") === "1";
  try {
    const app = await getApplication(id, { full });
    if (!app) return Response.json({ error: "Application folder not found." }, { status: 404 });
    return Response.json(app);
  } catch (err) {
    console.error(err);
    return Response.json({ error: "Unable to load application." }, { status: 500 });
  }
}

export async function PATCH(request, { params }) {
  const { id } = await params;
  try {
    const patch = await request.json();
    const next = await updateApplication(id, patch);
    if (!next) return Response.json({ error: "Application folder not found." }, { status: 404 });
    return Response.json({ ok: true, application: next });
  } catch (err) {
    console.error(err);
    return Response.json({ error: "Unable to update application." }, { status: 500 });
  }
}

export async function POST(request, { params }) {
  const { id } = await params;
  try {
    const body = await request.json().catch(() => ({}));
    if (body.action === "duplicate") {
      const next = await duplicateApplication(id);
      if (!next) return Response.json({ error: "Application folder not found." }, { status: 404 });
      return Response.json({ ok: true, application: next });
    }
    return Response.json({ error: "Unknown action." }, { status: 400 });
  } catch (err) {
    console.error(err);
    return Response.json({ error: "Unable to complete action." }, { status: 500 });
  }
}

export async function DELETE(request, { params }) {
  const { id } = await params;
  try {
    const ok = await deleteApplication(id);
    if (!ok) return Response.json({ error: "Application folder not found." }, { status: 404 });
    return Response.json({ ok: true });
  } catch (err) {
    console.error(err);
    return Response.json({ error: "Unable to delete application." }, { status: 500 });
  }
}
