import { listJobs, createJob } from "@/lib/jobs";

export async function GET() {
  try {
    const data = await listJobs();
    return Response.json(data);
  } catch (err) {
    console.error(err);
    return Response.json({ error: "Unable to read the job library." }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    if (!body.jobDescription?.trim() && !body.company?.trim() && !body.role?.trim()) {
      return Response.json({ error: "Add at least a company, role, or job description." }, { status: 400 });
    }
    const { job, similar } = await createJob(body);
    return Response.json({ ok: true, job, similar });
  } catch (err) {
    console.error(err);
    return Response.json({ error: "Unable to save the job." }, { status: 500 });
  }
}
