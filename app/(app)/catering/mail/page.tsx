import Link from "next/link";
import { Mail } from "lucide-react";

import { PageHeader } from "@/components/layout/page-header";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { InboxList } from "@/components/catering/emails/inbox-list";
import { requireUser } from "@/lib/auth/get-user";
import { getCurrentUserGmailAccount } from "@/lib/server/gmail";
import { listInboxThreads } from "@/lib/server/inbox";
import { MarkAllReadButton } from "@/components/catering/emails/mark-all-read-button";

interface PageProps {
  searchParams: { unread?: string };
}

export default async function CateringMailPage({ searchParams }: PageProps) {
  await requireUser();
  const gmail = await getCurrentUserGmailAccount();
  const unreadOnly = searchParams.unread === "1";

  if (!gmail) {
    return (
      <>
        <PageHeader
          title="Mail"
          description="One place to read and respond to every catering thread."
        />
        <Alert className="max-w-xl">
          <AlertDescription>
            Connect your Gmail to use the inbox. Inbound mail from any catering
            contact will land here within ~5 minutes.
          </AlertDescription>
        </Alert>
        <Button
          asChild
          variant="accent"
          size="sm"
          className="mt-3 gap-1.5"
        >
          <Link href="/catering/integrations" prefetch={false}>
            <Mail className="h-4 w-4" />
            Connect Gmail
          </Link>
        </Button>
      </>
    );
  }

  const threads = await listInboxThreads({ unreadOnly });
  const unreadTotal = threads.reduce((s, t) => s + t.unread_count, 0);

  return (
    <>
      <PageHeader
        title="Mail"
        description={`Inbox for ${gmail.email}. ${threads.length} thread${threads.length === 1 ? "" : "s"}${unreadTotal > 0 ? ` · ${unreadTotal} unread` : ""}.`}
        action={
          <div className="flex flex-wrap items-center gap-2">
            <Button asChild variant="outline" size="sm">
              <Link
                href={unreadOnly ? "/catering/mail" : "/catering/mail?unread=1"}
              >
                {unreadOnly ? "All" : "Unread only"}
              </Link>
            </Button>
            {unreadTotal > 0 ? <MarkAllReadButton /> : null}
          </div>
        }
      />
      <InboxList threads={threads} />
    </>
  );
}
