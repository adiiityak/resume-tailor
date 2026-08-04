const STATUS_ORDER = [
  "Saved",
  "Tailoring",
  "Ready to Apply",
  "Applied",
  "Assessment",
  "Recruiter Screen",
  "Interviewing",
  "Offer",
  "Rejected",
  "Withdrawn",
  "Archived",
];

const RESPONSE_STAGES = new Set(["Assessment", "Recruiter Screen", "Interviewing", "Offer", "Rejected"]);
const SCREEN_STAGES = new Set(["Recruiter Screen", "Interviewing", "Offer"]);
const INTERVIEW_STAGES = new Set(["Interviewing", "Offer"]);
const SUBMITTED_STAGES = new Set(["Applied", ...RESPONSE_STAGES]);
const MINIMUM_DATA_WARNING = "Not enough applications to identify a reliable pattern.";

function isValidDate(value) {
  return typeof value === "string" && value.trim() !== "" && !Number.isNaN(Date.parse(value));
}

function timestamp(value) {
  return isValidDate(value) ? new Date(value).getTime() : null;
}

function normalizeSlug(value) {
  return String(value || "").trim().toLowerCase();
}

function normalizeText(value) {
  return String(value || "").trim().replace(/\s+/g, " ").toLowerCase();
}

function dateKey(value) {
  const ms = timestamp(value);
  return ms === null ? null : new Date(ms).toISOString().slice(0, 10);
}

function dateForApplication(application) {
  return dateKey(application.submittedAt) || dateKey(application.applicationDate) || dateKey(application.createdAt);
}

function sortRows(rows) {
  return rows.sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));
}

function roundedAverage(values, decimals = 0) {
  if (!values.length) return null;
  const multiplier = 10 ** decimals;
  return Math.round((values.reduce((total, value) => total + value, 0) / values.length) * multiplier) / multiplier;
}

function canonicalStages(application) {
  const reached = new Set(
    (Array.isArray(application.activity) ? application.activity : [])
      .filter((event) => event?.type === "status_changed" && STATUS_ORDER.includes(event.to))
      .map((event) => event.to)
  );
  if (STATUS_ORDER.includes(application.status)) reached.add(application.status);
  return STATUS_ORDER.filter((status) => reached.has(status));
}

function statusEvents(application) {
  return (Array.isArray(application.activity) ? application.activity : [])
    .filter((event) => event?.type === "status_changed" && STATUS_ORDER.includes(event.to))
    .map((event) => ({ ...event, time: timestamp(event.createdAt) }))
    .sort((a, b) => (a.time ?? Infinity) - (b.time ?? Infinity));
}

function earliestTimestamp(events, stages) {
  const event = events.find((item) => stages.has(item.to) && item.time !== null);
  return event ? event.createdAt : null;
}

function sourceValue(application) {
  const normalized = normalizeText(application.applicationSource);
  return normalized || "unspecified";
}

function readableMode(value) {
  return String(value)
    .trim()
    .toLowerCase()
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

function groupApplications(applications, keyFor, labelFor) {
  const groups = new Map();
  for (const application of applications) {
    const key = keyFor(application);
    const label = labelFor(application, key);
    if (!groups.has(key)) groups.set(key, { key, labels: new Set(), applications: [] });
    const group = groups.get(key);
    group.labels.add(label);
    group.applications.push(application);
  }
  return [...groups.values()].map((group) => ({
    ...group,
    label: [...group.labels].sort((a, b) => a.localeCompare(b))[0],
  }));
}

function groupMetrics(group) {
  const facts = group.applications.map((application) => applicationFacts(application));
  const submitted = facts.filter((fact) => fact.submitted);
  const responses = submitted.filter((fact) => fact.responded).length;
  const interviews = submitted.filter((fact) => fact.interviewed).length;
  const offers = submitted.filter((fact) => fact.offered).length;
  return {
    key: group.key,
    label: group.label,
    count: group.applications.length,
    submitted: submitted.length,
    responses,
    interviews,
    offers,
    responseRate: rate(responses, submitted.length),
    interviewRate: rate(interviews, submitted.length),
    offerRate: rate(offers, submitted.length),
  };
}

function minimumWarning(submitted) {
  return submitted < 5 ? MINIMUM_DATA_WARNING : null;
}

export function rate(numerator, denominator) {
  return {
    numerator,
    denominator,
    value: denominator ? Math.round((numerator / denominator) * 100) : null,
  };
}

export function applicationFacts(application = {}) {
  const events = statusEvents(application);
  const stagesReached = canonicalStages(application);
  const hasSubmissionEvent = events.some((event) => SUBMITTED_STAGES.has(event.to));
  const noStatusHistory = events.length === 0;
  const currentSubmitted = SUBMITTED_STAGES.has(application.status);
  const submitted = Boolean(application.submittedAt) || hasSubmissionEvent || (noStatusHistory && currentSubmitted);
  const submittedAt = application.submittedAt || earliestTimestamp(events, SUBMITTED_STAGES) ||
    (noStatusHistory && currentSubmitted && isValidDate(application.statusUpdatedAt) ? application.statusUpdatedAt : null);
  const responseEventAt = earliestTimestamp(events, RESPONSE_STAGES);
  const responded = stagesReached.some((stage) => RESPONSE_STAGES.has(stage));
  const firstResponseAt = responseEventAt ||
    (responded && RESPONSE_STAGES.has(application.status) && isValidDate(application.statusUpdatedAt) ? application.statusUpdatedAt : null);
  const submittedTime = timestamp(submittedAt);
  const responseTime = timestamp(firstResponseAt);
  const responseHours = submittedTime !== null && responseTime !== null && responseTime >= submittedTime
    ? (responseTime - submittedTime) / (60 * 60 * 1000)
    : null;

  return {
    submitted,
    responded,
    screened: stagesReached.some((stage) => SCREEN_STAGES.has(stage)),
    interviewed: stagesReached.some((stage) => INTERVIEW_STAGES.has(stage)),
    offered: stagesReached.includes("Offer"),
    rejected: stagesReached.includes("Rejected"),
    submittedAt: submittedAt || null,
    firstResponseAt: firstResponseAt || null,
    responseHours,
    stagesReached,
  };
}

export function filterApplications(applications = [], filters = {}) {
  const from = dateKey(filters.from);
  const to = dateKey(filters.to);
  const company = normalizeSlug(filters.company);
  const role = normalizeSlug(filters.role);
  const location = normalizeText(filters.location);
  const source = normalizeText(filters.source);

  return applications.filter((application) => {
    const applicationDate = dateForApplication(application);
    if (from && (!applicationDate || applicationDate < from)) return false;
    if (to && (!applicationDate || applicationDate > to)) return false;
    if (company && normalizeSlug(application.companySlug) !== company) return false;
    if (role && normalizeSlug(application.roleSlug) !== role) return false;
    if (location && normalizeText(application.location) !== location) return false;
    if (source && sourceValue(application) !== source) return false;
    return true;
  });
}

function applicationsOverTime(applications) {
  const periods = new Map();
  for (const application of applications) {
    const date = dateForApplication(application);
    if (!date) continue;
    const day = new Date(`${date}T00:00:00.000Z`);
    const mondayOffset = (day.getUTCDay() + 6) % 7;
    day.setUTCDate(day.getUTCDate() - mondayOffset);
    const period = day.toISOString().slice(0, 10);
    periods.set(period, (periods.get(period) || 0) + 1);
  }
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return [...periods.entries()]
    .sort(([first], [second]) => first.localeCompare(second))
    .map(([period, count]) => {
      const date = new Date(`${period}T00:00:00.000Z`);
      return { period, label: `${months[date.getUTCMonth()]} ${date.getUTCDate()}`, count };
    });
}

function followUpCompletionRate(reminders, now) {
  const nowDate = dateKey(now.toISOString());
  let completed = 0;
  let eligible = 0;
  for (const reminder of reminders) {
    const type = normalizeText(reminder?.type);
    if (!new Set(["application follow-up", "recruiter follow-up", "referral follow-up"]).has(type)) continue;
    const isCompleted = normalizeText(reminder.status) === "completed";
    const dueDate = dateKey(reminder.dueDate);
    if (isCompleted) {
      completed += 1;
      eligible += 1;
    } else if (dueDate && dueDate <= nowDate) {
      eligible += 1;
    }
  }
  return rate(completed, eligible);
}

export function buildApplicationAnalytics({ applications = [], reminders = [], now = new Date() } = {}) {
  const factsByApplication = applications.map((application) => ({ application, facts: applicationFacts(application) }));
  const submitted = factsByApplication.filter(({ facts }) => facts.submitted);
  const submittedApplications = submitted.map(({ application }) => application);
  const submittedFacts = submitted.map(({ facts }) => facts);
  const responded = submittedFacts.filter((facts) => facts.responded);
  const screened = submittedFacts.filter((facts) => facts.screened);
  const interviewed = submittedFacts.filter((facts) => facts.interviewed);
  const offered = submittedFacts.filter((facts) => facts.offered);
  const rejected = submittedFacts.filter((facts) => facts.rejected);
  const responseTimes = responded.map((facts) => facts.responseHours).filter((hours) => hours !== null);
  const numericScores = applications.map((application) => application.matchScore).filter((score) => Number.isFinite(score));

  const roleGroups = groupApplications(
    applications,
    (application) => normalizeSlug(application.roleSlug) || "unspecified",
    (application, key) => String(application.role || (key === "unspecified" ? "Unspecified" : key)).trim() || "Unspecified"
  );
  const companyGroups = groupApplications(
    applications,
    (application) => normalizeSlug(application.companySlug) || "unspecified",
    (application, key) => String(application.company || (key === "unspecified" ? "Unspecified" : key)).trim() || "Unspecified"
  );
  const sourceGroups = groupApplications(
    applications,
    (application) => sourceValue(application),
    (application, key) => key === "unspecified" ? "Unspecified" : String(application.applicationSource).trim().replace(/\s+/g, " ")
  );
  const roles = sortRows(roleGroups.map(groupMetrics));
  const companies = sortRows(companyGroups.map(groupMetrics));
  const sources = sortRows(sourceGroups.map(groupMetrics));

  const scoreBands = [
    { label: "Below 60", min: null, max: 59, matches: (score) => score < 60 },
    { label: "60–69", min: 60, max: 69, matches: (score) => score >= 60 && score <= 69 },
    { label: "70–79", min: 70, max: 79, matches: (score) => score >= 70 && score <= 79 },
    { label: "80–89", min: 80, max: 89, matches: (score) => score >= 80 && score <= 89 },
    { label: "90–100", min: 90, max: null, matches: (score) => score >= 90 && score <= 100 },
  ];
  const matchScorePatterns = scoreBands.map(({ matches, ...band }) => {
    const rows = submitted.filter(({ application }) => Number.isFinite(application.matchScore) && matches(application.matchScore));
    const facts = rows.map(({ facts }) => facts);
    const responses = facts.filter((fact) => fact.responded).length;
    const interviews = facts.filter((fact) => fact.interviewed).length;
    return {
      ...band,
      submitted: facts.length,
      responses,
      interviews,
      responseRate: rate(responses, facts.length),
      interviewRate: rate(interviews, facts.length),
      warning: minimumWarning(facts.length),
    };
  });

  const performanceRows = (keyFor, labelFor) => sortRows(
    groupApplications(submittedApplications, keyFor, labelFor).map((group) => {
      const metrics = groupMetrics(group);
      const { count, ...performance } = metrics;
      return { ...performance, warning: minimumWarning(performance.submitted), count };
    })
  ).map(({ count, ...row }) => row);
  const fallback = (value) => String(value || "").trim() || "Unspecified";
  const resumePerformance = {
    variants: performanceRows(
      (application) => fallback(application.resumeVariant).toLowerCase(),
      (application) => fallback(application.resumeVariant).toUpperCase()
    ),
    profiles: performanceRows(
      (application) => fallback(application.baseProfileId),
      (application) => fallback(application.baseProfileId)
    ),
    versions: performanceRows(
      (application) => fallback(application.submittedResumeVersion),
      (application) => fallback(application.submittedResumeVersion)
    ),
    modes: performanceRows(
      (application) => fallback(application.mode).toLowerCase(),
      (application) => readableMode(fallback(application.mode))
    ),
  };

  const submittedRoleRows = roles.filter((row) => row.submitted > 0);
  const mostAppliedRole = submittedRoleRows.length
    ? [...submittedRoleRows].sort((a, b) => b.submitted - a.submitted || a.label.localeCompare(b.label)).map(({ label, submitted: count }) => ({ label, count }))[0]
    : null;
  const successfulRoles = roles.filter((row) => row.submitted >= 3);
  const mostSuccessfulRole = successfulRoles.length
    ? [...successfulRoles]
      .sort((a, b) => b.interviewRate.value - a.interviewRate.value || b.offers - a.offers || b.submitted - a.submitted || a.label.localeCompare(b.label))
      .map(({ label, submitted, interviewRate }) => ({ label, submitted, interviewRate }))[0]
    : null;
  const mostActiveCompany = companies.length ? { label: companies[0].label, count: companies[0].count } : null;
  const missingDates = submittedApplications.filter((application) => !dateForApplication(application)).length;
  const missingScores = submittedApplications.filter((application) => !Number.isFinite(application.matchScore)).length;
  const responseTimeExcluded = responded.filter((fact) => fact.responseHours === null).length;
  const warnings = [];
  if (missingDates) warnings.push(`${missingDates} submitted application${missingDates === 1 ? "" : "s"} missing a valid date and excluded from applications over time.`);
  if (missingScores) warnings.push(`${missingScores} submitted application${missingScores === 1 ? "" : "s"} missing a numeric match score and excluded from match-score patterns.`);
  if (responseTimeExcluded) warnings.push(`${responseTimeExcluded} responded submitted application${responseTimeExcluded === 1 ? "" : "s"} missing a calculable response time and excluded from response-time averages.`);
  if (submittedApplications.length < 5) warnings.push(MINIMUM_DATA_WARNING);

  return {
    summary: {
      applicationCount: applications.length,
      submittedApplications: submittedApplications.length,
      responseRate: rate(responded.length, submittedApplications.length),
      recruiterScreenRate: rate(screened.length, submittedApplications.length),
      interviewRate: rate(interviewed.length, submittedApplications.length),
      offerRate: rate(offered.length, submittedApplications.length),
      rejectionRate: rate(rejected.length, submittedApplications.length),
      averageMatchScore: roundedAverage(numericScores),
      averageResponseDays: roundedAverage(responseTimes.map((hours) => hours / 24), 1),
      responseTimeSampleSize: responseTimes.length,
      followUpCompletionRate: followUpCompletionRate(reminders, now),
      mostAppliedRole,
      mostSuccessfulRole,
      mostActiveCompany,
    },
    applicationsOverTime: applicationsOverTime(submittedApplications),
    pipeline: [
      { stage: "Submitted", count: submittedApplications.length, percentage: rate(submittedApplications.length, submittedApplications.length).value },
      { stage: "Responded", count: responded.length, percentage: rate(responded.length, submittedApplications.length).value },
      { stage: "Recruiter Screen", count: screened.length, percentage: rate(screened.length, submittedApplications.length).value },
      { stage: "Interviewing", count: interviewed.length, percentage: rate(interviewed.length, submittedApplications.length).value },
      { stage: "Offer", count: offered.length, percentage: rate(offered.length, submittedApplications.length).value },
    ],
    statusDistribution: sortRows(groupApplications(
      applications,
      (application) => String(application.status || "Unspecified"),
      (application, key) => key
    ).map((group) => ({
      label: group.label,
      count: group.applications.length,
      percentage: rate(group.applications.length, applications.length).value,
    }))),
    breakdowns: { roles, companies, sources },
    matchScorePatterns,
    resumePerformance,
    dataQuality: { missingDates, missingScores, responseTimeExcluded, warnings },
  };
}
