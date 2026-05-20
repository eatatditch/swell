import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";

import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { ConversationThread } from "@/components/catering/emails/conversation-thread";
import { markThreadRead } from "@/components/catering/emails/inbox-actions";
import { requireUser } from "@/lib/auth/get-user";
import { getCurrentUserGmailAccount } from "@/lib/server/gmail";
import { listMessagesInThread } from "@/lib/server/inbox";
import { createSupabaseServerClient } from "@/lib/supabase/server";

interface PageProps {
  params: { threadId: string };
}

export default async function MailThreadPage({ params }: PageProps) {
  await requireUser();
  const threadId = decodeURIComponent(params.threadId);
  const [gmail, messages] = await Promise.all([
    getCurrentUserGmailAccount(),
    listMessagesInThread(threadId),
  ]);
  if (messages.length === 0) notFound();

  // Look up the contact from any message in the thread.
  const supabase = createSupabaseServerClient();
  const contactId = messages.find((m) => m.contact_id)?.contact_id ?? null;
  const leadId = messages.find((m) => m.lead_id)?.lead_id ?? null;
  type ThreadContact = {
    id: string;
    full_name: string;
    email: string | null;
    company: string | null;
  };
  let contact: ThreadContact | null = null;
  if (contactId) {
    const { data } = await supabase
      .from("catering_contacts")
      .select("id, full_name, email, company")
      .eq("id", contactId)
      .maybeSingle();
    contact = (data as ThreadContact | null) ?? null;
  }

  // Burn unread state for this thread now that we're viewing it.
  await markThreadRead(threadId);

  const subject = messages.find((m) => m.subject)?.subject ?? "(no subject)";

  return (
    <>
      <PageHeader
        title={subject}
        description={
          <span>
            <Link
              href="/catering/mail"
              className="text-accent underline-offset-2 hover:underline"
            >
              ← Inbox
            </Link>
            {contact ? (
              <>
                {" · "}
                <Link
                  href={`/catering/contacts/${contact.id}`}
                  className="text-accent underline-offset-2 hover:underline"
                >
                  {contact.full_name}
                </Link>
                {contact.company ? ` · ${contact.company}` : ""}
              </>
            ) : null}
          </span>
        }
        action={
          leadId ? (
            <Button asChild variant="outline" size="sm">
              <Link href={`/catering/leads/${leadId}`}>Open lead</Link>
            </Button>
          ) : null
        }
      />
      <div className="max-w-3xl">
        <ConversationThread
          leadId={leadId}
          contactId={contactId}
          contactEmail={contact?.email ?? null}
          contactName={contact?.full_name ?? "(unknown)"}
          subjectSeed={subject}
          emails={[...messages].reverse()}
          gmailConnected={gmail?.status === "active"}
          gmailEmail={gmail?.email ?? null}
        />
      </div>
    </>
  );
}
