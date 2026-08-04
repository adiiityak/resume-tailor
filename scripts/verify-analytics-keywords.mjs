import { isDeepStrictEqual } from "node:util";
import { analyzeKeywordTrends, classifyEvidence, skillGapId } from "../lib/analytics/keywords.js";

let passed = 0;
let failed = 0;

function check(name, condition, extra = "") {
  if (condition) {
    passed += 1;
    console.log(`  ok   ${name}`);
  } else {
    failed += 1;
    console.log(`  FAIL ${name}${extra ? `: ${extra}` : ""}`);
  }
}

const result = analyzeKeywordTrends({
  jobs: [
    { id: "j1", company: "A", role: "Product Designer", jobDescription: "Figma, design systems, user research, stakeholder collaboration, B2B SaaS." },
    { id: "j2", company: "B", role: "UX Designer", jobDescription: "Figma, prototyping, user research, product analytics, leadership." },
  ],
  applicationJobs: [
    { id: "a1", company: "A", role: "Product Designer", jobDescription: "  FIGMA design systems user research stakeholder collaboration B2B SaaS " },
  ],
  masterEntries: [
    { id: "m1", status: "Approved", skills: ["Figma"], bullets: ["Conducted user research and built prototypes."], tags: [] },
    { id: "m2", status: "Needs Review", skills: ["Leadership"], bullets: ["Private unapproved evidence."], tags: [] },
  ],
  achievements: [
    { id: "achievement-1", evidence: "Research plan and interview notes", skills: ["User research"], resumeBullet: "Conducted user research." },
    { id: "achievement-2", evidence: "   ", skills: ["Product analytics"], resumeBullet: "Private unevidenced bullet." },
  ],
});

const byTerm = new Map(result.trends.map((trend) => [trend.term, trend]));
const figma = byTerm.get("Figma");
const userResearch = byTerm.get("User research");
const leadership = byTerm.get("Leadership");
const productAnalytics = byTerm.get("Product analytics");
const productAnalyticsGap = result.gaps.find((gap) => gap.skill === "Product analytics");

console.log("keyword trends and evidence");
check(
  "normalizes and hashes duplicate descriptions once",
  result.analyzedJobDescriptions === 2 && result.duplicateDescriptions === 1,
  JSON.stringify({ analyzedJobDescriptions: result.analyzedJobDescriptions, duplicateDescriptions: result.duplicateDescriptions })
);
check(
  "uses two unique descriptions as the percentage denominator",
  figma?.count === 2 && figma.percentage === 100 && userResearch?.count === 2 && userResearch.percentage === 100,
  JSON.stringify({ figma, userResearch })
);
check(
  "assigns strong evidence from approved records only",
  figma?.evidenceLevel === "Strong" && userResearch?.evidenceLevel === "Strong",
  JSON.stringify({ figma, userResearch })
);
check(
  "excludes needs-review evidence from strong evidence",
  leadership?.evidenceLevel === "None" && leadership?.evidence.length === 0,
  JSON.stringify(leadership)
);
check(
  "creates a stable product analytics gap without unevidenced achievement content",
  productAnalytics?.evidenceLevel === "None" &&
    productAnalyticsGap?.id === "skill-gap-product-analytics" &&
    productAnalyticsGap?.skillSlug === "product-analytics" &&
    skillGapId("Product analytics") === "skill-gap-product-analytics",
  JSON.stringify({ productAnalytics, productAnalyticsGap })
);
check(
  "suppresses a shorter overlapping SaaS match",
  byTerm.get("B2B SaaS")?.count === 1 && !byTerm.has("SaaS"),
  JSON.stringify(result.trends.filter((trend) => trend.term.includes("SaaS")))
);
check(
  "uses only approved and evidenced record excerpts",
  result.trends.every((trend) => trend.evidence.length <= 3 && trend.evidence.every((item) =>
    typeof item.sourceType === "string" && typeof item.sourceId === "string" && item.excerpt.length <= 180
  )) && !JSON.stringify(result).includes("Private"),
  JSON.stringify(result)
);
check(
  "keeps job references lightweight and omits descriptions",
  isDeepStrictEqual(figma?.relatedJobs, [
    { id: "j1", company: "A", role: "Product Designer" },
    { id: "j2", company: "B", role: "UX Designer" },
  ]) && !JSON.stringify(result).includes("stakeholder collaboration"),
  JSON.stringify(figma?.relatedJobs)
);
check(
  "uses only the supported taxonomy categories",
  result.trends.every((trend) => ["Skills", "Tools", "Responsibilities", "Seniority", "Soft Skills", "Domain Knowledge"].includes(trend.category)),
  JSON.stringify(result.trends.map((trend) => trend.category))
);
check(
  "sorts trends by count, category, and term",
  isDeepStrictEqual(
    result.trends.map((trend) => `${trend.count}|${trend.category}|${trend.term}`),
    [...result.trends]
      .sort((left, right) => right.count - left.count || left.category.localeCompare(right.category) || left.term.localeCompare(right.term))
      .map((trend) => `${trend.count}|${trend.category}|${trend.term}`)
  ),
  JSON.stringify(result.trends)
);

console.log("conservative evidence classification");
check(
  "recognizes configured related evidence as partial without a direct phrase",
  classifyEvidence("Product analytics", [{ sourceType: "Achievement", sourceId: "related", evidence: "Built a funnel analysis for activation." }]).level === "Partial"
);
check(
  "requires all significant multi-word tokens for partial evidence",
  classifyEvidence("Design systems", [{ sourceType: "Master Resume", sourceId: "weak", bullets: ["Improved the design handoff."] }]).level === "Weak"
);
check(
  "does not assign weak evidence to a missing single-word term",
  classifyEvidence("Leadership", [{ sourceType: "Master Resume", sourceId: "none", bullets: ["Led delivery."] }]).level === "None"
);
check(
  "finds a later boundary phrase after an embedded partial token",
  classifyEvidence("Figma", [{ sourceType: "Achievement", sourceId: "boundary", evidence: "prefigma Figma" }]).level === "Strong"
);

if (failed) {
  console.error(`\n${failed} keyword analytics assertion${failed === 1 ? "" : "s"} failed; ${passed} passed.`);
  process.exitCode = 1;
} else {
  console.log(`\nAll ${passed} keyword analytics assertions passed.`);
}
