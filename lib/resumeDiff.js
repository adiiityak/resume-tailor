import { parseResume } from "@/lib/resumeParser";

const STOP = new Set(["the", "a", "an", "and", "or", "for", "to", "of", "in", "on", "with", "by", "using", "used"]);

function norm(text) {
  return (text || "").toLowerCase().replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, " ").trim();
}

function tokenSet(text) {
  return new Set(norm(text).split(" ").filter((w) => w.length > 1 && !STOP.has(w)));
}

function jaccard(a, b) {
  if (a.size === 0 && b.size === 0) return 1;
  let inter = 0;
  for (const t of a) if (b.has(t)) inter += 1;
  const union = a.size + b.size - inter;
  return union === 0 ? 0 : inter / union;
}

function wordCount(text) {
  return norm(text).split(" ").filter(Boolean).length;
}

// Collect verified evidence items (bullets + skills) from the original resume.
function collectEvidence(parsed) {
  const evidence = [];
  const bullets = [];
  parsed.sections.forEach((sec) => {
    let bi = 0;
    sec.items.forEach((it) => {
      if (it.kind === "bullet") {
        const id = `bullet-${bullets.length + 1}`;
        const rec = { id, type: "resume_bullet", section: sec.title || "", text: it.text, secIndex: bi++, tokens: tokenSet(it.text) };
        bullets.push(rec);
        evidence.push({ id, type: "resume_bullet", section: rec.section, text: it.text });
      }
    });
    if (sec.title && /SKILL|TOOL|TECH/i.test(sec.title)) {
      sec.items.forEach((it) => {
        const raw = it.text || "";
        const afterColon = raw.includes(":") ? raw.split(":").slice(1).join(":") : raw;
        afterColon.split(/[,•|]/).map((s) => s.trim()).filter(Boolean).forEach((skill) => {
          const id = `skill-${evidence.length + 1}`;
          evidence.push({ id, type: "skill", section: sec.title, text: skill });
        });
      });
    }
  });
  return { evidence, bullets };
}

// Diffs a tailored resume against the original and traces each tailored bullet to
// its supporting evidence. A tailored bullet with no matching source is flagged
// UNSUPPORTED — never silently accepted.
export function computeResumeDiff(originalResume, tailoredResume) {
  const origParsed = parseResume(originalResume);
  const { evidence, bullets: origBullets } = collectEvidence(origParsed);
  const skillEvidence = evidence.filter((e) => e.type === "skill");

  const tailParsed = parseResume(tailoredResume);
  const tailBullets = [];
  tailParsed.sections.forEach((sec) => {
    let bi = 0;
    sec.items.forEach((it) => {
      if (it.kind === "bullet") tailBullets.push({ section: sec.title || "", text: it.text, secIndex: bi++, tokens: tokenSet(it.text) });
    });
  });

  const usedOrig = new Set();
  const changes = [];
  let cid = 0;

  for (const tb of tailBullets) {
    let best = null;
    let bestSim = 0; // raw jaccard of the chosen match
    let bestScore = -1; // jaccard + section tiebreaker, used only for selection
    for (const ob of origBullets) {
      const sim = jaccard(tb.tokens, ob.tokens);
      const score = sim + (ob.section === tb.section ? 0.02 : 0);
      if (score > bestScore) { bestScore = score; bestSim = sim; best = ob; }
    }

    const evidenceIds = [];
    let changeType;
    let supported = true;
    let reason = "";

    if (best && bestSim >= 0.9) {
      usedOrig.add(best.id);
      evidenceIds.push(best.id);
      const moved = best.section !== tb.section || best.secIndex !== tb.secIndex;
      changeType = moved ? "reordered" : "unchanged";
      reason = moved
        ? "Moved earlier/later to surface experience most relevant to the job description."
        : "Kept as-is from your original resume.";
    } else if (best && bestSim >= 0.45) {
      usedOrig.add(best.id);
      evidenceIds.push(best.id);
      const wt = wordCount(tb.text);
      const wo = wordCount(best.text);
      if (wt < wo * 0.85) { changeType = "shortened"; reason = "Tightened wording while keeping the same real accomplishment."; }
      else if (wt > wo * 1.15) { changeType = "expanded"; reason = "Expanded using detail already implied by your original bullet."; }
      else { changeType = "rephrased"; reason = "Rephrased to mirror the job description's terminology, same underlying work."; }
    } else {
      changeType = "added";
      supported = false;
      reason = "No matching evidence found in your original resume. Verify this is true or remove it.";
    }

    // Attach skill evidence for any skill term that appears in the tailored bullet.
    const tbLower = tb.text.toLowerCase();
    for (const s of skillEvidence) {
      if (s.text && tbLower.includes(s.text.toLowerCase()) && !evidenceIds.includes(s.id)) evidenceIds.push(s.id);
    }

    changes.push({
      id: `change-${++cid}`,
      section: tb.section,
      originalText: best && bestSim >= 0.45 ? best.text : "",
      tailoredText: tb.text,
      changeType,
      similarity: Math.round(bestSim * 100) / 100,
      supported,
      evidenceIds,
      reason,
    });
  }

  // Original bullets never matched → removed from the tailored version.
  for (const ob of origBullets) {
    if (!usedOrig.has(ob.id)) {
      changes.push({
        id: `change-${++cid}`,
        section: ob.section,
        originalText: ob.text,
        tailoredText: "",
        changeType: "removed",
        similarity: 0,
        supported: true,
        evidenceIds: [ob.id],
        reason: "Left out of this tailored version as less relevant to the role (still in your master resume).",
      });
    }
  }

  const summary = {
    unchanged: changes.filter((c) => c.changeType === "unchanged").length,
    reordered: changes.filter((c) => c.changeType === "reordered").length,
    rephrased: changes.filter((c) => c.changeType === "rephrased").length,
    shortened: changes.filter((c) => c.changeType === "shortened").length,
    expanded: changes.filter((c) => c.changeType === "expanded").length,
    removed: changes.filter((c) => c.changeType === "removed").length,
    unsupported: changes.filter((c) => !c.supported).length,
  };

  return { changes, summary, evidence };
}
