export const NAV_ITEMS = [
  { label: "Resume Tailor", href: "/", icon: "tailor", exact: true },
  { label: "Dashboard", href: "/dashboard", icon: "dashboard" },
  { label: "Jobs", href: "/jobs", icon: "jobs" },
  { label: "Master Resume", href: "/master-resume", icon: "resume" },
  { label: "Achievements", href: "/achievements", icon: "achievements" },
  { label: "Interviews", href: "/interviews", icon: "interviews" },
  { label: "Analytics", href: "/analytics", icon: "analytics" },
  { label: "Settings", href: "/settings", icon: "settings" },
];

const PATHS = {
  tailor: "M4 5h16M4 12h10M4 19h7",
  dashboard: "M4 4h7v7H4zM13 4h7v4h-7zM13 11h7v9h-7zM4 14h7v6H4z",
  jobs: "M4 7h16v13H4zM8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2",
  resume: "M7 3h7l5 5v13H7zM14 3v5h5",
  achievements: "M12 3l2.5 5 5.5.5-4 4 1 5.5L12 20l-5-2 1-5.5-4-4 5.5-.5z",
  interviews: "M4 5h16v10H9l-4 4V5z",
  analytics: "M5 20V10M12 20V4M19 20v-7",
  settings: "M12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6zM4 12h1.5M18.5 12H20M12 4v1.5M12 18.5V20",
};

export function NavIcon({ name, className = "h-4 w-4" }) {
  const d = PATHS[name] || PATHS.dashboard;
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <path d={d} />
    </svg>
  );
}
