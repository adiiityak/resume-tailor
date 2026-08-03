import CompanyFolderCard from "@/components/dashboard/CompanyFolderCard";

export default function CompanyGrid({ companies }) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {companies.map((c) => (
        <CompanyFolderCard key={c.slug} company={c} />
      ))}
    </div>
  );
}
