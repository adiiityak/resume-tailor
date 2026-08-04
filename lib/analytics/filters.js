import { createSlug } from "../store/shared.js";

const FILTER_KEYS = ["from", "to", "company", "role", "location", "source"];
const TEXT_FILTER_KEYS = ["company", "role", "location", "source"];
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const UNSAFE_TEXT_PATTERN = /[\\/\0]/;

function emptyFilters() {
  return Object.fromEntries(FILTER_KEYS.map((key) => [key, ""]));
}

function isRealUtcDate(value) {
  if (!DATE_PATTERN.test(value)) return false;
  const date = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

function normalizeText(value) {
  return value.toLowerCase().replace(/\s+/g, " ");
}

export function parseAnalyticsFilters(searchParams) {
  const filters = emptyFilters();
  const errors = [];

  for (const key of ["from", "to"]) {
    const value = String(searchParams?.get?.(key) ?? "").trim();
    if (!value) continue;
    if (!isRealUtcDate(value)) {
      errors.push(`The ${key === "from" ? "start" : "end"} date must be a real date in YYYY-MM-DD format.`);
      continue;
    }
    filters[key] = value;
  }

  for (const key of TEXT_FILTER_KEYS) {
    const value = String(searchParams?.get?.(key) ?? "").trim();
    if (!value) continue;
    if (value.length > 120) {
      errors.push(`${key} cannot exceed 120 characters.`);
      continue;
    }
    if (UNSAFE_TEXT_PATTERN.test(value)) {
      errors.push(`${key} contains an invalid character.`);
      continue;
    }
    filters[key] = key === "company" || key === "role" ? createSlug(value) : normalizeText(value);
  }

  if (filters.from && filters.to && filters.from > filters.to) {
    errors.push("The start date must be on or before the end date.");
  }

  return { filters, errors };
}
