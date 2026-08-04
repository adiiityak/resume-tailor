export const FILTER_ORDER = ["from", "to", "company", "role", "location", "source"];

export function buildAnalyticsQuery(filters = {}) {
  const params = new URLSearchParams();

  for (const key of FILTER_ORDER) {
    const value = typeof filters[key] === "string" ? filters[key].trim() : "";
    if (value) params.set(key, value);
  }

  return params.toString();
}

export function buildAnalyticsRequest(filters, signal) {
  const query = buildAnalyticsQuery(filters);
  return {
    url: query ? `/api/analytics?${query}` : "/api/analytics",
    options: { signal },
  };
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

export function buildSkillGapRequest(id, patch, signal) {
  return {
    url: `/api/skill-gaps/${encodeURIComponent(id)}`,
    options: {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(buildSkillGapPatch(patch)),
      signal,
    },
  };
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

export function replaceSkillGapRecordIfCurrent(records, id, expectedRecord, replacement) {
  if (!Array.isArray(records)) return { accepted: false, records: [] };
  const currentRecord = records.find((record) => record?.id === id);
  if (currentRecord !== expectedRecord) return { accepted: false, records };
  return { accepted: true, records: replaceSkillGapRecord(records, id, replacement) };
}

export function createAnalyticsCoordinator(initialData = null) {
  let data = initialData;
  let loadGeneration = 0;
  let activeLoad = null;
  let datasetRevision = 0;
  let mutationGeneration = 0;
  let activeMutation = null;

  function inactiveResult() {
    return { accepted: false, data };
  }

  function beginLoad() {
    const token = Object.freeze({ generation: ++loadGeneration });
    activeLoad = token;
    return token;
  }

  function isCurrentLoad(token) {
    return activeLoad === token;
  }

  function invalidateLoad() {
    loadGeneration += 1;
    activeLoad = null;
  }

  function commitLoadSuccess(token, payload) {
    if (!isCurrentLoad(token)) return inactiveResult();

    const mutationInvalidated = Boolean(activeMutation);
    activeMutation = null;
    datasetRevision += 1;
    data = payload;
    return { accepted: true, data, datasetRevision, mutationInvalidated };
  }

  function commitLoadError(token) {
    return isCurrentLoad(token);
  }

  function finishLoad(token) {
    if (!isCurrentLoad(token)) return false;
    activeLoad = null;
    return true;
  }

  function beginSkillGapMutation(id, patch) {
    if (activeMutation || !data) return null;
    const previousRecord = data.skillGaps?.find((record) => record?.id === id);
    if (!previousRecord) return null;

    const optimisticRecord = { ...previousRecord, ...patch };
    const token = Object.freeze({
      generation: ++mutationGeneration,
      datasetRevision,
      id,
      previousRecord,
      optimisticRecord,
    });
    activeMutation = token;
    data = {
      ...data,
      skillGaps: replaceSkillGapRecord(data.skillGaps, id, optimisticRecord),
    };
    return { token, data };
  }

  function commitMutationReplacement(token, replacement) {
    if (activeMutation !== token || token?.datasetRevision !== datasetRevision) return inactiveResult();
    const result = replaceSkillGapRecordIfCurrent(data?.skillGaps, token.id, token.optimisticRecord, replacement);
    if (!result.accepted) return inactiveResult();
    data = {
      ...data,
      skillGaps: result.records,
    };
    return { accepted: true, data };
  }

  function commitMutationSuccess(token, replacement) {
    return commitMutationReplacement(token, replacement);
  }

  function commitMutationFailure(token) {
    return commitMutationReplacement(token, token?.previousRecord);
  }

  function finishMutation(token) {
    if (activeMutation !== token) return false;
    activeMutation = null;
    return true;
  }

  function invalidateMutation() {
    const invalidated = Boolean(activeMutation);
    activeMutation = null;
    return invalidated;
  }

  return {
    beginLoad,
    commitLoadError,
    commitLoadSuccess,
    finishLoad,
    invalidateLoad,
    beginSkillGapMutation,
    commitMutationFailure,
    commitMutationSuccess,
    finishMutation,
    invalidateMutation,
  };
}

export function isSkillGapSaveAllowed({ learningStatus, evidenceLevel } = {}) {
  return learningStatus !== "Verified in Resume" || evidenceLevel === "Strong";
}
