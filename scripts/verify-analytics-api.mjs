import { isDeepStrictEqual } from "node:util";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { parseAnalyticsFilters } from "../lib/analytics/filters.js";
import { ANALYTICS_DEFINITIONS, getAnalytics } from "../lib/analytics.js";
import {
  createAnalyticsGetHandler,
  GET as getAnalyticsRoute,
  dynamic,
} from "../app/api/analytics/route.js";
import {
  createSkillGapPatchHandler,
  PATCH as patchSkillGapRoute,
} from "../app/api/skill-gaps/[id]/route.js";

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

function same(actual, expected) {
  return isDeepStrictEqual(actual, expected);
}

async function withoutExpectedErrorLog(operation) {
  const original = console.error;
  console.error = () => {};
  try {
    return await operation();
  } finally {
    console.error = original;
  }
}

function hasForbiddenKey(value, forbiddenKeys) {
  if (!value || typeof value !== "object") return false;
  if (Array.isArray(value)) return value.some((item) => hasForbiddenKey(item, forbiddenKeys));
  return Object.entries(value).some(([key, item]) => forbiddenKeys.has(key) || hasForbiddenKey(item, forbiddenKeys));
}

const EMPTY_FILTERS = { from: "", to: "", company: "", role: "", location: "", source: "" };

console.log("analytics filter parsing");
check(
  "always returns the complete empty filter shape",
  same(parseAnalyticsFilters(new URLSearchParams()).filters, EMPTY_FILTERS)
);

const invalidRange = parseAnalyticsFilters(new URLSearchParams("from=2026-08-10&to=2026-08-01"));
check(
  "rejects a reversed date range",
  invalidRange.errors.includes("The start date must be on or before the end date."),
  JSON.stringify(invalidRange)
);

const valid = parseAnalyticsFilters(new URLSearchParams(
  "from=2026-08-01&company=Google%20%26%20Co&role=Product%20Designer&location=%20New%20%20York%20&source=LinkedIn&company=ignored&unknown=value"
));
check(
  "normalizes approved filters, ignores unknowns, and uses the first repeated value",
  same(valid, {
    filters: {
      from: "2026-08-01",
      to: "",
      company: "google-and-co",
      role: "product-designer",
      location: "new york",
      source: "linkedin",
    },
    errors: [],
  }),
  JSON.stringify(valid)
);

for (const value of ["2026-8-01", "2026-02-30", "2026-13-01"]) {
  const parsed = parseAnalyticsFilters(new URLSearchParams({ from: value }));
  check(`rejects malformed or unreal date ${value}`, parsed.errors.length === 1, JSON.stringify(parsed));
}

for (const key of ["company", "role", "location", "source"]) {
  const tooLong = parseAnalyticsFilters(new URLSearchParams({ [key]: "x".repeat(121) }));
  check(`caps ${key} at 120 characters`, tooLong.errors.length === 1, JSON.stringify(tooLong));
}

for (const [key, value] of [["company", "safe/unsafe"], ["role", "safe\\unsafe"], ["location", "safe\0unsafe"], ["source", "safe/unsafe"]]) {
  const unsafe = parseAnalyticsFilters(new URLSearchParams({ [key]: value }));
  check(`rejects path characters in ${key}`, unsafe.errors.length === 1, JSON.stringify(unsafe));
}

const privateResumeSentence = "This private resume sentence contains a complete confidential account of a product launch, customer research, business metrics, internal decisions, and named stakeholder conversations that must never be returned by analytics in full to the browser under any circumstances.";
const privateJobSentence = "This private job-description sentence contains the complete confidential hiring brief for Figma, product analytics, stakeholder management, accessibility, and design systems, and it must never be returned by analytics in full to the browser under any circumstances.";

const lightApplications = [
  { id: "app-google", company: "Google", companySlug: "google", role: "Product Designer", roleSlug: "product-designer", location: "New York", applicationDate: "2026-08-01", status: "Applied", matchScore: 84 },
  { id: "app-stripe", company: "Stripe", companySlug: "stripe", role: "UX Designer", roleSlug: "ux-designer", location: "Remote", applicationDate: "2026-07-20", status: "Rejected", matchScore: 70 },
  { id: "bad-full", company: "Broken Co", companySlug: "broken-co", role: "Designer", roleSlug: "designer", applicationDate: "2026-08-02", status: "Saved" },
  { id: "bad-activity", company: "Activity Co", companySlug: "activity-co", role: "Designer", roleSlug: "designer", applicationDate: "2026-08-03", status: "Applied" },
];

const fullApplications = new Map([
  ["app-google", {
    ...lightApplications[0],
    applicationSource: "Referral",
    submittedAt: "2026-08-01T09:00:00.000Z",
    jobDescription: privateJobSentence,
    originalResume: privateResumeSentence,
    resumeVariant: "v4",
    baseProfileId: "product-design",
    submittedResumeVersion: "r4",
    mode: "local",
  }],
  ["app-stripe", {
    ...lightApplications[1],
    applicationSource: "LinkedIn",
    submittedAt: "2026-07-20T09:00:00.000Z",
    jobDescription: privateJobSentence,
    originalResume: privateResumeSentence,
    resumeVariant: "v3",
    baseProfileId: "ux-design",
    submittedResumeVersion: "r3",
    mode: "ai",
  }],
  ["bad-full", null],
  ["bad-activity", { ...lightApplications[3], applicationSource: "Referral", jobDescription: "React leadership." }],
]);

const activities = new Map([
  ["app-google", [
    { type: "status_changed", to: "Applied", createdAt: "2026-08-01T09:00:00.000Z" },
    { type: "status_changed", to: "Recruiter Screen", createdAt: "2026-08-02T09:00:00.000Z" },
  ]],
  ["app-stripe", [
    { type: "status_changed", to: "Applied", createdAt: "2026-07-20T09:00:00.000Z" },
    { type: "status_changed", to: "Rejected", createdAt: "2026-07-22T09:00:00.000Z" },
  ]],
  ["bad-full", []],
]);

const jobs = [
  { id: "job-google", company: "Google", companySlug: "google", role: "Product Designer", roleSlug: "product-designer", location: "New York", source: "Referral", dateSaved: "2026-08-02", jobDescription: privateJobSentence },
  { id: "job-stripe", company: "Stripe", companySlug: "stripe", role: "UX Designer", roleSlug: "ux-designer", location: "Remote", source: "LinkedIn", dateSaved: "2026-07-21", jobDescription: "Product analytics and leadership are central to this role." },
  { id: "job-google-engineer", company: "Google", companySlug: "google", role: "Frontend Engineer", roleSlug: "frontend-engineer", location: "Remote", source: "", dateSaved: "2026-08-03", jobDescription: "React and accessibility are required." },
];

const sequence = [];
const loadedFull = [];
const loadedActivity = [];
let syncCalls = 0;
let synchronizedInput = [];

const dependencies = {
  async listApplications() {
    return { summary: { corrupted: 1 }, companies: [{ name: "All", slug: "all", applications: lightApplications }] };
  },
  async getApplication(id, options) {
    loadedFull.push({ id, options });
    return fullApplications.get(id);
  },
  async getActivity(id) {
    loadedActivity.push(id);
    if (id === "bad-activity") throw new Error("corrupt activity document");
    return activities.get(id) || [];
  },
  async listJobs() {
    return { jobs, corrupted: 2 };
  },
  async getMaster() {
    return {
      entries: [{ id: "master-1", status: "Approved", skills: ["Figma"], bullets: [privateResumeSentence] }],
      corrupted: 3,
    };
  },
  async listAchievements() {
    return { achievements: [{ id: "achievement-1", evidence: "A signed project artifact.", skills: ["Accessibility"] }], corrupted: 4 };
  },
  async listReminders() {
    return {
      reminders: [
        { id: "reminder-google", applicationId: "app-google", type: "Application Follow-up", status: "Completed", dueDate: "2026-08-02" },
        { id: "reminder-stripe", applicationId: "app-stripe", type: "Application Follow-up", status: "Pending", dueDate: "2026-07-25" },
        { id: "reminder-corrupt", applicationId: "bad-full", type: "Application Follow-up", status: "Completed", dueDate: "2026-08-02" },
        { id: "reminder-missing", applicationId: "missing-app", type: "Recruiter Follow-up", status: "Completed", dueDate: "2026-08-02" },
        { id: "reminder-unlinked", applicationId: "", type: "Referral Follow-up", status: "Completed", dueDate: "2026-08-02" },
      ],
      corrupted: 5,
    };
  },
  async listSkillGaps() {
    sequence.push("list");
    return {
      skillGaps: [{ id: "skill-gap-product-analytics", notes: "stale list value" }],
      corrupted: 6,
    };
  },
  async syncSkillGaps(gaps) {
    sequence.push("sync");
    syncCalls += 1;
    synchronizedInput = gaps;
    return {
      skillGaps: gaps.map((gap) => ({
        id: gap.id,
        skill: gap.skill,
        skillSlug: gap.skillSlug,
        category: gap.category,
        frequency: gap.count,
        percentage: gap.percentage,
        evidenceLevel: gap.evidenceLevel,
        evidenceExplanation: gap.evidenceExplanation,
        relatedJobs: gap.relatedJobs,
        importance: gap.id === "skill-gap-product-analytics" ? "High" : "Low",
        importanceSource: "user",
        learningStatus: gap.id === "skill-gap-product-analytics" ? "Learning" : "Not Started",
        notes: gap.id === "skill-gap-product-analytics" ? "global synchronized note" : "",
        portfolioOpportunity: gap.id === "skill-gap-product-analytics" ? "Build a funnel case study" : "",
        createdAt: "2026-08-01T00:00:00.000Z",
        updatedAt: "2026-08-04T00:00:00.000Z",
      })),
      corrupted: 7,
    };
  },
};

const filtered = await getAnalytics({
  from: "2026-08-01",
  to: "",
  company: "google",
  role: "",
  location: "",
  source: "",
}, dependencies);

console.log("aggregate orchestration and privacy");
check(
  "returns the exact approved top-level response fields",
  same(Object.keys(filtered), [
    "filters", "filterOptions", "summary", "definitions", "applicationsOverTime", "pipeline",
    "statusDistribution", "breakdowns", "matchScorePatterns", "resumePerformance", "keywordTrends",
    "skillGaps", "dataQuality",
  ]),
  JSON.stringify(Object.keys(filtered))
);
check(
  "uses immutable exact metric definitions",
  filtered.definitions === ANALYTICS_DEFINITIONS && Object.isFrozen(filtered.definitions) &&
    Object.keys(filtered.definitions).length === 10 &&
    filtered.definitions.causationNotice === "Patterns describe your current records. They do not prove that a resume design, profile, or match score caused an outcome.",
  JSON.stringify(filtered.definitions)
);
check(
  "applies filters to application and Job Library totals",
  filtered.summary.applicationCount === 1 && filtered.summary.totalJobsSaved === 2,
  JSON.stringify(filtered.summary)
);
check(
  "applies filters to follow-ups, trends, pipeline, breakdowns, and resume performance",
  filtered.summary.followUpCompletionRate.value === 100 &&
    filtered.pipeline[0]?.count === 1 &&
    filtered.breakdowns.companies.length === 1 && filtered.breakdowns.companies[0].key === "google" &&
    filtered.resumePerformance.variants.length === 1 &&
    filtered.keywordTrends.some((trend) => trend.term === "Product analytics") &&
    !filtered.keywordTrends.some((trend) => trend.term === "Leadership"),
  JSON.stringify({ summary: filtered.summary, pipeline: filtered.pipeline, breakdowns: filtered.breakdowns, keywordTrends: filtered.keywordTrends })
);
check(
  "derives complete unfiltered sorted filter options from applications and jobs",
  same(filtered.filterOptions, {
    companies: [{ value: "google", label: "Google" }, { value: "stripe", label: "Stripe" }],
    roles: [
      { value: "frontend-engineer", label: "Frontend Engineer" },
      { value: "product-designer", label: "Product Designer" },
      { value: "ux-designer", label: "UX Designer" },
    ],
    locations: [{ value: "new york", label: "New York" }, { value: "remote", label: "Remote" }],
    sources: [
      { value: "linkedin", label: "LinkedIn" },
      { value: "referral", label: "Referral" },
      { value: "unspecified", label: "Unspecified" },
    ],
  }),
  JSON.stringify(filtered.filterOptions)
);
check(
  "loads full applications and activity independently and skips corrupt records",
  loadedFull.length === 4 && loadedFull.every((call) => call.options?.full === true) &&
    loadedActivity.length === 4 && loadedActivity.includes("bad-full") &&
    filtered.dataQuality.corruptedRecords === 30,
  JSON.stringify({ loadedFull, loadedActivity, dataQuality: filtered.dataQuality })
);
check(
  "deduplicates filtered descriptions before keyword analysis",
  filtered.dataQuality.analyzedJobDescriptions === 2 && filtered.dataQuality.duplicateJobDescriptions === 1,
  JSON.stringify(filtered.dataQuality)
);
check(
  "lists once before synchronizing the global active gap set once",
  same(sequence, ["list", "sync"]) && syncCalls === 1 &&
    synchronizedInput.some((gap) => gap.id === "skill-gap-leadership") &&
    synchronizedInput.find((gap) => gap.id === "skill-gap-product-analytics")?.count === 2,
  JSON.stringify({ sequence, syncCalls, synchronizedInput })
);

const productAnalyticsGap = filtered.skillGaps.find((gap) => gap.id === "skill-gap-product-analytics");
check(
  "keeps filtered gap derivation while overlaying only synchronized user-managed fields",
  productAnalyticsGap?.count === 1 && productAnalyticsGap?.frequency === 1 && productAnalyticsGap?.percentage === 50 &&
    productAnalyticsGap?.learningStatus === "Learning" && productAnalyticsGap?.notes === "global synchronized note" &&
    productAnalyticsGap?.portfolioOpportunity === "Build a funnel case study" &&
    !filtered.skillGaps.some((gap) => gap.id === "skill-gap-leadership"),
  JSON.stringify(filtered.skillGaps)
);
check(
  "returns deterministic de-duplicated data-quality warnings",
  filtered.dataQuality.warnings.length === new Set(filtered.dataQuality.warnings).size &&
    filtered.dataQuality.warnings.includes("Not enough applications to identify a reliable pattern.") &&
    filtered.dataQuality.warnings.includes("30 corrupted records were skipped."),
  JSON.stringify(filtered.dataQuality.warnings)
);

const serialized = JSON.stringify(filtered);
check(
  "never returns full resume or job-description sentences",
  !serialized.includes(privateResumeSentence) && !serialized.includes(privateJobSentence),
  serialized
);

const unfiltered = await getAnalytics(EMPTY_FILTERS, dependencies);
const broadlyFiltered = await getAnalytics({
  ...EMPTY_FILTERS,
  from: "2026-07-01",
  to: "2026-08-31",
}, dependencies);
check(
  "follow-up metrics always exclude reminders without a successfully loaded application",
  same(unfiltered.summary.followUpCompletionRate, { numerator: 1, denominator: 2, value: 50 }) &&
    same(broadlyFiltered.summary.followUpCompletionRate, { numerator: 1, denominator: 2, value: 50 }),
  JSON.stringify({
    unfiltered: unfiltered.summary.followUpCompletionRate,
    broadlyFiltered: broadlyFiltered.summary.followUpCompletionRate,
  })
);

console.log("route validation and cache policy");
const successfulGetHandler = createAnalyticsGetHandler(async (filters) => ({ kind: "aggregate", filters }));
const successfulGet = await successfulGetHandler(new Request("http://localhost/api/analytics?company=Google"));
const successfulGetBody = await successfulGet.json();
check(
  "analytics GET returns successful aggregate JSON with no-store",
  successfulGet.status === 200 && successfulGet.headers.get("cache-control") === "no-store" &&
    same(successfulGetBody, { kind: "aggregate", filters: { ...EMPTY_FILTERS, company: "google" } }),
  JSON.stringify({ status: successfulGet.status, headers: Object.fromEntries(successfulGet.headers), body: successfulGetBody })
);

const failedGetHandler = createAnalyticsGetHandler(async () => { throw new Error("analytics fixture failure"); });
const failedGet = await withoutExpectedErrorLog(() => failedGetHandler(new Request("http://localhost/api/analytics")));
const failedGetBody = await failedGet.json();
check(
  "analytics GET maps unexpected failures to the approved 500 body",
  failedGet.status === 500 && same(failedGetBody, { error: "Unable to load analytics." }),
  JSON.stringify({ status: failedGet.status, body: failedGetBody })
);

const invalidGet = await getAnalyticsRoute(new Request("http://localhost/api/analytics?from=2026-02-30"));
const invalidGetBody = await invalidGet.json();
check(
  "analytics GET returns the approved 400 shape for malformed dates",
  invalidGet.status === 400 && typeof invalidGetBody.error === "string" &&
    Array.isArray(invalidGetBody.errors) && invalidGetBody.errors[0] === invalidGetBody.error,
  JSON.stringify({ status: invalidGet.status, body: invalidGetBody })
);
check("analytics GET is force-dynamic", dynamic === "force-dynamic", String(dynamic));

const traversalPatch = await patchSkillGapRoute(
  new Request("http://localhost/api/skill-gaps/unsafe", { method: "PATCH", body: JSON.stringify({ notes: "x" }) }),
  { params: Promise.resolve({ id: "skill-gap-product-analytics%2F.." }) }
);
check("skill-gap PATCH rejects a decoded path separator", traversalPatch.status === 400, String(traversalPatch.status));

const invalidJsonPatch = await patchSkillGapRoute(
  new Request("http://localhost/api/skill-gaps/skill-gap-product-analytics", { method: "PATCH", body: "{" }),
  { params: Promise.resolve({ id: "skill-gap-product-analytics" }) }
);
check("skill-gap PATCH rejects malformed JSON", invalidJsonPatch.status === 400, String(invalidJsonPatch.status));

const invalidFieldPatch = await patchSkillGapRoute(
  new Request("http://localhost/api/skill-gaps/skill-gap-product-analytics", { method: "PATCH", body: JSON.stringify({ evidenceLevel: "Strong" }) }),
  { params: Promise.resolve({ id: "skill-gap-product-analytics" }) }
);
const invalidFieldBody = await invalidFieldPatch.json();
check(
  "skill-gap PATCH forwards known validation errors as 400",
  invalidFieldPatch.status === 400 && invalidFieldBody.error === "Unknown skill-gap field: evidenceLevel.",
  JSON.stringify({ status: invalidFieldPatch.status, body: invalidFieldBody })
);

const successfulPatchHandler = createSkillGapPatchHandler(async (id, patch) => ({ id, ...patch }));
const successfulPatch = await successfulPatchHandler(
  new Request("http://localhost/api/skill-gaps/skill-gap-product-analytics", {
    method: "PATCH",
    body: JSON.stringify({ notes: "Updated note" }),
  }),
  { params: Promise.resolve({ id: "skill-gap-product-analytics" }) }
);
const successfulPatchBody = await successfulPatch.json();
check(
  "skill-gap PATCH returns the updated record with no-store",
  successfulPatch.status === 200 && successfulPatch.headers.get("cache-control") === "no-store" &&
    same(successfulPatchBody, {
      ok: true,
      skillGap: { id: "skill-gap-product-analytics", notes: "Updated note" },
    }),
  JSON.stringify({ status: successfulPatch.status, headers: Object.fromEntries(successfulPatch.headers), body: successfulPatchBody })
);

const missingPatchHandler = createSkillGapPatchHandler(async () => null);
const missingPatch = await missingPatchHandler(
  new Request("http://localhost/api/skill-gaps/skill-gap-product-analytics", {
    method: "PATCH",
    body: JSON.stringify({ notes: "Missing" }),
  }),
  { params: Promise.resolve({ id: "skill-gap-product-analytics" }) }
);
const missingPatchBody = await missingPatch.json();
check(
  "skill-gap PATCH returns the approved 404 body for a missing record",
  missingPatch.status === 404 && same(missingPatchBody, { error: "Skill gap no longer exists." }),
  JSON.stringify({ status: missingPatch.status, body: missingPatchBody })
);

const failedPatchHandler = createSkillGapPatchHandler(async () => { throw new Error("skill-gap fixture failure"); });
const failedPatch = await withoutExpectedErrorLog(() => failedPatchHandler(
  new Request("http://localhost/api/skill-gaps/skill-gap-product-analytics", {
    method: "PATCH",
    body: JSON.stringify({ notes: "Failure" }),
  }),
  { params: Promise.resolve({ id: "skill-gap-product-analytics" }) }
));
const failedPatchBody = await failedPatch.json();
check(
  "skill-gap PATCH maps unexpected failures to the approved 500 body",
  failedPatch.status === 500 && same(failedPatchBody, { error: "Unable to update skill gap." }),
  JSON.stringify({ status: failedPatch.status, body: failedPatchBody })
);

console.log("default analytics dependencies and fixture privacy");
const originalStorageDriver = process.env.STORAGE_DRIVER;
const originalDataRoot = process.env.RESUME_TAILOR_DATA_ROOT;
const isolatedDataRoot = await mkdtemp(path.join(tmpdir(), "resume-editor-analytics-api-"));
let defaultAnalytics;
try {
  process.env.STORAGE_DRIVER = "fs";
  process.env.RESUME_TAILOR_DATA_ROOT = isolatedDataRoot;
  defaultAnalytics = await getAnalytics(EMPTY_FILTERS);
} finally {
  if (originalStorageDriver === undefined) delete process.env.STORAGE_DRIVER;
  else process.env.STORAGE_DRIVER = originalStorageDriver;
  if (originalDataRoot === undefined) delete process.env.RESUME_TAILOR_DATA_ROOT;
  else process.env.RESUME_TAILOR_DATA_ROOT = originalDataRoot;
  await rm(isolatedDataRoot, { recursive: true, force: true });
}

const copiedFixtureDescription = (await readFile(
  path.join(process.cwd(), "history", "google", "2026-08-03", "product-designer-154150", "job-description.txt"),
  "utf8"
)).trim();
const copiedFixtureResume = (await readFile(
  path.join(process.cwd(), "history", "google", "2026-08-03", "product-designer-154150", "original-resume.txt"),
  "utf8"
)).trim();
const defaultSerialized = JSON.stringify(defaultAnalytics);
check(
  "real default dependencies return the approved aggregate response shape",
  same(Object.keys(defaultAnalytics), [
    "filters", "filterOptions", "summary", "definitions", "applicationsOverTime", "pipeline",
    "statusDistribution", "breakdowns", "matchScorePatterns", "resumePerformance", "keywordTrends",
    "skillGaps", "dataQuality",
  ]) && Array.isArray(defaultAnalytics.pipeline) && Array.isArray(defaultAnalytics.keywordTrends) &&
    Array.isArray(defaultAnalytics.skillGaps),
  JSON.stringify(Object.keys(defaultAnalytics))
);
check(
  "real default dependencies expose no raw source fields or copied fixture text",
  !hasForbiddenKey(defaultAnalytics, new Set([
    "jobDescription", "originalResume", "tailoredResume", "coverLetterText", "matchReport",
    "fitReport", "resumeDiff", "qualityReport", "fileList", "activity",
  ])) && !defaultSerialized.includes(copiedFixtureDescription) && !defaultSerialized.includes(copiedFixtureResume),
  JSON.stringify({ hasDescription: defaultSerialized.includes(copiedFixtureDescription), hasResume: defaultSerialized.includes(copiedFixtureResume) })
);

console.log(`\n${passed} passed, ${failed} failed`);
if (failed) process.exit(1);
