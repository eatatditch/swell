import { PageHeader } from "@/components/layout/page-header";
import { GmailCard } from "@/components/catering/integrations/gmail-card";
import { requireUser } from "@/lib/auth/get-user";
import { getCurrentUserGmailAccount } from "@/lib/server/gmail";
import { gmailOAuthConfigured } from "@/lib/google/oauth";

export default async function CateringIntegrationsPage() {
  await requireUser();
  const account = await getCurrentUserGmailAccount();
  const configured = gmailOAuthConfigured();

  return (
    <>
      <PageHeader
        title="Integrations"
        description="Connect external tools to Swell. Gmail is per-user — each manager links their own inbox."
      />
      <div className="grid gap-4 lg:grid-cols-2">
        <GmailCard account={account} configured={configured} />
      </div>
    </>
  );
}
