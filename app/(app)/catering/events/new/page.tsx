import { PageHeader } from "@/components/layout/page-header";
import { EventForm } from "@/components/catering/events/event-form";
import { requireUser } from "@/lib/auth/get-user";
import { resolveActiveLocation } from "@/lib/auth/active-location";

interface PageProps {
  searchParams: { lead?: string };
}

export default async function NewEventPage({ searchParams }: PageProps) {
  const { locations } = await requireUser();
  const active = resolveActiveLocation(locations);
  const operatingLocations = locations.filter((l) => l.slug !== "company_wide");
  const defaultLocationId =
    active?.slug !== "company_wide"
      ? active?.id ?? operatingLocations[0]?.id ?? null
      : operatingLocations[0]?.id ?? null;

  return (
    <>
      <PageHeader
        title="New event"
        description="Create a BEO. You can fill the menu and notes after saving."
      />
      <EventForm
        locations={locations}
        defaultLocationId={defaultLocationId}
        defaultLeadId={searchParams.lead ?? null}
      />
    </>
  );
}
