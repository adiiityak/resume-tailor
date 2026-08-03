import { listAchievements, createAchievement } from "@/lib/achievements";

export async function GET() {
  try {
    return Response.json(await listAchievements());
  } catch (err) {
    console.error(err);
    return Response.json({ error: "Unable to read achievements." }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    if (!body.title?.trim() && !body.result?.trim() && !body.action?.trim()) {
      return Response.json({ error: "Add at least a title, action, or result." }, { status: 400 });
    }
    const achievement = await createAchievement(body);
    return Response.json({ ok: true, achievement });
  } catch (err) {
    console.error(err);
    return Response.json({ error: "Unable to save the achievement." }, { status: 500 });
  }
}
