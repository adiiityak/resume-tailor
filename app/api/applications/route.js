import { listApplications, createApplication } from "@/lib/applications";

export async function GET() {
  try {
    const data = await listApplications();
    return Response.json(data);
  } catch (err) {
    console.error(err);
    return Response.json({ error: "Unable to read history folder." }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    if (!body.tailoredResume?.trim() && !body.jobDescription?.trim()) {
      return Response.json({ error: "A tailored resume or job description is required." }, { status: 400 });
    }
    const metadata = await createApplication(body);
    return Response.json({ ok: true, application: metadata });
  } catch (err) {
    console.error(err);
    return Response.json({ error: "Unable to save application." }, { status: 500 });
  }
}
