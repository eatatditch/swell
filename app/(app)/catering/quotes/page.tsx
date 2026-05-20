import Link from "next/link";
import { Plus } from "lucide-react";

import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { QuoteList } from "@/components/catering/quotes/quote-list";
import { requireUser } from "@/lib/auth/get-user";
import { resolveActiveLocation } from "@/lib/auth/active-location";
import { listQuotes } from "@/lib/server/catering-billing";
import { QUOTE_STATUSES, QUOTE_STATUS_LABELS } from "@/lib/constants/catering";
import type { CateringQuoteStatus } from "@/lib/types/database";

interface PageProps {
  searchParams: { q?: string; status?: string; location?: string };
}

export default async function QuotesPage({ searchParams }: PageProps) {
  const { locations } = await requireUser();
  const active = resolveActiveLocation(locations);
  const filterLocationId = searchParams.location || active?.id || "";
  const status = (
    searchParams.status &&
    QUOTE_STATUSES.includes(searchParams.status as CateringQuoteStatus)
      ? searchParams.status
      : "all"
  ) as CateringQuoteStatus | "all";

  const quotes = await listQuotes({
    locationId: filterLocationId || null,
    status,
    search: searchParams.q ?? "",
  });

  return (
    <>
      <PageHeader
        title="Quotes"
        description="Build and send quotes to catering customers."
        action={
          <Button asChild variant="accent" size="sm" className="gap-1.5">
            <Link href="/catering/quotes/new">
              <Plus className="h-4 w-4" />
              New quote
            </Link>
          </Button>
        }
      />

      <form className="mb-4 flex flex-wrap items-center gap-2" action="">
        <Input
          name="q"
          defaultValue={searchParams.q ?? ""}
          placeholder="Search quote # or title…"
          className="h-9 max-w-xs"
        />
        <select
          name="status"
          defaultValue={status}
          className="h-9 rounded-full border border-input bg-background px-3 text-xs"
        >
          <option value="all">All statuses</option>
          {QUOTE_STATUSES.map((s) => (
            <option key={s} value={s}>
              {QUOTE_STATUS_LABELS[s]}
            </option>
          ))}
        </select>
        <Button type="submit" variant="outline" size="sm">
          Filter
        </Button>
      </form>

      <QuoteList quotes={quotes} />
    </>
  );
}
