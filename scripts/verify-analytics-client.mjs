import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

import {
  FILTER_ORDER,
  buildAnalyticsRequest,
  buildAnalyticsQuery,
  buildSkillGapPatch,
  buildSkillGapRequest,
  createAnalyticsCoordinator,
  filterKeywordTrends,
  formatMetricValue,
  formatRate,
  formatRateWithDetail,
  isSkillGapSaveAllowed,
  rateDetail,
  replaceSkillGapRecordIfCurrent,
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

await check("filters keyword trends without mutating or reordering backend results", () => {
  const trends = [
    { term: "React", category: "Framework", evidenceLevel: "Strong" },
    { term: "Node.js", category: "Runtime", evidenceLevel: "Partial" },
    { term: "TypeScript", category: "Language", evidenceLevel: "Strong" },
    { term: "Next.js", category: "Framework", evidenceLevel: "Strong" },
  ];
  const before = [...trends];

  assert.deepEqual(
    filterKeywordTrends(trends, { category: "Framework", evidenceLevel: "Strong" }).map((trend) => trend.term),
    ["React", "Next.js"]
  );
  assert.deepEqual(trends, before);
  assert.equal(filterKeywordTrends(trends, { category: "Missing" }).length, 0);
});

await check("builds an exact four-field skill-gap patch", () => {
  assert.deepEqual(
    buildSkillGapPatch({
      importance: "High",
      learningStatus: "Learning",
      notes: "Build a sample dashboard",
      portfolioOpportunity: "Analytics case study",
      evidenceLevel: "Strong",
      frequency: 12,
      maliciousExtraField: "do not persist",
    }),
    {
      importance: "High",
      learningStatus: "Learning",
      notes: "Build a sample dashboard",
      portfolioOpportunity: "Analytics case study",
    }
  );
});

await check("allows Verified in Resume only with Strong evidence and rejects a downgraded saved status", () => {
  assert.equal(isSkillGapSaveAllowed({ learningStatus: "Verified in Resume", evidenceLevel: "Strong" }), true);
  assert.equal(isSkillGapSaveAllowed({ learningStatus: "Learning", evidenceLevel: "Partial" }), true);
  assert.equal(isSkillGapSaveAllowed({ learningStatus: "Verified in Resume", evidenceLevel: "Partial" }), false);
  assert.equal(isSkillGapSaveAllowed({ learningStatus: "Verified in Resume", evidenceLevel: null }), false);
});

await check("formats backend rate objects without recomputing their values", () => {
  const backendRate = Object.freeze({ numerator: 2, denominator: 5, value: 63 });
  const unavailableBackendRate = Object.freeze({ numerator: 2, denominator: 5, value: null });

  assert.equal(formatRateWithDetail(backendRate), "2 of 5 submitted applications · 63%");
  assert.equal(formatRateWithDetail(unavailableBackendRate, "responses"), "2 of 5 responses · —");
});

await check("classifies exact empty, partial, and populated analytics payloads", async () => {
  const { analyticsPayloadState } = await import("../lib/analytics/client.js");
  const empty = {
    summary: { totalJobsSaved: 0, applicationCount: 0 },
    statusDistribution: [],
    keywordTrends: [],
    skillGaps: [],
  };

  assert.equal(analyticsPayloadState(empty), "empty");
  assert.equal(analyticsPayloadState({ ...empty, summary: { ...empty.summary, totalJobsSaved: 1 } }), "partial");
  assert.equal(analyticsPayloadState({ ...empty, summary: { ...empty.summary, applicationCount: 1 } }), "partial");
  assert.equal(analyticsPayloadState({ ...empty, statusDistribution: [{ label: "Applied", count: 1 }] }), "partial");
  assert.equal(analyticsPayloadState({ ...empty, keywordTrends: [{ term: "Figma" }] }), "partial");
  assert.equal(analyticsPayloadState({ ...empty, skillGaps: [{ id: "skill-gap-figma" }] }), "partial");
  assert.equal(analyticsPayloadState({
    ...empty,
    summary: { totalJobsSaved: 1, applicationCount: 1 },
    statusDistribution: [{ label: "Applied", count: 1 }],
    keywordTrends: [{ term: "Figma" }],
    skillGaps: [{ id: "skill-gap-figma" }],
  }), "populated");
});

await check("replaces only one skill-gap record without mutating the source array", async () => {
  const { replaceSkillGapRecord } = await import("../lib/analytics/client.js");
  const first = Object.freeze({ id: "skill-gap-figma", notes: "Before" });
  const second = Object.freeze({ id: "skill-gap-research", notes: "Keep" });
  const records = Object.freeze([first, second]);
  const replacement = { id: "skill-gap-figma", notes: "After" };
  const result = replaceSkillGapRecord(records, first.id, replacement);

  assert.notEqual(result, records);
  assert.equal(result[0], replacement);
  assert.equal(result[1], second);
  assert.deepEqual(records, [first, second]);
});

await check("replaces a skill-gap record only when its optimistic identity is still installed", async () => {
  const optimistic = { id: "gap", notes: "optimistic" };
  const newer = { id: "gap", notes: "newer" };
  const untouched = { id: "other", notes: "keep" };
  const replacement = { id: "gap", notes: "server" };

  const accepted = replaceSkillGapRecordIfCurrent([optimistic, untouched], "gap", optimistic, replacement);
  assert.equal(accepted.accepted, true);
  assert.equal(accepted.records[0], replacement);
  assert.equal(accepted.records[1], untouched);

  const rejected = replaceSkillGapRecordIfCurrent([newer, untouched], "gap", optimistic, replacement);
  assert.equal(rejected.accepted, false);
  assert.equal(rejected.records[0], newer);
  assert.equal(rejected.records[1], untouched);
});

await check("builds exact analytics and skill-gap request contracts", async () => {
  const controller = new AbortController();
  assert.deepEqual(
    buildAnalyticsRequest({ company: "A & B" }, controller.signal),
    {
      url: "/api/analytics?company=A+%26+B",
      options: { signal: controller.signal },
    }
  );

  const request = buildSkillGapRequest("gap/a b", {
    importance: "High",
    learningStatus: "Learning",
    notes: "Build a dashboard",
    portfolioOpportunity: "Analytics case study",
    evidenceLevel: "Strong",
    frequency: 12,
  }, controller.signal);
  assert.equal(request.url, "/api/skill-gaps/gap%2Fa%20b");
  assert.equal(request.options.method, "PATCH");
  assert.deepEqual(request.options.headers, { "Content-Type": "application/json" });
  assert.equal(request.options.signal, controller.signal);
  assert.deepEqual(JSON.parse(request.options.body), {
    importance: "High",
    learningStatus: "Learning",
    notes: "Build a dashboard",
    portfolioOpportunity: "Analytics case study",
  });
});

await check("suppresses out-of-order load success, error, and final settlement", async () => {
  const coordinator = createAnalyticsCoordinator();
  const first = coordinator.beginLoad();
  const second = coordinator.beginLoad();
  const oldPayload = { skillGaps: [{ id: "gap", notes: "old" }] };
  const newPayload = { skillGaps: [{ id: "gap", notes: "new" }] };

  assert.equal(coordinator.commitLoadSuccess(first, oldPayload).accepted, false);
  assert.equal(coordinator.commitLoadError(first), false);
  assert.equal(coordinator.finishLoad(first), false);
  assert.equal(coordinator.commitLoadSuccess(second, newPayload).accepted, true);
  assert.equal(coordinator.finishLoad(second), true);
});

await check("keeps the newer committed load authoritative after late older settlements", async () => {
  const coordinator = createAnalyticsCoordinator();
  const first = coordinator.beginLoad();
  const second = coordinator.beginLoad();
  const newerPayload = { skillGaps: [{ id: "gap", notes: "newer-authoritative" }] };

  const committed = coordinator.commitLoadSuccess(second, newerPayload);
  assert.equal(committed.accepted, true);
  assert.equal(committed.data, newerPayload);
  assert.equal(coordinator.finishLoad(second), true);

  const lateSuccess = coordinator.commitLoadSuccess(first, { skillGaps: [{ id: "gap", notes: "older-late" }] });
  assert.equal(lateSuccess.accepted, false);
  assert.equal(lateSuccess.data, newerPayload);
  assert.equal(coordinator.commitLoadError(first), false);
  assert.equal(coordinator.finishLoad(first), false);
});

await check("cleanup invalidates a load before its deferred settlement", async () => {
  const coordinator = createAnalyticsCoordinator();
  const load = coordinator.beginLoad();

  coordinator.invalidateLoad();

  assert.equal(coordinator.commitLoadSuccess(load, { skillGaps: [] }).accepted, false);
  assert.equal(coordinator.commitLoadError(load), false);
  assert.equal(coordinator.finishLoad(load), false);
});

await check("rejects every late mutation settlement after cleanup invalidation", async () => {
  const original = { id: "gap", notes: "before-cleanup" };
  const coordinator = createAnalyticsCoordinator({ skillGaps: [original] });
  const mutation = coordinator.beginSkillGapMutation("gap", { notes: "optimistic-before-cleanup" });
  assert.ok(mutation);
  const optimisticData = mutation.data;
  const optimisticRecord = mutation.token.optimisticRecord;

  assert.equal(coordinator.invalidateMutation(), true);

  const lateSuccess = coordinator.commitMutationSuccess(mutation.token, { id: "gap", notes: "late-success" });
  assert.equal(lateSuccess.accepted, false);
  assert.equal(lateSuccess.data, optimisticData);
  assert.equal(lateSuccess.data.skillGaps[0], optimisticRecord);

  const lateFailure = coordinator.commitMutationFailure(mutation.token);
  assert.equal(lateFailure.accepted, false);
  assert.equal(lateFailure.data, optimisticData);
  assert.equal(lateFailure.data.skillGaps[0], optimisticRecord);
  assert.equal(coordinator.finishMutation(mutation.token), false);

  const nextMutation = coordinator.beginSkillGapMutation("gap", { notes: "next-mutation" });
  assert.ok(nextMutation);
  assert.notEqual(nextMutation.token, mutation.token);
  assert.equal(nextMutation.token.previousRecord, optimisticRecord);
});

await check("conditionally accepts optimistic success and isolated rollback", async () => {
  const untouched = { id: "other", notes: "keep" };
  const original = { id: "gap", notes: "before" };
  const coordinator = createAnalyticsCoordinator({ skillGaps: [original, untouched] });
  const success = coordinator.beginSkillGapMutation("gap", { notes: "optimistic" });
  assert.ok(success);
  assert.equal(success.data.skillGaps[0], success.token.optimisticRecord);

  const settled = coordinator.commitMutationSuccess(success.token, { id: "gap", notes: "server" });
  assert.equal(settled.accepted, true);
  assert.deepEqual(settled.data.skillGaps[0], { id: "gap", notes: "server" });
  assert.equal(settled.data.skillGaps[1], untouched);
  assert.equal(coordinator.finishMutation(success.token), true);

  const rollback = coordinator.beginSkillGapMutation("gap", { notes: "again" });
  assert.ok(rollback);
  const restored = coordinator.commitMutationFailure(rollback.token);
  assert.equal(restored.accepted, true);
  assert.equal(restored.data.skillGaps[0], rollback.token.previousRecord);
  assert.equal(restored.data.skillGaps[1], untouched);
});

await check("new datasets and records make late mutation settlement a no-op", async () => {
  const coordinator = createAnalyticsCoordinator({ skillGaps: [{ id: "gap", notes: "before" }] });
  const oldMutation = coordinator.beginSkillGapMutation("gap", { notes: "optimistic-old" });
  assert.ok(oldMutation);
  const refresh = coordinator.beginLoad();
  const newerPayload = { skillGaps: [{ id: "gap", notes: "from-refresh" }] };
  const loaded = coordinator.commitLoadSuccess(refresh, newerPayload);

  assert.equal(loaded.accepted, true);
  assert.equal(loaded.mutationInvalidated, true);
  assert.equal(loaded.data, newerPayload);
  assert.equal(coordinator.commitMutationSuccess(oldMutation.token, { id: "gap", notes: "late-success" }).accepted, false);
  assert.equal(coordinator.commitMutationFailure(oldMutation.token).accepted, false);

  const newerMutation = coordinator.beginSkillGapMutation("gap", { notes: "optimistic-new" });
  assert.ok(newerMutation);
  assert.equal(coordinator.commitMutationSuccess(oldMutation.token, { id: "gap", notes: "older-record" }).accepted, false);
  assert.equal(coordinator.commitMutationFailure(oldMutation.token).accepted, false);
  assert.equal(coordinator.commitMutationSuccess(newerMutation.token, { id: "gap", notes: "new-server" }).accepted, true);
});

await check("wires Task 6 panels to the tested client safety contracts", async () => {
  const [keywords, editor, performance, matchScores] = await Promise.all([
    readFile(fileURLToPath(new URL("../components/analytics/KeywordTrends.js", import.meta.url)), "utf8"),
    readFile(fileURLToPath(new URL("../components/analytics/SkillGapEditor.js", import.meta.url)), "utf8"),
    readFile(fileURLToPath(new URL("../components/analytics/ResumePerformance.js", import.meta.url)), "utf8"),
    readFile(fileURLToPath(new URL("../components/analytics/MatchScorePatterns.js", import.meta.url)), "utf8"),
  ]);
  assert.match(keywords, /filterKeywordTrends\(trends, \{ category, evidenceLevel \}\)/);
  assert.match(editor, /buildSkillGapPatch\(\{ importance, learningStatus, notes, portfolioOpportunity \}\)/);
  assert.match(editor, /isSkillGapSaveAllowed\(\{ learningStatus, evidenceLevel: record\.evidenceLevel \}\)/);
  assert.match(performance, /formatRateWithDetail\(row\.interviewRate\)/);
  assert.match(matchScores, /formatRateWithDetail\(row\.responseRate\)/);
});

await check("enforces both SkillGapEditor safety controls in the UI", async () => {
  const editor = await readFile(fileURLToPath(new URL("../components/analytics/SkillGapEditor.js", import.meta.url)), "utf8");
  const submitMatch = editor.match(/function submit\(event\)\s*\{([\s\S]*?)\n\s*\}\s*\n\s*return\s*\(/);
  assert.ok(submitMatch, "SkillGapEditor submit handler should be structurally identifiable");

  const submitBody = submitMatch[1];
  const guardIndex = submitBody.indexOf("if (needsAllowedStatus) return;");
  const saveIndex = submitBody.indexOf("onSave(");
  assert.notEqual(guardIndex, -1, "submit should return when needsAllowedStatus");
  assert.notEqual(saveIndex, -1, "submit should call onSave for allowed values");
  assert.ok(guardIndex < saveIndex, "submit must return before calling onSave when needsAllowedStatus");

  assert.match(
    editor,
    /<button\b(?=[^>]*\btype\s*=\s*["']submit["'])(?=[^>]*\bdisabled\s*=\s*\{\s*saving\s*\|\|\s*needsAllowedStatus\s*\})[^>]*>[\s\S]*?Save changes[\s\S]*?<\/button>/,
    "Save changes should be disabled while saving or when needsAllowedStatus"
  );
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

await check("keeps the roadmap editor outside responsive record layouts with one error live region", async () => {
  const [roadmap, editor] = await Promise.all([
    readComponent("components/analytics/SkillGapRoadmap.js"),
    readComponent("components/analytics/SkillGapEditor.js"),
  ]);
  assert.equal((roadmap.match(/<SkillGapEditor\b/g) || []).length, 1);
  assert.equal((editor.match(/aria-live=/g) || []).length, 1);
});

await check("limits the editor to approved importance and learning-status values", async () => {
  const source = await readComponent("components/analytics/SkillGapEditor.js");
  assert.match(source, /const IMPORTANCE_OPTIONS = \["High", "Medium", "Low"\];/);
  assert.match(source, /const LEARNING_STATUS_OPTIONS = \["Not Started", "Learning", "Practising", "Used in Project", "Added to Portfolio", "Verified in Resume"\];/);
  assert.match(source, /record\.evidenceLevel !== "Strong"/);
  assert.match(source, /Learning progress does not count as resume evidence\. Add and approve real evidence in Master Resume or Achievements first\./);
});

const taskSevenPanelNames = [
  "AnalyticsHeader",
  "AnalyticsFilters",
  "DataQualityNotice",
  "AnalyticsSummary",
  "ApplicationsTrendChart",
  "PipelineConversionChart",
  "DistributionChart",
  "MatchScorePatterns",
  "ResumePerformance",
  "KeywordTrends",
  "SkillGapRoadmap",
  "MetricDefinitions",
];

async function readAnalyticsPage() {
  return readFile(fileURLToPath(new URL("../app/analytics/page.js", import.meta.url)), "utf8");
}

await check("gives analytics and shared mobile controls 44px touch targets", async () => {
  const sources = await Promise.all([
    readComponent("components/analytics/AnalyticsFilters.js"),
    readComponent("components/analytics/ResumePerformance.js"),
    readComponent("components/analytics/KeywordTrends.js"),
    readComponent("components/analytics/SkillGapRoadmap.js"),
    readComponent("components/analytics/SkillGapEditor.js"),
    readComponent("components/analytics/AnalyticsEmptyState.js"),
    readAnalyticsPage(),
    readComponent("components/navigation/AppShell.js"),
    readComponent("components/navigation/PrivacyModeBadge.js"),
  ]);
  const [filters, performance, keywords, roadmap, editor, emptyState, page, appShell, privacyBadge] = sources;

  assert.match(filters, /const controlClass = `min-h-11/);
  assert.match(filters, /const buttonClass = `min-h-11/);
  assert.match(filters, /summary[^>]*min-h-11/);
  assert.match(performance, /GROUPS\.map\([\s\S]*?className=\{`min-h-11/);
  assert.match(keywords, /const controlClass = `min-h-11/);
  assert.match(roadmap, /<button[^>]*min-w-11[^>]*>Edit<\/button>/);
  assert.match(editor, /const controlClass = `mt-1 min-h-11/);
  assert.match(editor, /type="submit"[^>]*className=\{`min-h-11/);
  assert.match(editor, /type="button"[^>]*className=\{`min-h-11/);
  assert.match(emptyState, /actions\.map\([\s\S]*?inline-flex min-h-11/);
  assert.match(page, /Retry[\s\S]*?<\/button>/);
  assert.match(page, /className="mt-4 min-h-11[^>]*"\s*>\s*Retry/);
  assert.match(appShell, /aria-label="Open navigation menu"[\s\S]*?min-h-11 min-w-11/);
  assert.match(appShell, /aria-label="Close menu"[\s\S]*?min-h-11 min-w-11/);
  assert.match(appShell, /mobile \? "min-h-11" : ""/);
  assert.match(appShell, /<NavLinks pathname=\{pathname\} onNavigate=\{\(\) => setDrawerOpen\(false\)\} mobile \/>/);
  assert.match(privacyBadge, /min-h-11/);
});

await check("replaces PlannedPage with a client analytics controller", async () => {
  const source = await readAnalyticsPage();
  assert.match(source, /^\s*["']use client["'];/);
  assert.doesNotMatch(source, /PlannedPage/);
  assert.doesNotMatch(source, /export const metadata/);
  assert.match(source, /useState/);
  assert.match(source, /useEffect/);
});

await check("loads filtered analytics with abort cleanup and last-data refresh state", async () => {
  const source = await readAnalyticsPage();
  assert.match(source, /buildAnalyticsRequest/);
  assert.match(source, /new AbortController\(\)/);
  assert.match(source, /controller\.signal/);
  assert.match(source, /\.abort\(\)/);
  assert.match(source, /loading/);
  assert.match(source, /refreshing/);
  assert.match(source, /setData/);
});

await check("wires every analytics settlement and cleanup through lifecycle guards", async () => {
  const source = await readAnalyticsPage();
  assert.match(source, /createAnalyticsCoordinator/);
  assert.match(source, /buildAnalyticsRequest/);
  assert.match(source, /commitLoadSuccess\(/);
  assert.match(source, /commitLoadError\(/);
  assert.match(source, /finishLoad\(/);

  const cleanup = source.match(/return \(\) => \{([\s\S]*?)\n\s*\};\n\s*\}, \[loadAnalytics\]\);/);
  assert.ok(cleanup, "analytics effect cleanup should be structurally identifiable");
  assert.ok(cleanup[1].indexOf("invalidateLoad()") < cleanup[1].indexOf(".abort()"), "cleanup must invalidate the load before aborting it");
  assert.ok(
    cleanup[1].indexOf("invalidateMutation()") < cleanup[1].indexOf("activeMutationController?.abort()"),
    "cleanup must invalidate the mutation before aborting it"
  );
});

await check("wires roadmap settlement through mutation identity and revision guards", async () => {
  const source = await readAnalyticsPage();
  assert.match(source, /buildSkillGapRequest/);
  assert.match(source, /beginSkillGapMutation\(/);
  assert.match(source, /commitMutationSuccess\(/);
  assert.match(source, /commitMutationFailure\(/);
  assert.match(source, /finishMutation\(/);
  assert.match(source, /mutationInvalidated/);
});

await check("keeps filters mounted and exposes persistent polite refresh status", async () => {
  const [page, filters] = await Promise.all([
    readAnalyticsPage(),
    readComponent("components/analytics/AnalyticsFilters.js"),
  ]);
  assert.doesNotMatch(filters, /key=\{filterKey\}/);
  assert.doesNotMatch(filters, /const filterKey\s*=/);
  assert.doesNotMatch(filters, /useEffect/);
  assert.match(filters, /if \(filters !== draftState\.filters\) \{\s*setDraftState\(\{ filters, values: normalizedFilters\(filters\) \}\);\s*\}/);
  assert.match(page, /role=["']status["']/);
  assert.match(page, /aria-live=["']polite["']/);
  assert.match(page, /Refreshing analytics/);
  assert.match(page, /Analytics refresh complete/);
});

await check("renders actionable loading, initial-error, empty, partial, and populated states", async () => {
  const source = await readAnalyticsPage();
  assert.match(source, /AnalyticsLoadingState/);
  assert.match(source, /AnalyticsEmptyState/);
  assert.match(source, /Retry/);
  assert.match(source, /Save a Job/);
  assert.match(source, /Tailor a Resume/);
  assert.match(source, /aria-live=["']assertive["']/);
  assert.match(source, /updateError/);
  assert.match(source, /partial/);
  assert.match(source, /populated/);
});

await check("composes every approved panel in the required order", async () => {
  const source = await readAnalyticsPage();
  let previousIndex = -1;
  for (const panelName of taskSevenPanelNames) {
    const panelIndex = source.indexOf(`<${panelName}`);
    assert.ok(panelIndex > previousIndex, `${panelName} should render after the preceding approved panel`);
    previousIndex = panelIndex;
  }
});

await check("sends safe optimistic skill-gap updates through the encoded PATCH route", async () => {
  const source = await readAnalyticsPage();
  assert.match(source, /buildSkillGapPatch/);
  assert.match(source, /buildSkillGapRequest/);
  assert.match(source, /beginSkillGapMutation/);
  assert.match(source, /commitMutationSuccess/);
  assert.match(source, /commitMutationFailure/);
  assert.match(source, /updatingId/);
  assert.match(source, /skillGap/);
});

if (failures.length) {
  console.error(`\n${failures.length} analytics client verification failure${failures.length === 1 ? "" : "s"}.`);
  process.exitCode = 1;
} else {
  console.log("\nAnalytics client verification passed.");
}
