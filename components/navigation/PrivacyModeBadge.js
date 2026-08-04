import Link from "next/link";

export default function PrivacyModeBadge() {
  return (
    <Link
      href="/settings"
      title="Your data stays on this machine. Claude API mode is opt-in per tailoring."
      className="inline-flex min-h-11 items-center gap-1.5 rounded-md border border-emerald-200 bg-emerald-50 px-2 py-1 text-xs font-medium text-emerald-700 hover:bg-emerald-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2"
    >
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
        <path d="M12 3l7 3v6c0 4-3 7-7 9-4-2-7-5-7-9V6z" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      Local-first
    </Link>
  );
}
