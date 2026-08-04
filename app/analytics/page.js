"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import AnalyticsEmptyState from "@/components/analytics/AnalyticsEmptyState";
import AnalyticsFilters from "@/components/analytics/AnalyticsFilters";
import AnalyticsHeader from "@/components/analytics/AnalyticsHeader";
import AnalyticsLoadingState from "@/components/analytics/AnalyticsLoadingState";
import AnalyticsSummary from "@/components/analytics/AnalyticsSummary";
import ApplicationsTrendChart from "@/components/analytics/ApplicationsTrendChart";
import DataQualityNotice from "@/components/analytics/DataQualityNotice";
import DistributionChart from "@/components/analytics/DistributionChart";
import KeywordTrends from "@/components/analytics/KeywordTrends";
import MatchScorePatterns from "@/components/analytics/MatchScorePatterns";
import MetricDefinitions from "@/components/analytics/MetricDefinitions";
import PipelineConversionChart from "@/components/analytics/PipelineConversionChart";
import ResumePerformance from "@/components/analytics/ResumePerformance";
import SkillGapRoadmap from "@/components/analytics/SkillGapRoadmap";
import {
  analyticsPayloadState,
  buildAnalyticsQuery,
  buildSkillGapPatch,
  replaceSkillGapRecord,
} from "@/lib/analytics/client";

const EMPTY_FILTERS = Object.freeze({
  from: "",
  to: "",
  company: "",
  role: "",
  location: "",
  source: "",
});

const LOAD_ERROR = "Unable to load analytics.";
const UPDATE_ERROR = "Unable to update skill gap.";

function safeErrorMessage(payload, fallback) {
  return typeof payload?.error === "string" && payload.error.trim() ? payload.error : fallback;
}

function approvedFilters(filters = {}) {
  return Object.fromEntries(Object.keys(EMPTY_FILTERS).map((key) => [key, typeof filters[key] === "string" ? filters[key] : ""]));
}

export default function AnalyticsPage() {
  const [filters, setFilters] = useState(() => ({ ...EMPTY_FILTERS }));
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [updateError, setUpdateError] = useState("");
  const [updatingId, setUpdatingId] = useState(null);
  const requestController = useRef(null);

  const loadAnalytics = useCallback(async (nextFilters, { preserveData = false } = {}) => {
    requestController.current?.abort();
    const controller = new AbortController();
    requestController.current = controller;
    setError("");
    setLoading(!preserveData);
    setRefreshing(preserveData);

    try {
      const query = buildAnalyticsQuery(nextFilters);
      const response = await fetch(query ? `/api/analytics?${query}` : "/api/analytics", {
        signal: controller.signal,
      });
      const payload = await response.json().catch(() => null);

      if (!response.ok) throw new Error(safeErrorMessage(payload, LOAD_ERROR));
      if (!payload || typeof payload !== "object" || Array.isArray(payload)) throw new Error(LOAD_ERROR);
      setData(payload);
    } catch (requestError) {
      if (requestError?.name === "AbortError") return;
      setError(requestError instanceof Error && requestError.message ? requestError.message : LOAD_ERROR);
    } finally {
      if (requestController.current === controller) {
        requestController.current = null;
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, []);

  useEffect(() => {
    const initialLoad = window.setTimeout(() => loadAnalytics(EMPTY_FILTERS), 0);
    return () => {
      window.clearTimeout(initialLoad);
      requestController.current?.abort();
    };
  }, [loadAnalytics]);

  function applyFilters(nextFilters) {
    const next = approvedFilters(nextFilters);
    setFilters(next);
    loadAnalytics(next, { preserveData: Boolean(data) });
  }

  function clearFilters() {
    const next = { ...EMPTY_FILTERS };
    setFilters(next);
    loadAnalytics(next, { preserveData: Boolean(data) });
  }

  async function updateSkillGap(id, patch) {
    const previousGap = data?.skillGaps?.find((record) => record.id === id);
    if (!previousGap || updatingId) return;

    const safePatch = buildSkillGapPatch(patch);
    const optimisticGap = { ...previousGap, ...safePatch };
    setUpdatingId(id);
    setUpdateError("");
    setData((current) => current ? {
      ...current,
      skillGaps: replaceSkillGapRecord(current.skillGaps, id, optimisticGap),
    } : current);

    try {
      const encodedId = encodeURIComponent(id);
      const response = await fetch(`/api/skill-gaps/${encodedId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(safePatch),
      });
      const payload = await response.json().catch(() => null);

      if (!response.ok) throw new Error(safeErrorMessage(payload, UPDATE_ERROR));
      if (!payload?.skillGap || typeof payload.skillGap !== "object" || Array.isArray(payload.skillGap)) {
        throw new Error(UPDATE_ERROR);
      }

      setData((current) => current ? {
        ...current,
        skillGaps: replaceSkillGapRecord(current.skillGaps, id, payload.skillGap),
      } : current);
    } catch (requestError) {
      setData((current) => current ? {
        ...current,
        skillGaps: replaceSkillGapRecord(current.skillGaps, id, previousGap),
      } : current);
      setUpdateError(requestError instanceof Error && requestError.message ? requestError.message : UPDATE_ERROR);
    } finally {
      setUpdatingId((current) => current === id ? null : current);
    }
  }

  const payloadState = data ? analyticsPayloadState(data) : null;
  const showInitialError = !data && !loading && error;

  return (
    <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-8 sm:px-6 lg:px-8">
      <div className="space-y-6 lg:space-y-8">
        <AnalyticsHeader />
        <AnalyticsFilters
          filters={filters}
          options={data?.filterOptions || {}}
          refreshing={refreshing}
          onApply={applyFilters}
          onClear={clearFilters}
        />

        {loading && !data && <AnalyticsLoadingState />}

        {showInitialError && (
          <section className="rounded-xl border border-red-200 bg-red-50 p-6" role="alert" aria-live="assertive">
            <h2 className="text-lg font-semibold text-red-900">Analytics could not be loaded</h2>
            <p className="mt-2 text-sm text-red-800">{error}</p>
            <button
              type="button"
              onClick={() => loadAnalytics(filters)}
              className="mt-4 rounded-lg bg-blue-700 px-4 py-2 text-sm font-medium text-white hover:bg-blue-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2"
            >
              Retry
            </button>
          </section>
        )}

        {data && (error || updateError) && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800" role="alert" aria-live="assertive">
            {error && <p>{error}</p>}
            {updateError && <p>{updateError}</p>}
          </div>
        )}

        {data && payloadState === "empty" && (
          <AnalyticsEmptyState
            title="No job-search analytics yet"
            message="Save a job or tailor a resume to start building your private analytics workspace."
            actions={[
              { href: "/jobs", label: "Save a Job" },
              { href: "/", label: "Tailor a Resume" },
            ]}
          />
        )}

        {data && payloadState !== "empty" && (
          <div data-analytics-state={payloadState === "partial" ? "partial" : "populated"} className="space-y-6 lg:space-y-8">
            <DataQualityNotice dataQuality={data.dataQuality} />
            <AnalyticsSummary summary={data.summary} definitions={data.definitions} />
            <div className="grid gap-6 xl:grid-cols-3">
              <ApplicationsTrendChart data={data.applicationsOverTime} />
              <PipelineConversionChart data={data.pipeline} />
              <DistributionChart title="Current status" data={data.statusDistribution} />
            </div>
            <MatchScorePatterns data={data.matchScorePatterns} />
            <ResumePerformance data={data.resumePerformance} />
            <KeywordTrends trends={data.keywordTrends} />
            <SkillGapRoadmap records={data.skillGaps} updatingId={updatingId} onUpdate={updateSkillGap} />
            <MetricDefinitions definitions={data.definitions} />
          </div>
        )}
      </div>
    </main>
  );
}
