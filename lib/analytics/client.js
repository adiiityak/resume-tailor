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

export function formatMetricValue(value, suffix = "") {
  return Number.isFinite(value) ? `${value}${suffix}` : "—";
}
