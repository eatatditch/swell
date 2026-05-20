import { notFound } from "next/navigation";

import { PageHeader } from "@/components/layout/page-header";
import { LeadForm } from "@/components/catering/leads/lead-form";
import { requireUser } from "@/lib/auth/get-user";
import { getLead, listContacts } from "@/lib/server/catering";

interface PageProps {
  params: { id: string };
}

export default async function EditLeadPage({ params }: PageProps) {
  const { locations } = await requireUser();
  const lead = await getLead(params.id);
  if (!lead) notFound();

  const contacts = await listContacts({});

  return (
    <>
      <PageHeader
        title={`Edit · ${lead.contact.full_name}`}
        description="Update the lead details."
      />
      <LeadForm
        locations={locations}
        contacts={contacts}
        lead={lead}
        defaultContact={lead.contact}
      />
    </>
  );
}
