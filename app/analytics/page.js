import PlannedPage from "@/components/shared/PlannedPage";

export const metadata = { title: "Analytics · Resume Tailor" };

export default function AnalyticsPage() {
  return (
    <PlannedPage
      title="Job-Search Analytics"
      phase="Phase 5"
      description="Transparent metrics computed from your own records. Definitions are always shown, and the app never claims your resume caused an outcome."
      features={[
        "Pipeline conversion, response rate, interview rate, offer rate",
        "Applications over time and by source",
        "Match score vs. response patterns",
        "Resume-version and base-profile performance (with minimum-data warnings)",
        "Keyword trend analysis across saved job descriptions",
        "Skill-gap roadmap from repeated missing requirements",
      ]}
    />
  );
}
