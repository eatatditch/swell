import { notFound } from "next/navigation";
import Link from "next/link";
import { Calendar, Mail, MapPin, Phone, Tag } from "lucide-react";

import { PageHeader } from "@/components/layout/page-header";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { LeadStatusBadge, EventStatusBadge } from "@/components/catering/status-badges";
import { ConversationThread } from "@/components/catering/emails/conversation-thread";
import { ActivityFeed } from "@/components/activity/activity-feed";
import { requireUser } from "@/lib/auth/get-user";
import {
  getContact,
  listEventsForContact,
  listLeadsForContact,
} from "@/lib/server/catering";
import {
  getCurrentUserGmailAccount,
  listEmailsForContact,
} from "@/lib/server/gmail";
import {
  formatCents,
  formatEventDate,
} from "@/lib/constants/catering";

interface PageProps {
  params: { id: string };
}

export default async function ContactDetailPage({ params }: PageProps) {
  await requireUser();
  const contact = await getContact(params.id);
  if (!contact) notFound();

  const [leads, events, emails, gmailAccount] = await Promise.all([
    listLeadsForContact(contact.id),
    listEventsForContact(contact.id),
    listEmailsForContact(contact.id),
    getCurrentUserGmailAccount(),
  ]);

  const cityLine = [contact.city, contact.state, contact.postal_code]
    .filter(Boolean)
    .join(", ");

  return (
    <>
      <PageHeader
        title={contact.full_name}
        description={
          contact.company
            ? contact.title
              ? `${contact.title} · ${contact.company}`
              : contact.company
            : contact.title ?? "Catering contact"
        }
        action={
          <Button asChild variant="outline" size="sm">
            <Link href={`/catering/contacts/${contact.id}/edit`}>Edit</Link>
          </Button>
        }
      />

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Contact</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <dl className="grid gap-3 text-sm sm:grid-cols-2">
                {contact.phone ? (
                  <Fact icon={Phone} label="Phone">
                    <a href={`tel:${contact.phone}`} className="hover:underline">
                      {contact.phone}
                    </a>
                  </Fact>
                ) : null}
                {contact.email ? (
                  <Fact icon={Mail} label="Email">
                    <a
                      href={`mailto:${contact.email}`}
                      className="hover:underline"
                    >
                      {contact.email}
                    </a>
                  </Fact>
                ) : null}
                {contact.address || cityLine ? (
                  <Fact icon={MapPin} label="Address">
                    <div className="whitespace-pre-line">
                      {[contact.address, cityLine].filter(Boolean).join("\n")}
                    </div>
                  </Fact>
                ) : null}
                {contact.source ? (
                  <Fact label="Source">{contact.source}</Fact>
                ) : null}
              </dl>

              {contact.tags.length > 0 ? (
                <>
                  <Separator />
                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    <Tag className="h-3 w-3 text-muted-foreground" />
                    {contact.tags.map((t) => (
                      <span
                        key={t}
                        className="rounded-full bg-muted px-2.5 py-0.5 font-medium"
                      >
                        {t}
                      </span>
                    ))}
                  </div>
                </>
              ) : null}

              {contact.notes ? (
                <>
                  <Separator />
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Notes
                    </p>
                    <p className="mt-1 whitespace-pre-wrap text-sm">
                      {contact.notes}
                    </p>
                  </div>
                </>
              ) : null}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Email thread</CardTitle>
            </CardHeader>
            <CardContent>
              <ConversationThread
                contactId={contact.id}
                leadId={leads[0]?.id ?? null}
                contactEmail={contact.email}
                contactName={contact.full_name}
                subjectSeed={`Following up — ${contact.full_name}`}
                emails={emails}
                gmailConnected={gmailAccount?.status === "active"}
                gmailEmail={gmailAccount?.email ?? null}
                emptyHint={`Every email between ${contact.full_name} and your team will appear here, across all leads and events.`}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                Pipeline ({leads.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {leads.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No leads yet for this contact.
                </p>
              ) : (
                <ul className="divide-y divide-border">
                  {leads.map((l) => (
                    <li
                      key={l.id}
                      className="flex items-center justify-between py-2.5"
                    >
                      <div className="min-w-0">
                        <Link
                          href={`/catering/leads/${l.id}`}
                          className="text-sm font-medium hover:text-accent"
                        >
                          {l.event_type ?? "Catering inquiry"}
                        </Link>
                        <p className="text-xs text-muted-foreground">
                          {l.desired_date ? formatEventDate(l.desired_date) : "No date"}
                          {l.estimated_value_cents
                            ? ` · ${formatCents(l.estimated_value_cents)}`
                            : ""}
                        </p>
                      </div>
                      <LeadStatusBadge status={l.status} />
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                Events ({events.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {events.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No booked events yet.
                </p>
              ) : (
                <ul className="divide-y divide-border">
                  {events.map((e) => (
                    <li
                      key={e.id}
                      className="flex items-center justify-between py-2.5"
                    >
                      <div className="min-w-0">
                        <Link
                          href={`/catering/events/${e.id}`}
                          className="text-sm font-medium hover:text-accent"
                        >
                          {e.title}
                        </Link>
                        <p className="text-xs text-muted-foreground">
                          <Calendar className="mr-1 inline h-3 w-3" />
                          {formatEventDate(e.event_date)}
                          {e.guest_count ? ` · ${e.guest_count} guests` : ""}
                        </p>
                      </div>
                      <EventStatusBadge status={e.status} />
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Activity</CardTitle>
            </CardHeader>
            <CardContent>
              <ActivityFeed
                objectType="catering_contact"
                objectId={contact.id}
                limit={20}
              />
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}

function Fact({
  icon: Icon,
  label,
  children,
}: {
  icon?: typeof Calendar;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <dt className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {Icon ? <Icon className="mr-1 inline h-3 w-3" /> : null}
        {label}
      </dt>
      <dd className="mt-0.5 text-sm">{children}</dd>
    </div>
  );
}
