// Client-safe constants & helpers for reminders (no fs imports).

export const REMINDER_TYPES = [
  "Application follow-up",
  "Recruiter follow-up",
  "Referral follow-up",
  "Interview preparation",
  "Interview reminder",
  "Thank-you email",
  "Assessment deadline",
  "Offer deadline",
  "Custom reminder",
];

export const REMINDER_STATUSES = ["Pending", "Completed", "Snoozed"];

function startOfDay(d) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

// Splits reminders into overdue / today / upcoming-this-week / later, using the
// provided "now" (defaults to the current date on the client).
export function bucketReminders(reminders, now = new Date()) {
  const today = startOfDay(now);
  const weekEnd = new Date(today);
  weekEnd.setDate(weekEnd.getDate() + 7);

  const overdue = [];
  const dueToday = [];
  const upcoming = [];
  const later = [];
  const completed = [];

  for (const r of reminders) {
    if (r.status === "Completed") { completed.push(r); continue; }
    if (!r.dueDate) { later.push(r); continue; }
    const due = startOfDay(r.dueDate);
    if (due < today) overdue.push(r);
    else if (due.getTime() === today.getTime()) dueToday.push(r);
    else if (due <= weekEnd) upcoming.push(r);
    else later.push(r);
  }

  const byDue = (a, b) => `${a.dueDate || ""}${a.dueTime || ""}`.localeCompare(`${b.dueDate || ""}${b.dueTime || ""}`);
  [overdue, dueToday, upcoming, later].forEach((arr) => arr.sort(byDue));
  return { overdue, dueToday, upcoming, later, completed };
}
