import { extractKeywords } from "@/lib/localTailor";
import { parseResume } from "@/lib/resumeParser";

const TOOL_TERMS = new Set([
  "figma", "framer", "sketch", "adobe", "illustrator", "photoshop", "notion", "jira", "react", "react.js",
  "next.js", "vue", "angular", "html", "css", "javascript", "typescript", "node.js", "python", "java",
  "aws", "azure", "gcp", "docker", "kubernetes", "sql", "postgresql", "mongodb", "git", "tableau", "power bi",
  "salesforce", "hubspot", "google analytics", "jest", "cypress", "selenium",
]);

const DOMAIN_TERMS = [
  "fintech", "b2b saas", "saas", "b2b", "b2c", "healthcare", "e-commerce", "ecommerce", "edtech", "education",
  "manufacturing", "real estate", "insurance", "banking", "logistics", "marketing", "gaming", "media",
];

const SENIORITY = [
  { level: 3, terms: ["principal", "staff", "head of", "director", "vp ", "lead "] },
  { level: 2, terms: ["senior", "sr.", "sr ", "lead"] },
  { level: 1, terms: ["mid-level", "mid level", "intermediate"] },
  { level: 0, terms: ["junior", "jr.", "entry-level", "entry level", "associate", "intern"] },
];

function detectSeniority(text) {
  const t = ` ${text.toLowerCase()} `;
  for (const s of SENIORITY) {
    if (s.terms.some((term) => t.includes(term))) return s.level;
  }
  return null; // unspecified
}

function tokens(text) {
  return (text.toLowerCase().match(/[a-z0-9+.#]+/g) || []).filter((w) => w.length > 1);
}

function classifyKeyword(keyword, resumeLower, resumeTokens) {
  const kw = keyword.toLowerCase();
  if (resumeLower.includes(kw)) return "strong";
  const parts = kw.split(/\s+/).filter(Boolean);
  if (parts.length > 1) {
    const present = parts.filter((p) => resumeTokens.has(p)).length;
    if (present >= 1 && present < parts.length) return "partial";
    if (present === parts.length) return "strong";
  }
  return "missing";
}

function sectionText(parsed, titleRegex) {
  const sec = parsed.sections.find((s) => s.title && titleRegex.test(s.title));
  if (!sec) return "";
  return sec.items.map((i) => i.text || i.left || "").join(" ");
}

// Pure, deterministic pre-tailoring fit analysis. Never fabricates — only measures
// what evidence exists in the resume for what the job description asks.
export function computeJobFit(resume, jobDescription) {
  const keywords = extractKeywords(jobDescription);
  const resumeLower = resume.toLowerCase();
  const resumeTokens = new Set(tokens(resume));
  const parsed = parseResume(resume);

  const strong = [];
  const partial = [];
  const missing = [];
  for (const kw of keywords) {
    const c = classifyKeyword(kw, resumeLower, resumeTokens);
    if (c === "strong") strong.push(kw);
    else if (c === "partial") partial.push(kw);
    else missing.push(kw);
  }

  const total = keywords.length || 1;
  // Keyword match: strong counts full, partial counts half.
  const keywordMatch = Math.min(1, (strong.length + partial.length * 0.5) / total);

  const experienceText = (
    sectionText(parsed, /EXPERIENCE|EMPLOYMENT|WORK/i) || resume
  ).toLowerCase();
  const skillsText = sectionText(parsed, /SKILL|TOOL|TECH/i).toLowerCase();

  const experienceRelevance = keywords.length
    ? keywords.filter((k) => experienceText.includes(k.toLowerCase())).length / total
    : 0;
  const skillsCoverage = keywords.length
    ? keywords.filter((k) => skillsText.includes(k.toLowerCase())).length / total
    : 0;

  // Tool alignment
  const jobTools = keywords.filter((k) => TOOL_TERMS.has(k.toLowerCase()));
  const toolAlignment = jobTools.length
    ? jobTools.filter((k) => resumeLower.includes(k.toLowerCase())).length / jobTools.length
    : 1;

  // Domain alignment
  const jdLower = jobDescription.toLowerCase();
  const jobDomains = DOMAIN_TERMS.filter((d) => jdLower.includes(d));
  const domainAlignment = jobDomains.length
    ? jobDomains.filter((d) => resumeLower.includes(d)).length / jobDomains.length
    : 1;

  // Seniority alignment
  const jdSen = detectSeniority(jobDescription);
  const resumeSen = detectSeniority(resume);
  let seniorityAlignment = 1;
  let seniorityNote = "Not specified in the job description.";
  if (jdSen !== null) {
    if (resumeSen === null) {
      seniorityAlignment = 0.6;
      seniorityNote = "The role specifies a seniority level; your resume doesn't clearly signal one.";
    } else {
      const gap = Math.abs(jdSen - resumeSen);
      seniorityAlignment = gap === 0 ? 1 : gap === 1 ? 0.7 : 0.4;
      seniorityNote = gap === 0 ? "Seniority appears aligned." : "Seniority may differ from what the role targets.";
    }
  }

  const breakdown = {
    keywordMatch: Math.round(keywordMatch * 100),
    experienceRelevance: Math.round(experienceRelevance * 100),
    skillsCoverage: Math.round(skillsCoverage * 100),
    seniorityAlignment: Math.round(seniorityAlignment * 100),
    domainAlignment: Math.round(domainAlignment * 100),
    toolAlignment: Math.round(toolAlignment * 100),
  };

  const overall = Math.round(
    keywordMatch * 35 +
      experienceRelevance * 25 +
      skillsCoverage * 20 +
      seniorityAlignment * 10 +
      domainAlignment * 10
  );

  let label = "Low-Evidence Match";
  if (overall >= 80) label = "Strong Fit";
  else if (overall >= 60) label = "Good Fit";
  else if (overall >= 40) label = "Stretch Role";

  const message =
    missing.length === 0
      ? "Your resume has supporting evidence for every key requirement detected."
      : `This role is a ${label.toLowerCase()} because ${missing.length} important requirement${missing.length === 1 ? "" : "s"} do not yet have supporting evidence in your resume.`;

  return { overall, label, message, breakdown, strong, partial, missing, seniorityNote };
}
