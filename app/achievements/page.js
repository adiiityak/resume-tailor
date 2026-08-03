import PlannedPage from "@/components/shared/PlannedPage";

export const metadata = { title: "Achievements · Resume Tailor" };

export default function AchievementsPage() {
  return (
    <PlannedPage
      title="Achievement Bank"
      phase="Phase 3"
      description="Store raw, verified accomplishments in your own words. Achievements can be suggested during tailoring — but never inserted without your explicit approval."
      features={[
        "Context, action, result, and (only if known) a real metric",
        "Impact-metric prompts that ask for real numbers instead of inventing them",
        "User-confirmed metric labels",
        "Tags, skills, and evidence links",
        "Resume-ready bullet derived from verified facts",
        "Reused across tailored resumes and STAR answers",
      ]}
    />
  );
}
