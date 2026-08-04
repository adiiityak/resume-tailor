import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

import {
  FILTER_ORDER,
  buildAnalyticsQuery,
  formatMetricValue,
  formatRate,
  rateDetail,
} from "../lib/analytics/client.js";

const failures = [];

function fallbackListIsNestedInImageRole(source) {
  const stack = [];
  const tags = source.matchAll(/<\/?([a-z][\w-]*)\b[^>]*>/gi);

  for (const match of tags) {
    const [tag, tagName] = match;
    if (tag.startsWith("</")) {
      const matchingIndex = stack.map((entry) => entry.tagName).lastIndexOf(tagName);
      if (matchingIndex !== -1) stack.splice(matchingIndex);
      continue;
    }

    const isFallbackList = tagName === "ul" && /\bdata-analytics-fallback\b/.test(tag);
    if (isFallbackList && stack.some((entry) => entry.hasImageRole)) return true;

    if (!tag.endsWith("/>")) {
      stack.push({ tagName, hasImageRole: /\brole=["']img["']/.test(tag) });
    }
  }

  return false;
}

async function check(name, callback) {
  try {
    await callback();
    console.log(`PASS ${name}`);
  } catch (error) {
    failures.push({ name, error });
    console.error(`FAIL ${name}: ${error.message}`);
  }
}

await check("uses the approved stable filter order", () => {
  assert.deepEqual(FILTER_ORDER, ["from", "to", "company", "role", "location", "source"]);
  assert.equal(
    buildAnalyticsQuery({
      source: "Referral",
      location: "Remote",
      company: "Acme",
      from: "2026-01-01",
      role: "designer",
      to: "2026-01-31",
      ignored: "not-in-query",
    }),
    "from=2026-01-01&to=2026-01-31&company=Acme&role=designer&location=Remote&source=Referral"
  );
});

await check("omits empty filter values after trimming", () => {
  assert.equal(
    buildAnalyticsQuery({ from: "  ", to: null, company: "  Acme  ", role: undefined, location: "", source: "  " }),
    "company=Acme"
  );
});

await check("URL encodes filter values", () => {
  assert.equal(
    buildAnalyticsQuery({ company: "A & B", location: "New York/NY" }),
    "company=A+%26+B&location=New+York%2FNY"
  );
});

await check("formats numeric rates and unavailable rates", () => {
  assert.equal(formatRate({ value: 42 }), "42%");
  assert.equal(formatRate({ value: null }), "—");
  assert.equal(formatRate({ value: "42" }), "—");
});

await check("formats metric values and explains numerator context", () => {
  assert.equal(formatMetricValue(3.5, " days"), "3.5 days");
  assert.equal(formatMetricValue(Number.NaN), "—");
  assert.equal(rateDetail({ numerator: 4, denominator: 12 }), "4 of 12 submitted applications");
  assert.equal(rateDetail({ numerator: 0, denominator: 0 }), "No eligible records");
});

const chartPaths = [
  "components/analytics/ApplicationsTrendChart.js",
  "components/analytics/PipelineConversionChart.js",
  "components/analytics/DistributionChart.js",
];

for (const chartPath of chartPaths) {
  await check(`${chartPath} exposes an accessible visual and visible data fallback`, async () => {
    const fileUrl = new URL(`../${chartPath}`, import.meta.url);
    const source = await readFile(fileURLToPath(fileUrl), "utf8");
    assert.match(source, /aria-label/);
    assert.match(source, /data-analytics-fallback/);
  });
}

for (const chartPath of [
  "components/analytics/PipelineConversionChart.js",
  "components/analytics/DistributionChart.js",
]) {
  await check(`${chartPath} keeps its semantic fallback list outside image roles`, async () => {
    const fileUrl = new URL(`../${chartPath}`, import.meta.url);
    const source = await readFile(fileURLToPath(fileUrl), "utf8");
    assert.match(source, /<ul\b(?=[^>]*\baria-label=)(?=[^>]*\bdata-analytics-fallback\b)[^>]*>/);
    assert.equal(fallbackListIsNestedInImageRole(source), false);
  });
}

await check("formats average response time with one fractional digit or an em dash", async () => {
  const fileUrl = new URL("../components/analytics/AnalyticsSummary.js", import.meta.url);
  const source = await readFile(fileURLToPath(fileUrl), "utf8");
  assert.match(source, /function formatAverageResponseDays\(value\)\s*{\s*return Number\.isFinite\(value\) \? `\$\{value\.toFixed\(1\)\} days` : "—";\s*}/);
  assert.match(source, /value: formatAverageResponseDays\(summary\.averageResponseDays\)/);
});

const taskSixComponentPaths = [
  "components/analytics/MatchScorePatterns.js",
  "components/analytics/ResumePerformance.js",
  "components/analytics/EvidenceBadge.js",
  "components/analytics/KeywordTrends.js",
  "components/analytics/SkillGapRoadmap.js",
  "components/analytics/SkillGapEditor.js",
  "components/analytics/MetricDefinitions.js",
  "components/analytics/DataQualityNotice.js",
];

async function readComponent(componentPath) {
  const fileUrl = new URL(`../${componentPath}`, import.meta.url);
  return readFile(fileURLToPath(fileUrl), "utf8");
}

await check("includes every Task 6 analytics panel", async () => {
  await Promise.all(taskSixComponentPaths.map(readComponent));
});

await check("renders evidence levels as readable labels rather than color alone", async () => {
  const source = await readComponent("components/analytics/EvidenceBadge.js");
  for (const label of ["Strong evidence", "Partial evidence", "Weak evidence", "No evidence"]) {
    assert.match(source, new RegExp(label));
  }
  assert.match(source, /aria-label/);
});

await check("makes the performance minimum-data warning visible with its approved wording", async () => {
  const source = await readComponent("components/analytics/ResumePerformance.js");
  assert.match(source, /Not enough applications to identify a reliable pattern\./);
  assert.match(source, /Patterns describe your current records\. They do not prove that a resume design, profile, or match score caused an outcome\./);
});

await check("associates roadmap editor controls with visible labels", async () => {
  const [roadmap, editor] = await Promise.all([
    readComponent("components/analytics/SkillGapRoadmap.js"),
    readComponent("components/analytics/SkillGapEditor.js"),
  ]);
  assert.match(roadmap, /<button[^>]*>\s*Edit\s*<\/button>/);
  for (const field of ["importance", "learningStatus", "notes", "portfolioOpportunity"]) {
    assert.match(editor, new RegExp(`<label[^>]*htmlFor=["']skill-gap-${field}["']`));
    assert.match(editor, new RegExp(`id=["']skill-gap-${field}["']`));
  }
});

await check("limits the editor to approved importance and learning-status values", async () => {
  const source = await readComponent("components/analytics/SkillGapEditor.js");
  assert.match(source, /const IMPORTANCE_OPTIONS = \["High", "Medium", "Low"\];/);
  assert.match(source, /const LEARNING_STATUS_OPTIONS = \["Not Started", "Learning", "Practising", "Used in Project", "Added to Portfolio", "Verified in Resume"\];/);
  assert.match(source, /record\.evidenceLevel !== "Strong"/);
  assert.match(source, /Learning progress does not count as resume evidence\. Add and approve real evidence in Master Resume or Achievements first\./);
});

if (failures.length) {
  console.error(`\n${failures.length} analytics client verification failure${failures.length === 1 ? "" : "s"}.`);
  process.exitCode = 1;
} else {
  console.log("\nAnalytics client verification passed.");
}
