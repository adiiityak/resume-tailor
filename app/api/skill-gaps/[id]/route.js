import { SAFE_GAP_ID, updateSkillGap } from "@/lib/skillGaps";

function noStoreJson(body, status = 200) {
  return Response.json(body, { status, headers: { "Cache-Control": "no-store" } });
}

function decodedId(value) {
  if (typeof value !== "string") {
    throw Object.assign(new Error("Invalid skill-gap id."), { status: 400 });
  }
  let id;
  try {
    id = decodeURIComponent(value);
  } catch {
    throw Object.assign(new Error("Invalid skill-gap id."), { status: 400 });
  }
  if (!SAFE_GAP_ID.test(id)) {
    throw Object.assign(new Error("Invalid skill-gap id."), { status: 400 });
  }
  return id;
}

export async function PATCH(request, { params }) {
  try {
    const resolvedParams = await params;
    const id = decodedId(resolvedParams?.id);
    let patch;
    try {
      patch = await request.json();
    } catch {
      return noStoreJson({ error: "Invalid JSON." }, 400);
    }
    const skillGap = await updateSkillGap(id, patch);
    if (!skillGap) return noStoreJson({ error: "Skill gap no longer exists." }, 404);
    return noStoreJson({ ok: true, skillGap });
  } catch (error) {
    if (error?.status === 400) return noStoreJson({ error: error.message }, 400);
    console.error(error);
    return noStoreJson({ error: "Unable to update skill gap." }, 500);
  }
}
