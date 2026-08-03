import { parseResume } from "@/lib/resumeParser";

const GENERIC_PHRASES = [
  "results-driven", "results driven", "proven track record", "team player", "detail-oriented",
  "detail oriented", "hard-working", "hard working", "go-getter", "self-starter", "think outside the box",
  "synergy", "dynamic professional", "passionate about",
];

const PASSIVE_HINTS = ["was responsible for", "were responsible for", "responsible for", "tasked with", "duties included"];

function words(text) {
  return (text || "").trim().split(/\s+/).filter(Boolean);
}

function hasMetric(text) {
  return /\d/.test(text) || /%|\bx\b/i.test(text);
}

// Analyzes a resume for common quality issues. Suggestions never add facts — they
// point out where the user could add their own real detail.
export function analyzeResumeQuality(resumeText) {
  const parsed = parseResume(resumeText);
  const warnings = [];
  let seq = 0;
  const add = (severity, problem, why, section, line, suggestion) =>
    warnings.push({ id: `q-${++seq}`, severity, problem, why, section: section || "", line: line || "", suggestion });

  const lower = resumeText.toLowerCase();

  // Contact info
  if (!/[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/i.test(resumeText))
    add("Important", "No email address detected", "Recruiters need a direct way to reach you.", "Contact", "", "Add a professional email to the header.");
  if (!/linkedin\.com\//i.test(resumeText))
    add("Suggestion", "LinkedIn URL is missing", "Most recruiters check LinkedIn alongside the resume.", "Contact", "", "Add your LinkedIn profile URL.");
  if (!/(\+?\d[\d ()-]{7,})/.test(resumeText))
    add("Suggestion", "No phone number detected", "A phone number gives recruiters a second contact channel.", "Contact", "", "Add a phone number if you're comfortable sharing it.");

  const bullets = [];
  parsed.sections.forEach((sec) => {
    if (sec.title && sec.items.length === 0)
      add("Suggestion", `Empty section: ${sec.title}`, "Empty sections look unfinished and waste space.", sec.title, "", "Fill it in or remove the header.");
    sec.items.forEach((it) => {
      if (it.kind === "bullet") bullets.push({ text: it.text, section: sec.title || "" });
    });
  });

  // Bullet-level checks
  const verbCounts = {};
  const seen = new Map();
  bullets.forEach((b) => {
    const wc = words(b.text).length;
    if (wc > 35)
      add("Important", "Bullet is too long", `This bullet is ${wc} words; long bullets get skimmed past.`, b.section, b.text, "Split it or cut to under ~25 words focused on one outcome.");
    if (!hasMetric(b.text))
      add("Suggestion", "Bullet has no measurable outcome", "Numbers make impact concrete and credible.", b.section, b.text, "Add a real metric only if you have one (see impact prompts).");

    const firstWord = (words(b.text)[0] || "").toLowerCase().replace(/[^a-z]/g, "");
    if (firstWord) verbCounts[firstWord] = (verbCounts[firstWord] || 0) + 1;

    const key = b.text.trim().toLowerCase();
    if (key) {
      if (seen.has(key)) add("Important", "Duplicated bullet", "The same bullet appears more than once.", b.section, b.text, "Remove or differentiate the duplicate.");
      else seen.set(key, true);
    }

    const bl = b.text.toLowerCase();
    if (PASSIVE_HINTS.some((p) => bl.includes(p)))
      add("Suggestion", "Passive / weak phrasing", "Active, verb-first bullets read stronger.", b.section, b.text, "Start with a strong action verb instead of “responsible for”.");
  });

  Object.entries(verbCounts).forEach(([verb, count]) => {
    if (count >= 3)
      add("Suggestion", `Repeated opening verb: “${verb}”`, `${count} bullets start with the same verb, which reads repetitive.`, "Experience", "", "Vary your action verbs.");
  });

  // Generic phrases
  GENERIC_PHRASES.forEach((p) => {
    if (lower.includes(p))
      add("Important", `Generic phrase: “${p}”`, "Generic filler reads as AI-written and adds no evidence.", "Summary", "", "Replace with a specific, real accomplishment.");
  });

  // Date consistency: mix of "Mon YYYY" and bare "YYYY" ranges
  const monthYear = /\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\.?\s+\d{4}\b/i.test(resumeText);
  const bareYearRange = /\b(19|20)\d{2}\s*[–—-]\s*((19|20)\d{2}|present)\b/i.test(resumeText);
  if (monthYear && bareYearRange)
    add("Important", "Inconsistent date formats", "Some dates use “Mon YYYY” and others just “YYYY”.", "Experience", "", "Pick one date format and use it everywhere.");

  // Length
  const totalWords = words(resumeText).length;
  if (totalWords > 900)
    add("Suggestion", "Resume may be long", `About ${totalWords} words — likely over two pages.`, "", "", "Trim to the most relevant experience for this role.");
  if (bullets.length === 0)
    add("Critical", "No bullet points detected", "Bulleted accomplishments are what ATS and recruiters scan.", "", "", "Use hyphen bullets under each role.");

  const counts = {
    critical: warnings.filter((w) => w.severity === "Critical").length,
    important: warnings.filter((w) => w.severity === "Important").length,
    suggestion: warnings.filter((w) => w.severity === "Suggestion").length,
  };

  return { warnings, counts };
}
