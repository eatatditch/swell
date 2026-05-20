import { notFound } from "next/navigation";

import { PageHeader } from "@/components/layout/page-header";
import { LeadForm } from "@/components/catering/leads/lead-form";
import { requireUser } from "@/lib/auth/get-user";
import { getLead } from "@/lib/server/catering";

interface PageProps {
  params: { id: string };
}

export default async function EditLeadPage({ params }: PageProps) {
  const { locations } = await requireUser();
  const lead = await getLead(params.id);
  if (!lead) notFound();

  return (
    <>
      <PageHeader
        title={`Edit · ${lead.contact_name}`}
        description="Update the lead details."
      />
      <LeadForm locations={locations} lead={lead} />
    </>
  );
}
