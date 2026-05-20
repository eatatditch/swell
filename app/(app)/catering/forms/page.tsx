import Link from "next/link";
import { Plus } from "lucide-react";

import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { FormList } from "@/components/catering/forms/form-list";
import { requireUser } from "@/lib/auth/get-user";
import { resolveActiveLocation } from "@/lib/auth/active-location";
import { listLeadForms } from "@/lib/server/lead-forms";

export default async function CateringFormsPage() {
  const { locations } = await requireUser();
  const active = resolveActiveLocation(locations);
  const forms = await listLeadForms({ locationId: active?.id ?? null });

  return (
    <>
      <PageHeader
        title="Inquiry forms"
        description="Build embeddable forms for the marketing site. Submissions land as leads in the catering pipeline."
        action={
          <Button asChild variant="accent" size="sm" className="gap-1.5">
            <Link href="/catering/forms/new">
              <Plus className="h-4 w-4" />
              New form
            </Link>
          </Button>
        }
      />
      <FormList forms={forms} />
    </>
  );
}
