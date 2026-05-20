import Link from "next/link";
import { Plus } from "lucide-react";

import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { LeadPipeline } from "@/components/catering/leads/lead-pipeline";
import { requireUser } from "@/lib/auth/get-user";
import { listLeads } from "@/lib/server/catering";
import { LEAD_STATUSES, LEAD_STATUS_LABELS } from "@/lib/constants/catering";
import { cn } from "@/lib/utils";
import type { CateringLeadStatus } from "@/lib/types/database";

interface PageProps {
  searchParams: {
    q?: string;
    status?: string;
    location?: string;
  };
}

export default async function CateringLeadsPage({ searchParams }: PageProps) {
  const { locations } = await requireUser();

  const filterLocationId = searchParams.location || "";
  const search = searchParams.q ?? "";
  const status = (
    searchParams.status &&
    LEAD_STATUSES.includes(searchParams.status as CateringLeadStatus)
      ? searchParams.status
      : "all"
  ) as CateringLeadStatus | "all";

  const leads = await listLeads({
    locationId: filterLocationId || null,
    status,
    search,
  });

  return (
    <>
      <PageHeader
        title="Catering leads"
        description="Inquiries through booked."
        action={
          <Button asChild variant="accent" size="sm" className="gap-1.5">
            <Link href="/catering/leads/new">
              <Plus className="h-4 w-4" />
              New lead
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
        <select
          name="status"
          defaultValue={status}
          className="h-9 rounded-full border border-input bg-background px-3 text-xs"
        >
          <option value="all">All stages</option>
          {LEAD_STATUSES.map((s) => (
            <option key={s} value={s}>
              {LEAD_STATUS_LABELS[s]}
            </option>
          ))}
        </select>
        <Button type="submit" variant="outline" size="sm">
          Filter
        </Button>
        {search || filterLocationId || status !== "all" ? (
          <Button asChild variant="ghost" size="sm">
            <Link href="/catering/leads">Clear</Link>
          </Button>
        ) : null}
      </form>

      <div className="mb-3 hidden flex-wrap items-center gap-1.5 text-xs lg:flex">
        <span className="text-muted-foreground">Quick stages:</span>
        {LEAD_STATUSES.map((s) => {
          const href = `/catering/leads?status=${s}${filterLocationId ? `&location=${filterLocationId}` : ""}${search ? `&q=${encodeURIComponent(search)}` : ""}`;
          return (
            <Link
              key={s}
              href={href}
              className={cn(
                "rounded-full border px-3 py-1 transition-colors",
                status === s
                  ? "border-foreground bg-foreground text-background"
                  : "border-input bg-card text-muted-foreground hover:text-foreground",
              )}
            >
              {LEAD_STATUS_LABELS[s]}
            </Link>
          );
        })}
      </div>

      <LeadPipeline leads={leads} />
    </>
  );
}
