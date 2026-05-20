import Link from "next/link";
import { Mail, ExternalLink, ArrowDownLeft, ArrowUpRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { EmailMessage } from "@/lib/types/database";

interface LeadEmailThreadProps {
  contactEmail: string | null;
  contactName: string;
  leadName?: string;
  emails: EmailMessage[];
  gmailConnected: boolean;
}

export function LeadEmailThread({
  contactEmail,
  contactName,
  leadName,
  emails,
  gmailConnected,
}: LeadEmailThreadProps) {
  const subject = leadName ? `Catering inquiry — ${leadName}` : "Catering inquiry";
  const mailtoHref = contactEmail
    ? `mailto:${contactEmail}?subject=${encodeURIComponent(subject)}`
    : null;

  if (!gmailConnected) {
    return (
      <div className="space-y-3">
        <div className="rounded-lg border border-dashed border-border bg-muted/20 p-4 text-sm text-muted-foreground">
          Connect your Gmail to see and reply to the full email thread with{" "}
          <span className="font-semibold text-foreground">{contactName}</span>{" "}
          right here. Until then, you can open a draft in your mail client.
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="accent" size="sm" className="gap-1.5">
            <Link href="/catering/integrations">
              <Mail className="h-4 w-4" />
              Connect Gmail
            </Link>
          </Button>
          {mailtoHref ? (
            <Button asChild variant="outline" size="sm" className="gap-1.5">
              <a href={mailtoHref}>
                <ExternalLink className="h-4 w-4" />
                Email {contactName.split(" ")[0]}
              </a>
            </Button>
          ) : null}
        </div>
      </div>
    );
  }

  if (emails.length === 0) {
    return (
      <div className="space-y-3">
        <div className="rounded-lg border border-dashed border-border bg-muted/20 p-4 text-sm text-muted-foreground">
          No emails yet. Any mail to or from{" "}
          <span className="font-semibold text-foreground">
            {contactEmail ?? contactName}
          </span>{" "}
          in your connected inbox will show up here once the next sync runs
          (within a few minutes).
        </div>
        {mailtoHref ? (
          <Button asChild variant="outline" size="sm" className="gap-1.5">
            <a href={mailtoHref}>
              <ExternalLink className="h-4 w-4" />
              Email {contactName.split(" ")[0]}
            </a>
          </Button>
        ) : null}
      </div>
    );
  }

  // Render the thread newest-first.
  return (
    <div className="space-y-3">
      {emails.map((m) => (
        <EmailMessageCard key={m.id} message={m} />
      ))}
      {mailtoHref ? (
        <Button asChild variant="outline" size="sm" className="gap-1.5">
          <a href={mailtoHref}>
            <ExternalLink className="h-4 w-4" />
            Reply in mail client
          </a>
        </Button>
      ) : null}
    </div>
  );
}

function EmailMessageCard({ message }: { message: EmailMessage }) {
  const inbound = message.direction === "inbound";
  const Icon = inbound ? ArrowDownLeft : ArrowUpRight;
  const sender = message.from_name || message.from_email || "—";
  const recipients = message.to_emails.join(", ");
  const date = message.sent_at
    ? new Date(message.sent_at).toLocaleString()
    : new Date(message.created_at).toLocaleString();

  return (
    <div
      className={cn(
        "rounded-lg border bg-card p-3",
        inbound ? "border-border" : "border-accent/30 bg-accent/5",
      )}
    >
      <div className="flex items-start justify-between gap-2">
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
        <p className="text-[11px] text-muted-foreground whitespace-nowrap">{date}</p>
      </div>
      {message.snippet ? (
        <p className="mt-2 line-clamp-3 text-sm text-muted-foreground">
          {message.snippet}
        </p>
      ) : null}
    </div>
  );
}
