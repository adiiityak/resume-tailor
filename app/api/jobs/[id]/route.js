import { getJob, updateJob, deleteJob } from "@/lib/jobs";

export async function GET(request, { params }) {
  const { id } = await params;
  try {
    const job = await getJob(id);
    if (!job) return Response.json({ error: "Job not found." }, { status: 404 });
    return Response.json(job);
  } catch (err) {
    console.error(err);
    return Response.json({ error: "Unable to load the job." }, { status: 500 });
  }
}

export async function PATCH(request, { params }) {
  const { id } = await params;
  try {
    const patch = await request.json();
    const next = await updateJob(id, patch);
    if (!next) return Response.json({ error: "Job not found." }, { status: 404 });
    return Response.json({ ok: true, job: next });
  } catch (err) {
    console.error(err);
    return Response.json({ error: "Unable to update the job." }, { status: 500 });
  }
}

export async function DELETE(request, { params }) {
  const { id } = await params;
  try {
    const ok = await deleteJob(id);
    if (!ok) return Response.json({ error: "Job not found." }, { status: 404 });
    return Response.json({ ok: true });
  } catch (err) {
    console.error(err);
    return Response.json({ error: "Unable to delete the job." }, { status: 500 });
  }
}
