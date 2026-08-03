import { compareJobs } from "@/lib/jobs";

export async function GET(request, { params }) {
  const { id } = await params;
  const { searchParams } = new URL(request.url);
  const other = searchParams.get("other");
  if (!other) return Response.json({ error: "Provide an 'other' job id to compare." }, { status: 400 });
  try {
    const result = await compareJobs(id, other);
    if (!result) return Response.json({ error: "One or both jobs were not found." }, { status: 404 });
    return Response.json(result);
  } catch (err) {
    console.error(err);
    return Response.json({ error: "Unable to compare jobs." }, { status: 500 });
  }
}
