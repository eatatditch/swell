import { PageHeader } from "@/components/layout/page-header";
import { LeadForm } from "@/components/catering/leads/lead-form";
import { requireUser } from "@/lib/auth/get-user";
import { resolveActiveLocation } from "@/lib/auth/active-location";

export default async function NewLeadPage() {
  const { locations } = await requireUser();
  const active = resolveActiveLocation(locations);

  return (
    <>
      <PageHeader
        title="New catering lead"
        description="Capture the inquiry while it's fresh."
      />
      <LeadForm
        locations={locations}
        defaultLocationId={active?.id ?? null}
      />
    </>
  );
}
