import { getAnalytics } from "@/lib/analytics";
import { parseAnalyticsFilters } from "@/lib/analytics/filters";

export const dynamic = "force-dynamic";

export async function GET(request) {
  try {
    const { filters, errors } = parseAnalyticsFilters(new URL(request.url).searchParams);
    if (errors.length) {
      return Response.json({ error: errors[0], errors }, { status: 400 });
    }
    const analytics = await getAnalytics(filters);
    return Response.json(analytics, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error(error);
    return Response.json({ error: "Unable to load analytics." }, { status: 500 });
  }
}
