import { notFound } from "next/navigation";

import { PageHeader } from "@/components/layout/page-header";
import { EventForm } from "@/components/catering/events/event-form";
import { requireUser } from "@/lib/auth/get-user";
import { getEvent } from "@/lib/server/catering";

interface PageProps {
  params: { id: string };
}

export default async function EditEventPage({ params }: PageProps) {
  const { locations } = await requireUser();
  const event = await getEvent(params.id);
  if (!event) notFound();

  return (
    <>
      <PageHeader
        title={`Edit · ${event.title}`}
        description="Update event details. Menu, payments, UGC, and reviews live on the detail page."
      />
      <EventForm locations={locations} event={event} />
    </>
  );
}
