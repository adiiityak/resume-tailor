import { formatMetricValue, formatRate, rateDetail } from "@/lib/analytics/client";
import MetricCard from "./MetricCard";

function hasValue(summary, key) {
  return Object.hasOwn(summary || {}, key);
}

function formatAverageResponseDays(value) {
  return Number.isFinite(value) ? `${value.toFixed(1)} days` : "—";
}

export default function AnalyticsSummary({ summary = {}, definitions = {} }) {
  const cards = [
    hasValue(summary, "totalJobsSaved") && { label: "Jobs Saved", value: formatMetricValue(summary.totalJobsSaved), detail: "Saved jobs matching the current filters." },
    hasValue(summary, "submittedApplications") && { label: "Submitted", value: formatMetricValue(summary.submittedApplications), detail: `${formatMetricValue(summary.submittedApplications)} submitted applications.` },
    hasValue(summary, "responseRate") && { label: "Response Rate", value: formatRate(summary.responseRate), detail: rateDetail(summary.responseRate), definition: definitions.responseRate },
    hasValue(summary, "recruiterScreenRate") && { label: "Recruiter Screen Rate", value: formatRate(summary.recruiterScreenRate), detail: rateDetail(summary.recruiterScreenRate), definition: definitions.recruiterScreenRate },
    hasValue(summary, "interviewRate") && { label: "Interview Rate", value: formatRate(summary.interviewRate), detail: rateDetail(summary.interviewRate), definition: definitions.interviewRate },
    hasValue(summary, "offerRate") && { label: "Offer Rate", value: formatRate(summary.offerRate), detail: rateDetail(summary.offerRate), definition: definitions.offerRate },
    hasValue(summary, "rejectionRate") && { label: "Rejection Rate", value: formatRate(summary.rejectionRate), detail: rateDetail(summary.rejectionRate), definition: definitions.rejectionRate },
    hasValue(summary, "averageMatchScore") && { label: "Average Match", value: formatMetricValue(summary.averageMatchScore), detail: "Across applications with a stored match score.", definition: definitions.averageMatchScore },
    hasValue(summary, "averageResponseDays") && { label: "Average Response", value: formatAverageResponseDays(summary.averageResponseDays), detail: Number.isFinite(summary.averageResponseDays) ? `Based on ${formatMetricValue(summary.responseTimeSampleSize)} response records.` : "No eligible records", definition: definitions.averageResponseDays },
    hasValue(summary, "followUpCompletionRate") && { label: "Follow-up Completion", value: formatRate(summary.followUpCompletionRate), detail: rateDetail(summary.followUpCompletionRate, "eligible follow-ups"), definition: definitions.followUpCompletionRate },
  ].filter(Boolean);

  if (!cards.length) return null;

  return (
    <section aria-labelledby="analytics-summary-title">
      <div className="mb-4 flex items-baseline justify-between gap-4">
        <h2 id="analytics-summary-title" className="text-lg font-semibold text-slate-900">Summary</h2>
        <p className="text-sm text-slate-600">Rates include numerator and denominator context.</p>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {cards.map((card) => <MetricCard key={card.label} {...card} />)}
      </div>
    </section>
  );
}
