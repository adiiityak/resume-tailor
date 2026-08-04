import { listApplications, loadAnalyticsApplications, getApplication, getActivity } from "./applications.js";
import { listJobs } from "./jobs.js";
import { getMaster } from "./masterResume.js";
import { listAchievements } from "./achievements.js";
import { listReminders } from "./reminders.js";
import { listSkillGaps, syncSkillGaps } from "./skillGaps.js";
import { createSlug } from "./store/shared.js";
import { buildApplicationAnalytics, filterApplications } from "./analytics/core.js";
import { analyzeKeywordTrends } from "./analytics/keywords.js";

const FILTER_KEYS = ["from", "to", "company", "role", "location", "source"];
const USER_MANAGED_GAP_FIELDS = [
  "importance",
  "importanceSource",
  "learningStatus",
  "notes",
  "portfolioOpportunity",
  "createdAt",
  "updatedAt",
];

export const ANALYTICS_DEFINITIONS = Object.freeze({
  submittedApplications: "Applications with a submitted date or recorded transition to Applied or a later stage.",
  responseRate: "Submitted applications that reached Assessment, Recruiter Screen, Interviewing, Offer, or Rejected, divided by submitted applications.",
  recruiterScreenRate: "Submitted applications that reached Recruiter Screen, Interviewing, or Offer, divided by submitted applications.",
  interviewRate: "Submitted applications that reached Interviewing or Offer, divided by submitted applications.",
  offerRate: "Submitted applications that reached Offer, divided by submitted applications.",
  rejectionRate: "Submitted applications that reached Rejected, divided by submitted applications.",
  averageResponseDays: "Average time from recorded submission to the first recorded response stage; records without both timestamps are excluded.",
  followUpCompletionRate: "Completed application, recruiter, or referral follow-ups divided by those completed or currently due.",
  averageMatchScore: "Average stored match score across filtered applications that have a score.",
  causationNotice: "Patterns describe your current records. They do not prove that a resume design, profile, or match score caused an outcome.",
});

const defaultDependencies = {
  listApplications,
  loadAnalyticsApplications,
  getApplication,
  getActivity,
  listJobs,
  getMaster,
  listAchievements,
  listReminders,
  listSkillGaps,
  syncSkillGaps,
};

function normalizeText(value) {
  return String(value ?? "").trim().replace(/\s+/g, " ").toLowerCase();
}

function displayText(value, fallback = "") {
  return String(value ?? "").trim().replace(/\s+/g, " ") || fallback;
}

function normalizedFilters(filters = {}) {
  return Object.fromEntries(FILTER_KEYS.map((key) => [key, String(filters[key] ?? "")]));
}

function corruptionCount(result, nestedKey) {
  const direct = result?.corrupted;
  if (Number.isFinite(direct) && direct > 0) return direct;
  const nested = result?.[nestedKey]?.corrupted;
  return Number.isFinite(nested) && nested > 0 ? nested : 0;
}

function listedApplications(result) {
  return (Array.isArray(result?.companies) ? result.companies : [])
    .flatMap((company) => Array.isArray(company?.applications) ? company.applications : [])
    .filter((application) => application && typeof application === "object" && !Array.isArray(application) &&
      typeof application.id === "string" && application.id.trim() !== "");
}

function isValidFullApplication(application, id) {
  return Boolean(
    application &&
    typeof application === "object" &&
    !Array.isArray(application) &&
    typeof application.id === "string" &&
    application.id === id
  );
}

async function loadApplications(lightweightApplications, dependencies) {
  const loaded = await Promise.all(lightweightApplications.map(async (lightweight) => {
    const [applicationResult, activityResult] = await Promise.allSettled([
      dependencies.getApplication(lightweight.id, { full: true }),
      dependencies.getActivity(lightweight.id),
    ]);
    if (applicationResult.status === "rejected" || activityResult.status === "rejected" ||
      !isValidFullApplication(applicationResult.value, lightweight.id)) {
      return { application: null, corrupted: 1 };
    }
    return {
      application: {
        ...lightweight,
        ...applicationResult.value,
        activity: Array.isArray(activityResult.value) ? activityResult.value : [],
      },
      corrupted: 0,
    };
  }));

  return {
    applications: loaded.flatMap((result) => result.application ? [result.application] : []),
    corrupted: loaded.reduce((total, result) => total + result.corrupted, 0),
  };
}

function isValidJob(job) {
  return Boolean(job && typeof job === "object" && !Array.isArray(job) &&
    typeof job.id === "string" && job.id.trim() !== "");
}

function utcDateKey(value) {
  const text = String(value ?? "").trim();
  if (!text) return "";
  const date = new Date(text);
  return Number.isNaN(date.getTime()) ? "" : date.toISOString().slice(0, 10);
}

function jobSource(job) {
  return normalizeText(job?.source) || "unspecified";
}

function filterJobs(jobs, filters) {
  return jobs.filter((job) => {
    const saved = utcDateKey(job.dateSaved);
    if (filters.from && (!saved || saved < filters.from)) return false;
    if (filters.to && (!saved || saved > filters.to)) return false;
    if (filters.company && (normalizeText(job.companySlug) || createSlug(job.company)) !== filters.company) return false;
    if (filters.role && (normalizeText(job.roleSlug) || createSlug(job.role)) !== filters.role) return false;
    if (filters.location && normalizeText(job.location) !== filters.location) return false;
    if (filters.source && jobSource(job) !== filters.source) return false;
    return true;
  });
}

function optionRows(records, valueFor, labelFor) {
  const options = new Map();
  for (const record of records) {
    const value = valueFor(record);
    const label = labelFor(record);
    if (value && label && !options.has(value)) options.set(value, { value, label });
  }
  return [...options.values()].sort((left, right) => left.label.localeCompare(right.label));
}

function buildFilterOptions(applications, jobs) {
  const records = [
    ...applications.map((application) => ({
      company: application.company,
      companySlug: application.companySlug,
      role: application.role,
      roleSlug: application.roleSlug,
      location: application.location,
      source: application.applicationSource,
    })),
    ...jobs,
  ];
  return {
    companies: optionRows(
      records,
      (record) => normalizeText(record.companySlug) || createSlug(record.company),
      (record) => displayText(record.company)
    ),
    roles: optionRows(
      records,
      (record) => normalizeText(record.roleSlug) || createSlug(record.role),
      (record) => displayText(record.role)
    ),
    locations: optionRows(
      records,
      (record) => normalizeText(record.location),
      (record) => displayText(record.location)
    ),
    sources: optionRows(
      records,
      (record) => normalizeText(record.source) || "unspecified",
      (record) => displayText(record.source, "Unspecified")
    ),
  };
}

function resultRows(result, key) {
  if (Array.isArray(result)) return result;
  return Array.isArray(result?.[key]) ? result[key] : [];
}

function visibleSkillGaps(filteredGaps, synchronizedGaps) {
  const synchronizedById = new Map(synchronizedGaps.map((gap) => [gap?.id, gap]));
  return filteredGaps.map((gap) => {
    const visible = { ...gap, frequency: gap.count };
    const synchronized = synchronizedById.get(gap.id);
    if (!synchronized) return visible;
    for (const field of USER_MANAGED_GAP_FIELDS) {
      if (Object.hasOwn(synchronized, field)) visible[field] = synchronized[field];
    }
    return visible;
  });
}

function filteredReminders(reminders, applications) {
  const applicationIds = new Set(applications.map((application) => application.id));
  return reminders.filter((reminder) => applicationIds.has(reminder?.applicationId));
}

function uniqueWarnings(warnings) {
  return [...new Set(warnings.filter((warning) => typeof warning === "string" && warning !== ""))];
}

function corruptionWarning(count) {
  if (!count) return null;
  return `${count} corrupted record${count === 1 ? " was" : "s were"} skipped.`;
}

export async function getAnalytics(filters = {}, dependencies = defaultDependencies) {
  const approvedFilters = normalizedFilters(filters);
  const usesProjection = typeof dependencies.loadAnalyticsApplications === "function";
  const [applicationResult, jobList, master, achievementList, reminderList, skillGapList] = await Promise.all([
    usesProjection ? dependencies.loadAnalyticsApplications() : dependencies.listApplications(),
    dependencies.listJobs(),
    dependencies.getMaster(),
    dependencies.listAchievements(),
    dependencies.listReminders(),
    dependencies.listSkillGaps(),
  ]);

  const loaded = usesProjection
    ? {
      applications: resultRows(applicationResult, "applications").filter((application) =>
        application && typeof application === "object" && !Array.isArray(application) &&
        typeof application.id === "string" && application.id.trim() !== ""
      ),
      corrupted: corruptionCount(applicationResult),
    }
    : await loadApplications(listedApplications(applicationResult), dependencies);
  const applications = loaded.applications;
  const jobs = (Array.isArray(jobList?.jobs) ? jobList.jobs : []).filter(isValidJob);
  const masterEntries = Array.isArray(master?.entries) ? master.entries : [];
  const achievements = Array.isArray(achievementList?.achievements) ? achievementList.achievements : [];
  const reminders = Array.isArray(reminderList?.reminders) ? reminderList.reminders : [];

  const globalKeywordResult = analyzeKeywordTrends({ jobs, applicationJobs: applications, masterEntries, achievements });
  const synchronizedResult = await dependencies.syncSkillGaps(globalKeywordResult.gaps);
  const synchronizedGaps = resultRows(synchronizedResult, "skillGaps");

  const filteredApplications = filterApplications(applications, approvedFilters);
  const filteredJobs = filterJobs(jobs, approvedFilters);
  const applicationAnalytics = buildApplicationAnalytics({
    applications: filteredApplications,
    reminders: filteredReminders(reminders, filteredApplications),
  });
  const filteredKeywordResult = analyzeKeywordTrends({
    jobs: filteredJobs,
    applicationJobs: filteredApplications,
    masterEntries,
    achievements,
  });

  const corruptedRecords =
    (usesProjection ? loaded.corrupted : corruptionCount(applicationResult, "summary") + loaded.corrupted) +
    corruptionCount(jobList) +
    corruptionCount(master) +
    corruptionCount(achievementList) +
    corruptionCount(reminderList) +
    corruptionCount(skillGapList) +
    corruptionCount(synchronizedResult);
  const warnings = uniqueWarnings([
    ...applicationAnalytics.dataQuality.warnings,
    corruptionWarning(corruptedRecords),
  ]);

  return {
    filters: approvedFilters,
    filterOptions: buildFilterOptions(applications, jobs),
    summary: { totalJobsSaved: filteredJobs.length, ...applicationAnalytics.summary },
    definitions: ANALYTICS_DEFINITIONS,
    applicationsOverTime: applicationAnalytics.applicationsOverTime,
    pipeline: applicationAnalytics.pipeline,
    statusDistribution: applicationAnalytics.statusDistribution,
    breakdowns: applicationAnalytics.breakdowns,
    matchScorePatterns: applicationAnalytics.matchScorePatterns,
    resumePerformance: applicationAnalytics.resumePerformance,
    keywordTrends: filteredKeywordResult.trends,
    skillGaps: visibleSkillGaps(filteredKeywordResult.gaps, synchronizedGaps),
    dataQuality: {
      ...applicationAnalytics.dataQuality,
      corruptedRecords,
      analyzedJobDescriptions: filteredKeywordResult.analyzedJobDescriptions,
      duplicateJobDescriptions: filteredKeywordResult.duplicateDescriptions,
      warnings,
    },
  };
}
