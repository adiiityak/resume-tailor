import {
  applicationFacts,
  buildApplicationAnalytics,
  filterApplications,
  rate,
} from "../lib/analytics/core.js";
import { isDeepStrictEqual } from "node:util";

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

const appliedThenRejected = {
  id: "a1",
  company: "Google",
  companySlug: "google",
  role: "Product Designer",
  roleSlug: "product-designer",
  location: "New York",
  applicationSource: "Referral",
  status: "Rejected",
  submittedAt: "2026-07-01T09:00:00.000Z",
  matchScore: 82,
  resumeVariant: "v4",
  baseProfileId: "product-designer",
  submittedResumeVersion: "r4",
  mode: "local",
  activity: [
    { type: "status_changed", to: "Applied", createdAt: "2026-07-01T09:00:00.000Z" },
    { type: "status_changed", to: "Interviewing", createdAt: "2026-07-05T09:00:00.000Z" },
    { type: "status_changed", to: "Rejected", createdAt: "2026-07-10T09:00:00.000Z" },
  ],
};

const applications = [
  appliedThenRejected,
  {
    id: "a2",
    company: "Google",
    companySlug: "google",
    role: "Product Designer",
    roleSlug: "product-designer",
    location: "New York",
    applicationSource: "",
    status: "Offer",
    submittedAt: "2026-07-02T09:00:00.000Z",
    matchScore: 93,
    resumeVariant: "v4",
    baseProfileId: "product-designer",
    submittedResumeVersion: "r4",
    mode: "ai",
    activity: [
      { type: "status_changed", to: "Applied", createdAt: "2026-07-02T09:00:00.000Z" },
      { type: "status_changed", to: "Recruiter Screen", createdAt: "2026-07-03T09:00:00.000Z" },
      { type: "status_changed", to: "Offer", createdAt: "2026-07-09T09:00:00.000Z" },
    ],
  },
  {
    id: "a3",
    company: "Stripe",
    companySlug: "stripe",
    role: "UX Designer",
    roleSlug: "ux-designer",
    location: "Remote",
    applicationSource: "LinkedIn",
    status: "Assessment",
    submittedAt: "2026-07-06T09:00:00.000Z",
    matchScore: 68,
    resumeVariant: "v4",
    baseProfileId: "ux-designer",
    submittedResumeVersion: "r3",
    mode: "local",
    activity: [
      { type: "status_changed", to: "Applied", createdAt: "2026-07-06T09:00:00.000Z" },
      { type: "status_changed", to: "Assessment", createdAt: "2026-07-08T09:00:00.000Z" },
    ],
  },
  {
    id: "a4",
    company: "Google",
    companySlug: "google",
    role: "Product Designer",
    roleSlug: "product-designer",
    location: "New York",
    applicationSource: "Referral",
    status: "Applied",
    submittedAt: "2026-07-07T09:00:00.000Z",
    matchScore: 77,
    resumeVariant: "v4",
    baseProfileId: "product-designer",
    submittedResumeVersion: "r4",
    mode: "local",
    activity: [{ type: "status_changed", to: "Applied", createdAt: "2026-07-07T09:00:00.000Z" }],
  },
  {
    id: "a5",
    company: "Acme",
    companySlug: "acme",
    role: "Product Designer",
    roleSlug: "product-designer",
    location: "New York",
    applicationSource: "Referral",
    status: "Rejected",
    statusUpdatedAt: "2026-07-08T09:00:00.000Z",
    applicationDate: "2026-07-07",
    matchScore: null,
    resumeVariant: "v3",
    baseProfileId: "product-designer",
    submittedResumeVersion: "r3",
    mode: "local",
    activity: [],
  },
  {
    id: "a6",
    company: "Google",
    companySlug: "google",
    role: "Product Designer",
    roleSlug: "product-designer",
    location: "New York",
    applicationSource: "Referral",
    status: "Saved",
    createdAt: "2026-07-08T09:00:00.000Z",
    matchScore: 88,
    resumeVariant: "v4",
    baseProfileId: "product-designer",
    submittedResumeVersion: "r4",
    mode: "local",
    activity: [],
  },
];

console.log("application facts");
const facts = applicationFacts(appliedThenRejected);
check("submitted from history", facts.submitted);
check("historical interview retained", facts.interviewed);
check("rejection retained", facts.rejected);
check("response time uses first response", facts.responseHours === 96, JSON.stringify(facts));
check(
  "canonical de-duplicated stages include current status",
  same(facts.stagesReached, ["Applied", "Interviewing", "Rejected"]),
  JSON.stringify(facts.stagesReached)
);
check(
  "current response status falls back to status update time",
  same(applicationFacts(applications[4]), {
    submitted: true,
    responded: true,
    screened: false,
    interviewed: false,
    offered: false,
    rejected: true,
    submittedAt: "2026-07-08T09:00:00.000Z",
    firstResponseAt: "2026-07-08T09:00:00.000Z",
    responseHours: 0,
    stagesReached: ["Rejected"],
  })
);
check(
  "response time excludes an out-of-order response",
  applicationFacts({
    submittedAt: "2026-07-05T00:00:00.000Z",
    status: "Assessment",
    activity: [{ type: "status_changed", to: "Assessment", createdAt: "2026-07-04T00:00:00.000Z" }],
  }).responseHours === null
);

console.log("rates and aggregates");
check("zero denominator rate has an unavailable value", same(rate(0, 0), { value: null, numerator: 0, denominator: 0 }));
const analytics = buildApplicationAnalytics({
  applications,
  reminders: [
    { type: "Application follow-up", status: "Completed", dueDate: "2026-07-01" },
    { type: "recruiter FOLLOW-UP", status: "Pending", dueDate: "2026-07-10" },
    { type: "Referral follow-up", status: "Pending", dueDate: "2026-07-20" },
    { type: "Interview reminder", status: "Completed", dueDate: "2026-07-01" },
    { type: "Application follow-up", status: "Pending", dueDate: "not-a-date" },
  ],
  now: new Date("2026-07-12T12:00:00.000Z"),
});
check(
  "summary preserves counts and rate denominators",
  same(analytics.summary.responseRate, { value: 80, numerator: 4, denominator: 5 }) &&
    analytics.summary.applicationCount === 6 &&
    analytics.summary.submittedApplications === 5 &&
    analytics.summary.averageMatchScore === 82 &&
    analytics.summary.averageResponseDays === 1.8 &&
    analytics.summary.responseTimeSampleSize === 4,
  JSON.stringify(analytics.summary)
);
check(
  "follow-up completion only uses due-or-completed eligible reminders",
  same(analytics.summary.followUpCompletionRate, { value: 50, numerator: 1, denominator: 2 })
);
check(
  "weekly grouping uses UTC Monday and ascending periods",
  same(analytics.applicationsOverTime, [
    { period: "2026-06-29", label: "Jun 29", count: 2 },
    { period: "2026-07-06", label: "Jul 6", count: 3 },
  ]),
  JSON.stringify(analytics.applicationsOverTime)
);
check(
  "pipeline measures historical reach from submitted applications",
  same(analytics.pipeline, [
    { stage: "Submitted", count: 5, percentage: 100 },
    { stage: "Responded", count: 4, percentage: 80 },
    { stage: "Recruiter Screen", count: 2, percentage: 40 },
    { stage: "Interviewing", count: 2, percentage: 40 },
    { stage: "Offer", count: 1, percentage: 20 },
  ]),
  JSON.stringify(analytics.pipeline)
);
check(
  "current status distribution is deterministic",
  same(analytics.statusDistribution, [
    { label: "Rejected", count: 2, percentage: 33 },
    { label: "Applied", count: 1, percentage: 17 },
    { label: "Assessment", count: 1, percentage: 17 },
    { label: "Offer", count: 1, percentage: 17 },
    { label: "Saved", count: 1, percentage: 17 },
  ]),
  JSON.stringify(analytics.statusDistribution)
);
check(
  "role and company breakdowns use normalized grouping and outcome facts",
  same(analytics.breakdowns.roles[0], {
    key: "product-designer",
    label: "Product Designer",
    count: 5,
    submitted: 4,
    responses: 3,
    interviews: 2,
    offers: 1,
    responseRate: { value: 75, numerator: 3, denominator: 4 },
    interviewRate: { value: 50, numerator: 2, denominator: 4 },
    offerRate: { value: 25, numerator: 1, denominator: 4 },
  }) && analytics.breakdowns.companies[0].key === "google" && analytics.breakdowns.companies[0].count === 4,
  JSON.stringify(analytics.breakdowns)
);
check(
  "missing sources fall back to Unspecified",
  same(analytics.breakdowns.sources.find((row) => row.key === "unspecified"), {
    key: "unspecified",
    label: "Unspecified",
    count: 1,
    submitted: 1,
    responses: 1,
    interviews: 1,
    offers: 1,
    responseRate: { value: 100, numerator: 1, denominator: 1 },
    interviewRate: { value: 100, numerator: 1, denominator: 1 },
    offerRate: { value: 100, numerator: 1, denominator: 1 },
  })
);
check(
  "score bands use fixed bounds and warn below five submissions",
  same(analytics.matchScorePatterns, [
    { label: "Below 60", min: null, max: 59, submitted: 0, responses: 0, interviews: 0, responseRate: { value: null, numerator: 0, denominator: 0 }, interviewRate: { value: null, numerator: 0, denominator: 0 }, warning: "Not enough applications to identify a reliable pattern." },
    { label: "60–69", min: 60, max: 69, submitted: 1, responses: 1, interviews: 0, responseRate: { value: 100, numerator: 1, denominator: 1 }, interviewRate: { value: 0, numerator: 0, denominator: 1 }, warning: "Not enough applications to identify a reliable pattern." },
    { label: "70–79", min: 70, max: 79, submitted: 1, responses: 0, interviews: 0, responseRate: { value: 0, numerator: 0, denominator: 1 }, interviewRate: { value: 0, numerator: 0, denominator: 1 }, warning: "Not enough applications to identify a reliable pattern." },
    { label: "80–89", min: 80, max: 89, submitted: 1, responses: 1, interviews: 1, responseRate: { value: 100, numerator: 1, denominator: 1 }, interviewRate: { value: 100, numerator: 1, denominator: 1 }, warning: "Not enough applications to identify a reliable pattern." },
    { label: "90–100", min: 90, max: null, submitted: 1, responses: 1, interviews: 1, responseRate: { value: 100, numerator: 1, denominator: 1 }, interviewRate: { value: 100, numerator: 1, denominator: 1 }, warning: "Not enough applications to identify a reliable pattern." },
  ]),
  JSON.stringify(analytics.matchScorePatterns)
);
check(
  "resume performance labels variants and warns on small groups",
  same(analytics.resumePerformance.variants, [
    { key: "v4", label: "V4", submitted: 4, responses: 3, interviews: 2, offers: 1, responseRate: { value: 75, numerator: 3, denominator: 4 }, interviewRate: { value: 50, numerator: 2, denominator: 4 }, offerRate: { value: 25, numerator: 1, denominator: 4 }, warning: "Not enough applications to identify a reliable pattern." },
    { key: "v3", label: "V3", submitted: 1, responses: 1, interviews: 0, offers: 0, responseRate: { value: 100, numerator: 1, denominator: 1 }, interviewRate: { value: 0, numerator: 0, denominator: 1 }, offerRate: { value: 0, numerator: 0, denominator: 1 }, warning: "Not enough applications to identify a reliable pattern." },
  ])
);
check(
  "data quality explains missing score, response time, and low sample exclusions",
    analytics.dataQuality.missingDates === 0 &&
    analytics.dataQuality.missingScores === 1 &&
    analytics.dataQuality.responseTimeExcluded === 0 &&
    analytics.dataQuality.warnings.length === 1,
  JSON.stringify(analytics.dataQuality)
);

console.log("filters");
const filterFixtures = [
  { id: "f1", submittedAt: "2026-07-01T00:00:00.000Z", companySlug: "google", roleSlug: "product-designer", location: "New   York", applicationSource: "Referral" },
  { id: "f2", applicationDate: "2026-07-02", companySlug: "stripe", roleSlug: "ux-designer", location: "Remote", applicationSource: "LinkedIn" },
  { id: "f3", createdAt: "2026-07-03T00:00:00.000Z", companySlug: "google", roleSlug: "product-designer", location: "New York", applicationSource: "" },
];
check("date filtering uses fallback dates with inclusive UTC boundaries", same(filterApplications(filterFixtures, { from: "2026-07-02", to: "2026-07-03" }).map((app) => app.id), ["f2", "f3"]));
check("company and role filtering compare normalized slugs exactly", same(filterApplications(filterFixtures, { company: "google", role: "product-designer" }).map((app) => app.id), ["f1", "f3"]));
check("location and source filtering normalize whitespace, case, and empty source", same(filterApplications(filterFixtures, { location: "new york", source: "unspecified" }).map((app) => app.id), ["f3"]));

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
