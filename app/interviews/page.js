import PlannedPage from "@/components/shared/PlannedPage";

export const metadata = { title: "Interviews · Resume Tailor" };

export default function InterviewsPage() {
  return (
    <PlannedPage
      title="Interview Preparation"
      phase="Phase 4"
      description="Prepare for each application with questions, STAR answers, and round tracking — all grounded in your real experience, never fabricated."
      features={[
        "Interview question generator from the job description and your resume",
        "STAR answer builder (Situation, Task, Action, Result)",
        "'Tell me about yourself' scripts (30 / 60 / 90 seconds)",
        "Thoughtful questions-to-ask generator",
        "Interview round tracker with dates, formats, and outcomes",
        "Confidence tracking per answer",
      ]}
    />
  );
}
