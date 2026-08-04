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
  buildAnalyticsRequest,
  buildSkillGapPatch,
  buildSkillGapRequest,
  createAnalyticsCoordinator,
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
  const [refreshStatus, setRefreshStatus] = useState("");
  const requestController = useRef(null);
  const mutationController = useRef(null);
  const coordinator = useRef(null);
  if (coordinator.current === null) coordinator.current = createAnalyticsCoordinator();

  const loadAnalytics = useCallback(async (nextFilters, { preserveData = false } = {}) => {
    const previousController = requestController.current;
    const loadToken = coordinator.current.beginLoad();
    const controller = new AbortController();
    requestController.current = controller;
    previousController?.abort();
    setError("");
    setLoading(!preserveData);
    setRefreshing(preserveData);
    setRefreshStatus(preserveData ? "Refreshing analytics…" : "");

    try {
      const request = buildAnalyticsRequest(nextFilters, controller.signal);
      const response = await fetch(request.url, request.options);
      const payload = await response.json().catch(() => null);

      if (!response.ok) throw new Error(safeErrorMessage(payload, LOAD_ERROR));
      if (!payload || typeof payload !== "object" || Array.isArray(payload)) throw new Error(LOAD_ERROR);

      const result = coordinator.current.commitLoadSuccess(loadToken, payload);
      if (!result.accepted) return;

      if (result.mutationInvalidated) {
        const activeMutationController = mutationController.current;
        mutationController.current = null;
        activeMutationController?.abort();
      }
      setUpdatingId(null);
      setUpdateError("");
      setData(result.data);
    } catch (requestError) {
      if (!coordinator.current.commitLoadError(loadToken)) return;
      setError(requestError instanceof Error && requestError.message ? requestError.message : LOAD_ERROR);
    } finally {
      if (coordinator.current.finishLoad(loadToken)) {
        if (requestController.current === controller) requestController.current = null;
        setLoading(false);
        setRefreshing(false);
        if (preserveData) setRefreshStatus("Analytics refresh complete.");
      }
    }
  }, []);

  useEffect(() => {
    const initialLoad = window.setTimeout(() => loadAnalytics(EMPTY_FILTERS), 0);
    return () => {
      window.clearTimeout(initialLoad);
      const activeRequestController = requestController.current;
      coordinator.current.invalidateLoad();
      requestController.current = null;
      activeRequestController?.abort();

      const activeMutationController = mutationController.current;
      coordinator.current.invalidateMutation();
      mutationController.current = null;
      activeMutationController?.abort();
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
    const safePatch = buildSkillGapPatch(patch);
    const mutation = coordinator.current.beginSkillGapMutation(id, safePatch);
    if (!mutation) return;

    const controller = new AbortController();
    mutationController.current = controller;
    setUpdatingId(id);
    setUpdateError("");
    setData(mutation.data);

    try {
      const request = buildSkillGapRequest(id, safePatch, controller.signal);
      const response = await fetch(request.url, request.options);
      const payload = await response.json().catch(() => null);

      if (!response.ok) throw new Error(safeErrorMessage(payload, UPDATE_ERROR));
      if (!payload?.skillGap || typeof payload.skillGap !== "object" || Array.isArray(payload.skillGap)) {
        throw new Error(UPDATE_ERROR);
      }

      const result = coordinator.current.commitMutationSuccess(mutation.token, payload.skillGap);
      if (result.accepted) setData(result.data);
    } catch (requestError) {
      const result = coordinator.current.commitMutationFailure(mutation.token);
      if (result.accepted) {
        setData(result.data);
        setUpdateError(requestError instanceof Error && requestError.message ? requestError.message : UPDATE_ERROR);
      }
    } finally {
      if (coordinator.current.finishMutation(mutation.token)) {
        if (mutationController.current === controller) mutationController.current = null;
        setUpdatingId((current) => current === id ? null : current);
      }
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
        <p className="sr-only" role="status" aria-live="polite" aria-atomic="true">{refreshStatus}</p>

        {loading && !data && <AnalyticsLoadingState />}

        {showInitialError && (
          <section className="rounded-xl border border-red-200 bg-red-50 p-6" role="alert" aria-live="assertive">
            <h2 className="text-lg font-semibold text-red-900">Analytics could not be loaded</h2>
            <p className="mt-2 text-sm text-red-800">{error}</p>
            <button
              type="button"
              onClick={() => loadAnalytics(filters)}
              className="mt-4 min-h-11 rounded-lg bg-blue-700 px-4 py-2 text-sm font-medium text-white hover:bg-blue-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2"
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
