export const FILTER_ORDER = ["from", "to", "company", "role", "location", "source"];

export function buildAnalyticsQuery(filters = {}) {
  const params = new URLSearchParams();

  for (const key of FILTER_ORDER) {
    const value = typeof filters[key] === "string" ? filters[key].trim() : "";
    if (value) params.set(key, value);
  }

  return params.toString();
}

export function formatRate(metric) {
  return Number.isFinite(metric?.value) ? `${metric.value}%` : "—";
}

export function rateDetail(metric, noun = "submitted applications") {
  if (!Number.isFinite(metric?.denominator) || metric.denominator <= 0) return "No eligible records";

  const numerator = Number.isFinite(metric?.numerator) ? metric.numerator : 0;
  return `${numerator} of ${metric.denominator} ${noun}`;
}

export function formatRateWithDetail(metric, noun = "submitted applications") {
  return `${rateDetail(metric, noun)} · ${formatRate(metric)}`;
}

export function formatMetricValue(value, suffix = "") {
  return Number.isFinite(value) ? `${value}${suffix}` : "—";
}

export function filterKeywordTrends(trends, { category = "", evidenceLevel = "" } = {}) {
  if (!Array.isArray(trends)) return [];
  return trends.filter((trend) =>
    (!category || trend?.category === category) &&
    (!evidenceLevel || trend?.evidenceLevel === evidenceLevel)
  );
}

export function buildSkillGapPatch({ importance, learningStatus, notes, portfolioOpportunity } = {}) {
  return { importance, learningStatus, notes, portfolioOpportunity };
}

export function analyticsPayloadState(data = {}) {
  const hasJobs = Number.isFinite(data?.summary?.totalJobsSaved) && data.summary.totalJobsSaved > 0;
  const hasApplications = (Number.isFinite(data?.summary?.applicationCount) && data.summary.applicationCount > 0) ||
    (Array.isArray(data?.statusDistribution) && data.statusDistribution.length > 0);
  const hasKeywords = Array.isArray(data?.keywordTrends) && data.keywordTrends.length > 0;
  const hasSkillGaps = Array.isArray(data?.skillGaps) && data.skillGaps.length > 0;
  const populatedGroups = [hasJobs, hasApplications, hasKeywords, hasSkillGaps];

  if (populatedGroups.every((present) => !present)) return "empty";
  return populatedGroups.every(Boolean) ? "populated" : "partial";
}

export function replaceSkillGapRecord(records, id, replacement) {
  if (!Array.isArray(records)) return [];
  return records.map((record) => record?.id === id ? replacement : record);
}

export function isSkillGapSaveAllowed({ learningStatus, evidenceLevel } = {}) {
  return learningStatus !== "Verified in Resume" || evidenceLevel === "Strong";
}
