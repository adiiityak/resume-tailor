import { STATUS_STYLES } from "@/lib/dashboardShared";

export default function ApplicationStatusBadge({ status }) {
  const style = STATUS_STYLES[status] || STATUS_STYLES.Tailored;
  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${style}`}>
      {status || "Tailored"}
    </span>
  );
}
