import PlannedPage from "@/components/shared/PlannedPage";

export const metadata = { title: "Jobs · Resume Tailor" };

export default function JobsPage() {
  return (
    <PlannedPage
      title="Job Library"
      phase="Phase 3"
      description="Save opportunities before tailoring, score their fit against your real experience, and detect duplicate postings."
      features={[
        "Save jobs with company, role, location, work mode, salary, closing date",
        "Priority and interest levels",
        "Pre-tailoring job-fit score (strong / partial / missing evidence)",
        "Duplicate-job detection across saved postings",
        "Filters by company, role, work mode, fit score, status",
        "Tailor directly from a saved job",
      ]}
    />
  );
}
