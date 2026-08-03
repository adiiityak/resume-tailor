import { listReminders, createReminder } from "@/lib/reminders";

export async function GET() {
  try {
    return Response.json(await listReminders());
  } catch (err) {
    console.error(err);
    return Response.json({ error: "Unable to read reminders." }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    if (!body.title?.trim()) return Response.json({ error: "A reminder title is required." }, { status: 400 });
    const reminder = await createReminder(body);
    return Response.json({ ok: true, reminder });
  } catch (err) {
    console.error(err);
    return Response.json({ error: "Unable to save the reminder." }, { status: 500 });
  }
}
