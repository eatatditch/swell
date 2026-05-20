import { PageHeader } from "@/components/layout/page-header";
import { LeadForm } from "@/components/catering/leads/lead-form";
import { requireUser } from "@/lib/auth/get-user";
import { resolveActiveLocation } from "@/lib/auth/active-location";
import { getContact, listContacts } from "@/lib/server/catering";

interface PageProps {
  searchParams: { contact?: string };
}

export default async function NewLeadPage({ searchParams }: PageProps) {
  const { locations } = await requireUser();
  const active = resolveActiveLocation(locations);

  const contacts = await listContacts({});
  const seeded = searchParams.contact
    ? await getContact(searchParams.contact)
    : null;

  return (
    <>
      <PageHeader
        title="New deal"
        description="Capture the inquiry while it's fresh."
      />
      <LeadForm
        locations={locations}
        contacts={contacts}
        defaultLocationId={active?.id ?? null}
        defaultContact={
          seeded
            ? {
                id: seeded.id,
                full_name: seeded.full_name,
                email: seeded.email,
                phone: seeded.phone,
                company: seeded.company,
              }
            : null
        }
      />
    </>
  );
}
