import { notFound } from "next/navigation";

import { PageHeader } from "@/components/layout/page-header";
import { ContactForm } from "@/components/catering/contacts/contact-form";
import { requireUser } from "@/lib/auth/get-user";
import { getContact } from "@/lib/server/catering";

interface PageProps {
  params: { id: string };
}

export default async function EditContactPage({ params }: PageProps) {
  await requireUser();
  const contact = await getContact(params.id);
  if (!contact) notFound();

  return (
    <>
      <PageHeader
        title={`Edit ${contact.full_name}`}
        description="Update CRM contact details."
      />
      <ContactForm contact={contact} />
    </>
  );
}
