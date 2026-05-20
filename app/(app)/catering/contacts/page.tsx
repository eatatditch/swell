import Link from "next/link";
import { Plus } from "lucide-react";

import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ContactList } from "@/components/catering/contacts/contact-list";
import { requireUser } from "@/lib/auth/get-user";
import { listContacts } from "@/lib/server/catering";

interface PageProps {
  searchParams: { q?: string };
}

export default async function CateringContactsPage({
  searchParams,
}: PageProps) {
  await requireUser();
  const search = searchParams.q ?? "";
  const contacts = await listContacts({ search });

  return (
    <>
      <PageHeader
        title="Contacts"
        description="Customer directory for catering leads, quotes, and events."
        action={
          <Button asChild variant="accent" size="sm" className="gap-1.5">
            <Link href="/catering/contacts/new">
              <Plus className="h-4 w-4" />
              New contact
            </Link>
          </Button>
        }
      />

      <form className="mb-4 flex flex-wrap items-center gap-2" action="">
        <Input
          name="q"
          defaultValue={search}
          placeholder="Search name, company, email, phone…"
          className="h-9 max-w-sm"
        />
        <Button type="submit" variant="outline" size="sm">
          Search
        </Button>
        {search ? (
          <Button asChild variant="ghost" size="sm">
            <Link href="/catering/contacts">Clear</Link>
          </Button>
        ) : null}
      </form>

      <ContactList contacts={contacts} />
    </>
  );
}
