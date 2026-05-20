import { notFound } from "next/navigation";
import Link from "next/link";
import { Calendar, ExternalLink, Mail, Phone, Users } from "lucide-react";

import { PageHeader } from "@/components/layout/page-header";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { CommentThread } from "@/components/comments/comment-thread";
import { LeadStatusBadge } from "@/components/catering/status-badges";
import { LeadStageControls } from "@/components/catering/leads/lead-stage-controls";
import { ConvertToEventDialog } from "@/components/catering/leads/convert-to-event-dialog";
import { ConvertToQuoteButton } from "@/components/catering/leads/convert-to-quote-button";
import { FollowupList } from "@/components/catering/followups/followup-list";
import { ConversationThread } from "@/components/catering/emails/conversation-thread";
import { ActivityFeed } from "@/components/activity/activity-feed";
import { requireUser } from "@/lib/auth/get-user";
import {
  getLead,
  listFollowups,
} from "@/lib/server/catering";
import {
  getCurrentUserGmailAccount,
  listEmailsForLead,
} from "@/lib/server/gmail";
import {
  formatCents,
  formatEventDate,
} from "@/lib/constants/catering";

interface PageProps {
  params: { id: string };
}

export default async function LeadDetailPage({ params }: PageProps) {
  const { profile, locations } = await requireUser();
  const lead = await getLead(params.id);
  if (!lead) notFound();

  const [followups, gmailAccount, emails] = await Promise.all([
    listFollowups(lead.id),
    getCurrentUserGmailAccount(),
    listEmailsForLead(lead.id),
  ]);
  const canDelete =
    lead.created_by === profile.id || profile.role === "founder_admin";

  const canConvert =
    lead.status === "quote_sent" ||
    lead.status === "follow_up" ||
    lead.status === "booked";

  const contact = lead.contact;
  const subtitle = contact.company
    ? `${contact.company} · ${lead.event_type ?? "Catering inquiry"}`
    : lead.event_type ?? "Catering inquiry";

  return (
    <>
      <PageHeader
        title={contact.full_name}
        description={subtitle}
        action={
          <div className="flex flex-wrap items-center gap-2">
            <Button asChild variant="outline" size="sm">
              <Link href={`/catering/contacts/${contact.id}`}>View contact</Link>
            </Button>
            <Button asChild variant="outline" size="sm">
              <Link href={`/catering/leads/${lead.id}/edit`}>Edit</Link>
            </Button>
            {lead.status !== "lost" && !lead.converted_event_id ? (
              <ConvertToQuoteButton leadId={lead.id} />
            ) : null}
            {canConvert && !lead.converted_event_id ? (
              <ConvertToEventDialog lead={lead} locations={locations} />
            ) : null}
            {lead.converted_event_id ? (
              <Button asChild variant="accent" size="sm" className="gap-1.5">
                <Link href={`/catering/events/${lead.converted_event_id}`}>
                  View event
                  <ExternalLink className="h-4 w-4" />
                </Link>
              </Button>
            ) : null}
          </div>
        }
      />

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <Card>
            <CardHeader>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <CardTitle className="text-base">Lead</CardTitle>
                <LeadStatusBadge status={lead.status} />
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <LeadStageControls
                leadId={lead.id}
                status={lead.status}
                canDelete={canDelete}
              />

              <Separator />

              <dl className="grid gap-3 text-sm sm:grid-cols-2">
                {contact.phone ? (
                  <Fact icon={Phone} label="Phone">
                    <a
                      href={`tel:${contact.phone}`}
                      className="hover:underline"
                    >
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
                {lead.desired_date ? (
                  <Fact icon={Calendar} label="Desired date">
                    {formatEventDate(lead.desired_date)}
                  </Fact>
                ) : null}
                {lead.party_size != null ? (
                  <Fact icon={Users} label="Party size">
                    {lead.party_size}
                  </Fact>
                ) : null}
                {lead.estimated_value_cents != null ? (
                  <Fact label="Deal value">
                    {formatCents(lead.estimated_value_cents)}
                  </Fact>
                ) : null}
                {lead.budget_low_cents != null ||
                lead.budget_high_cents != null ? (
                  <Fact label="Budget range">
                    {lead.budget_low_cents != null
                      ? formatCents(lead.budget_low_cents)
                      : "—"}
                    {" – "}
                    {lead.budget_high_cents != null
                      ? formatCents(lead.budget_high_cents)
                      : "—"}
                  </Fact>
                ) : null}
                {lead.source_form ? (
                  <Fact label="Source">
                    <Link
                      href={`/catering/forms/${lead.source_form.id}`}
                      className="text-accent underline-offset-2 hover:underline"
                    >
                      {lead.source_form.source_label ?? lead.source_form.name}
                    </Link>
                    {lead.source_form.source_label &&
                    lead.source_form.source_label !==
                      lead.source_form.name ? (
                      <span className="text-muted-foreground">
                        {" · "}
                        {lead.source_form.name}
                      </span>
                    ) : null}
                  </Fact>
                ) : lead.source ? (
                  <Fact label="Source">{lead.source}</Fact>
                ) : null}
                {lead.location ? (
                  <Fact label="Location">{lead.location.name}</Fact>
                ) : null}
                {lead.owner ? (
                  <Fact label="Owner">
                    {lead.owner.full_name ?? lead.owner.email}
                  </Fact>
                ) : null}
              </dl>

              {lead.notes ? (
                <>
                  <Separator />
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Notes
                    </p>
                    <p className="mt-1 whitespace-pre-wrap text-sm">
                      {lead.notes}
                    </p>
                  </div>
                </>
              ) : null}

              {lead.lost_reason ? (
                <>
                  <Separator />
                  <div className="rounded-lg border border-dashed border-border bg-muted/30 p-3">
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Lost reason
                    </p>
                    <p className="mt-1 whitespace-pre-wrap text-sm">
                      {lead.lost_reason}
                    </p>
                  </div>
                </>
              ) : null}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Follow-ups</CardTitle>
              <CardDescription>
                Reminders so this lead doesn&apos;t fall through.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <FollowupList
                leadId={lead.id}
                followups={followups}
                currentUserId={profile.id}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Email thread</CardTitle>
              <CardDescription>
                Inbound and outbound mail with this contact, pulled from your
                connected Gmail.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ConversationThread
                leadId={lead.id}
                contactId={contact.id}
                contactEmail={contact.email}
                contactName={contact.full_name}
                subjectSeed={`Catering inquiry — ${lead.event_type ?? contact.full_name}`}
                emails={emails}
                gmailConnected={gmailAccount?.status === "active"}
                gmailEmail={gmailAccount?.email ?? null}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Internal notes</CardTitle>
              <CardDescription>
                Team-only comments. Not visible to the guest.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <CommentThread
                parentType="catering_lead"
                parentId={lead.id}
                locationId={lead.location_id}
              />
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
                objectType="catering_lead"
                objectId={lead.id}
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
