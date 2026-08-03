import { getCompany } from "@/lib/applications";

export async function GET(request, { params }) {
  const { companySlug } = await params;
  try {
    const company = await getCompany(companySlug);
    if (!company) return Response.json({ error: "Company not found." }, { status: 404 });
    return Response.json(company);
  } catch (err) {
    console.error(err);
    return Response.json({ error: "Unable to read company." }, { status: 500 });
  }
}
