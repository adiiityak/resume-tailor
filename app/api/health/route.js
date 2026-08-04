export const dynamic = "force-dynamic";

export function GET() {
  return Response.json(
    { status: "ok", service: "resume-tailor" },
    { headers: { "Cache-Control": "no-store" } }
  );
}
