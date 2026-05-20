import { notFound } from "next/navigation";

import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { QuoteStatusBadge } from "@/components/catering/status-badges";
import { QuoteBuilder } from "@/components/catering/quotes/quote-builder";
import { ConversationThread } from "@/components/catering/emails/conversation-thread";
import { requireUser } from "@/lib/auth/get-user";
import { getQuoteFull } from "@/lib/server/catering-billing";
import { listMenus, getMenuFull } from "@/lib/server/catering-menus";
import {
  getCurrentUserGmailAccount,
  listEmailsForQuote,
} from "@/lib/server/gmail";
import { formatEventDate } from "@/lib/constants/catering";

interface PageProps {
  params: { id: string };
}

export default async function QuoteDetailPage({ params }: PageProps) {
  await requireUser();
  const quote = await getQuoteFull(params.id);
  if (!quote) notFound();

  const [menuStubs, emails, gmailAccount] = await Promise.all([
    listMenus({ includeArchived: false }),
    listEmailsForQuote(quote.id),
    getCurrentUserGmailAccount(),
  ]);
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

      {quote.contact ? (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="text-base">Email thread</CardTitle>
          </CardHeader>
          <CardContent>
            <ConversationThread
              leadId={quote.lead_id ?? null}
              contactId={quote.contact_id}
              contactEmail={quote.contact.email}
              contactName={quote.contact.full_name}
              subjectSeed={`${quote.quote_number} — ${quote.title}`}
              emails={emails}
              gmailConnected={gmailAccount?.status === "active"}
              gmailEmail={gmailAccount?.email ?? null}
              emptyHint={`No emails on this quote yet. Mail to or from ${quote.contact.full_name} (across all leads / events) will appear here.`}
            />
          </CardContent>
        </Card>
      ) : null}
    </>
  );
}
