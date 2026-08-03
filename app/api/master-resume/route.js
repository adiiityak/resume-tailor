import { getMaster, patchHeader } from "@/lib/masterResume";

export async function GET() {
  try {
    return Response.json(await getMaster());
  } catch (err) {
    console.error(err);
    return Response.json({ error: "Unable to read the master resume." }, { status: 500 });
  }
}

export async function PATCH(request) {
  try {
    const patch = await request.json();
    const doc = await patchHeader(patch);
    return Response.json({ ok: true, master: doc });
  } catch (err) {
    console.error(err);
    return Response.json({ error: "Unable to update the master resume." }, { status: 500 });
  }
}
