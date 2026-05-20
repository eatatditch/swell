import { notFound } from "next/navigation";

import { PageHeader } from "@/components/layout/page-header";
import { QuoteStatusBadge } from "@/components/catering/status-badges";
import { QuoteBuilder } from "@/components/catering/quotes/quote-builder";
import { requireUser } from "@/lib/auth/get-user";
import { getQuoteFull } from "@/lib/server/catering-billing";
import { listMenus, getMenuFull } from "@/lib/server/catering-menus";
import { formatEventDate } from "@/lib/constants/catering";

interface PageProps {
  params: { id: string };
}

export default async function QuoteDetailPage({ params }: PageProps) {
  await requireUser();
  const quote = await getQuoteFull(params.id);
  if (!quote) notFound();

  const menuStubs = await listMenus({ includeArchived: false });
  const menus = (
    await Promise.all(menuStubs.map((m) => getMenuFull(m.id)))
  ).filter((m): m is NonNullable<typeof m> => m !== null);

  return (
    <>
      <PageHeader
        title={`${quote.quote_number} · ${quote.title}`}
        description={
          quote.contact
            ? `${quote.contact.full_name}${quote.contact.company ? ` · ${quote.contact.company}` : ""}${quote.event_date ? ` · ${formatEventDate(quote.event_date)}` : ""}`
            : undefined
        }
        action={<QuoteStatusBadge status={quote.status} />}
      />

      <QuoteBuilder quote={quote} menus={menus} />
    </>
  );
}
