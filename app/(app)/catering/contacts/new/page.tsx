import { PageHeader } from "@/components/layout/page-header";
import { ContactForm } from "@/components/catering/contacts/contact-form";
import { requireUser } from "@/lib/auth/get-user";

export default async function NewContactPage() {
  await requireUser();
  return (
    <>
      <PageHeader
        title="New contact"
        description="Add a person to the catering CRM."
      />
      <ContactForm />
    </>
  );
}
