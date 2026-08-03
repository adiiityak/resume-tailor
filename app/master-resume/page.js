import PlannedPage from "@/components/shared/PlannedPage";

export const metadata = { title: "Master Resume · Resume Tailor" };

export default function MasterResumePage() {
  return (
    <PlannedPage
      title="Master Resume"
      phase="Phase 3"
      description="A single verified source of truth for all your real experience. Tailored resumes pull from it — and can never silently modify it."
      features={[
        "Sections: contact, summary, experience, projects, education, skills, certifications, awards",
        "Stable IDs and evidence status on every item",
        "Approve / Needs review / Outdated / Do not use flags",
        "Role-specific base profiles (Product Designer, UI/UX, etc.)",
        "Searchable bullet library with metric and evidence tracking",
        "Re-tailor suggestions when the master resume changes",
      ]}
    />
  );
}
