"use client";

import Link from "next/link";
import { useState } from "react";
import { Mail, ArrowDownLeft, ArrowUpRight, Reply } from "lucide-react";

import { Button } from "@/components/ui/button";
import { EmailComposer } from "@/components/catering/emails/email-composer";
import { cn } from "@/lib/utils";
import type { EmailMessage } from "@/lib/types/database";

interface ConversationThreadProps {
  // Where outbound messages should be attached. At least one of these.
  leadId?: string | null;
  contactId?: string | null;

  contactEmail: string | null;
  contactName: string;
  subjectSeed?: string;

  emails: EmailMessage[];
  gmailConnected: boolean;
  gmailEmail: string | null;
  emptyHint?: string;
}

export function ConversationThread({
  leadId,
  contactId,
  contactEmail,
  contactName,
  subjectSeed,
  emails,
  gmailConnected,
  gmailEmail,
  emptyHint,
}: ConversationThreadProps) {
  const [composeOpen, setComposeOpen] = useState(false);

  if (!gmailConnected) {
    return (
      <div className="space-y-3">
        <div className="rounded-lg border border-dashed border-border bg-muted/20 p-4 text-sm text-muted-foreground">
          Connect your Gmail to send and receive replies with{" "}
          <span className="font-semibold text-foreground">{contactName}</span>{" "}
          right here.
        </div>
        <Button asChild variant="accent" size="sm" className="gap-1.5">
          <Link href="/catering/integrations" prefetch={false}>
            <Mail className="h-4 w-4" />
            Connect Gmail
          </Link>
        </Button>
      </div>
    );
  }

  if (!contactEmail) {
    return (
      <div className="rounded-lg border border-dashed border-border bg-muted/20 p-4 text-sm text-muted-foreground">
        This contact doesn&apos;t have an email address on file. Add one to
        start a conversation.
      </div>
    );
  }

  const mostRecentInbound = emails.find((m) => m.direction === "inbound");
  const defaultSubject = mostRecentInbound?.subject
    ? mostRecentInbound.subject.startsWith("Re:")
      ? mostRecentInbound.subject
      : `Re: ${mostRecentInbound.subject}`
    : (subjectSeed ?? `Catering follow-up`);

  return (
    <div className="space-y-3">
      {emails.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border bg-muted/20 p-4 text-sm text-muted-foreground">
          {emptyHint ??
            `No emails with ${contactName} yet. Send the first one below, or wait for inbound mail — it syncs every few minutes.`}
        </div>
      ) : (
        emails.map((m) => <EmailMessageCard key={m.id} message={m} />)
      )}

      {composeOpen ? (
        <EmailComposer
          leadId={leadId ?? null}
          contactId={contactId ?? null}
          contactName={contactName}
          contactEmail={contactEmail}
          fromEmail={gmailEmail ?? "your gmail"}
          defaultSubject={defaultSubject}
          inReplyToMessageId={mostRecentInbound?.google_message_id ?? undefined}
          threadId={mostRecentInbound?.thread_id ?? undefined}
          onSent={() => setComposeOpen(false)}
        />
      ) : (
        <Button
          type="button"
          variant="accent"
          size="sm"
          onClick={() => setComposeOpen(true)}
          className="gap-1.5"
        >
          <Reply className="h-3.5 w-3.5" />
          {emails.length === 0 ? "Write email" : "Reply"}
        </Button>
      )}
    </div>
  );
}

function EmailMessageCard({ message }: { message: EmailMessage }) {
  const [expanded, setExpanded] = useState(false);
  const inbound = message.direction === "inbound";
  const Icon = inbound ? ArrowDownLeft : ArrowUpRight;
  const sender = message.from_name || message.from_email || "—";
  const recipients = message.to_emails.join(", ");
  const date = message.sent_at
    ? new Date(message.sent_at).toLocaleString()
    : new Date(message.created_at).toLocaleString();
  const fullBody = message.body_text ?? message.snippet ?? "";

  return (
    <div
      className={cn(
        "rounded-lg border bg-card p-3",
        inbound ? "border-border" : "border-accent/30 bg-accent/5",
      )}
    >
      <button
        type="button"
        className="flex w-full items-start justify-between gap-2 text-left"
        onClick={() => setExpanded((x) => !x)}
      >
        <div className="flex items-start gap-2 text-sm">
          <Icon
            className={cn(
              "mt-0.5 h-3.5 w-3.5 shrink-0",
              inbound ? "text-emerald-600" : "text-accent",
            )}
          />
          <div>
            <p className="font-semibold leading-tight">
              {sender}
              <span className="ml-2 text-xs font-normal text-muted-foreground">
                {inbound ? "→ you" : `→ ${recipients}`}
              </span>
            </p>
            {message.subject ? (
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {message.subject}
              </p>
            ) : null}
          </div>
        </div>
        <p className="text-[11px] text-muted-foreground whitespace-nowrap">
          {date}
        </p>
      </button>
      {expanded ? (
        <div className="mt-2 whitespace-pre-wrap rounded border border-border bg-background p-2 text-sm">
          {fullBody}
        </div>
      ) : message.snippet ? (
        <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">
          {message.snippet}
        </p>
      ) : null}
    </div>
  );
}
