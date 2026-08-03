import PlannedPage from "@/components/shared/PlannedPage";

export const metadata = { title: "Settings · Resume Tailor" };

export default function SettingsPage() {
  return (
    <PlannedPage
      title="Settings & Privacy"
      phase="Phase 5"
      description="How your data is handled today, and what's coming next."
      features={[
        "Sensitive-data masking ([NAME], [EMAIL], [PHONE]) before API calls",
        "Preview exactly what is sent to the Anthropic API",
        "Configurable resume filename templates",
        "Full workspace backup & restore (.zip)",
        "Optional local vault encryption",
      ]}
    >
      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
          <h2 className="text-sm font-semibold text-emerald-800">Local Mode</h2>
          <p className="mt-1 text-sm text-emerald-700">
            Your resume, job descriptions, and generated files stay entirely on this machine. Nothing
            is sent anywhere. Tailoring and cover letters are produced by on-device text logic.
          </p>
        </div>
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
          <h2 className="text-sm font-semibold text-amber-800">Claude API Mode</h2>
          <p className="mt-1 text-sm text-amber-700">
            When you opt in per tailoring, the selected resume and job-description text are sent to the
            Anthropic API to rewrite phrasing. Your API key is read server-side from
            <code className="mx-1 rounded bg-white/60 px-1">.env.local</code> and is never exposed to the browser.
          </p>
        </div>
      </div>
    </PlannedPage>
  );
}
