import { PageHeader } from "@/components/layout/page-header";
import { NewFormPanel } from "@/components/catering/forms/new-form-dialog";
import { requireUser } from "@/lib/auth/get-user";

export default async function NewCateringFormPage() {
  const { locations } = await requireUser();
  const cateringLocations = locations.filter(
    (l) => l.slug !== "company_wide",
  );

  return (
    <>
      <PageHeader
        title="New inquiry form"
        description="Pick a name and a location. You'll customize the fields next."
      />
      <div className="mx-auto max-w-xl">
        <NewFormPanel locations={cateringLocations} />
      </div>
    </>
  );
}
