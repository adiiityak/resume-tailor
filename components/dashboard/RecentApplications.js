import ApplicationTable from "@/components/dashboard/ApplicationTable";

export default function RecentApplications({ applications, onDelete }) {
  return (
    <section>
      <h2 className="mb-3 text-lg font-semibold text-slate-900">Recent Applications</h2>
      <ApplicationTable applications={applications} onDelete={onDelete} />
    </section>
  );
}
