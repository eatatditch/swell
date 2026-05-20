import Link from "next/link";
import { Plus } from "lucide-react";

import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { LeadPipeline } from "@/components/catering/leads/lead-pipeline";
import { requireUser } from "@/lib/auth/get-user";
import { listLeads } from "@/lib/server/catering";
import { formatCents } from "@/lib/constants/catering";

interface PageProps {
  searchParams: {
    q?: string;
    location?: string;
  };
}

export default async function CateringLeadsPage({ searchParams }: PageProps) {
  const { locations } = await requireUser();

  const filterLocationId = searchParams.location || "";
  const search = searchParams.q ?? "";

  const leads = await listLeads({
    locationId: filterLocationId || null,
    status: "all",
    search,
  });

  const totalValue = leads.reduce(
    (sum, l) => sum + (l.estimated_value_cents ?? 0),
    0,
  );

  return (
    <>
      <PageHeader
        title="Pipeline"
        description={`${leads.length} deal${leads.length === 1 ? "" : "s"} · ${formatCents(totalValue)} in pipeline`}
        action={
          <Button asChild variant="accent" size="sm" className="gap-1.5">
            <Link href="/catering/leads/new">
              <Plus className="h-4 w-4" />
              New deal
            </Link>
          </Button>
        }
      />

      <form className="mb-4 flex flex-wrap items-center gap-2" action="">
        <Input
          name="q"
          defaultValue={search}
          placeholder="Search contact, company, email…"
          className="h-9 max-w-xs"
        />
        <select
          name="location"
          defaultValue={filterLocationId}
          className="h-9 rounded-full border border-input bg-background px-3 text-xs"
        >
          <option value="">All locations</option>
          {locations
            .filter((l) => l.slug !== "company_wide")
            .map((l) => (
              <option key={l.id} value={l.id}>
                {l.name}
              </option>
            ))}
        </select>
        <Button type="submit" variant="outline" size="sm">
          Filter
        </Button>
        {search || filterLocationId ? (
          <Button asChild variant="ghost" size="sm">
            <Link href="/catering/leads">Clear</Link>
          </Button>
        ) : null}
      </form>

      <LeadPipeline leads={leads} />
    </>
  );
}
