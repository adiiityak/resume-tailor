export default function ScoreRing({ score, size = 88, stroke = 8, label }) {
  const has = typeof score === "number";
  const pct = has ? Math.max(0, Math.min(100, score)) : 0;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const offset = c - (pct / 100) * c;

  const color = !has ? "#cbd5e1" : pct >= 80 ? "#059669" : pct >= 60 ? "#d97706" : pct >= 40 ? "#2563eb" : "#64748b";

  return (
    <div
      className="relative inline-flex items-center justify-center"
      style={{ width: size, height: size }}
      role="img"
      aria-label={`${label || "Score"}: ${has ? pct + " out of 100" : "not available"}`}
    >
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#e2e8f0" strokeWidth={stroke} />
        <circle
          cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={stroke}
          strokeDasharray={c} strokeDashoffset={offset} strokeLinecap="round"
          style={{ transition: "stroke-dashoffset 500ms ease" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-xl font-semibold text-slate-900">{has ? pct : "—"}</span>
        {label && <span className="text-[10px] uppercase tracking-wide text-slate-400">{label}</span>}
      </div>
    </div>
  );
}
