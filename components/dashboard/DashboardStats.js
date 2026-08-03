function StatCard({ label, value, hint }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-1.5 text-2xl font-semibold text-slate-900">{value}</p>
      {hint && <p className="mt-0.5 text-xs text-slate-400">{hint}</p>}
    </div>
  );
}

export default function DashboardStats({ summary }) {
  const s = summary || {};
  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      <StatCard label="Companies" value={s.companyCount ?? 0} />
      <StatCard label="Applications" value={s.applicationCount ?? 0} />
      <StatCard label="Applied This Month" value={s.applicationsThisMonth ?? 0} hint="Created this month" />
      <StatCard label="Average Match Score" value={`${s.averageMatchScore ?? 0}%`} />
    </div>
  );
}
