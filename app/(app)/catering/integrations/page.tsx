import { PageHeader } from "@/components/layout/page-header";
import { GmailCard } from "@/components/catering/integrations/gmail-card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { requireUser } from "@/lib/auth/get-user";
import { getCurrentUserGmailAccount } from "@/lib/server/gmail";
import { gmailOAuthConfigured } from "@/lib/google/oauth";

const ERROR_MESSAGES: Record<string, string> = {
  config_missing:
    "Gmail OAuth isn't configured. An admin needs to set GOOGLE_OAUTH_CLIENT_ID and GOOGLE_OAUTH_CLIENT_SECRET.",
  encryption_missing:
    "GMAIL_TOKEN_ENCRYPTION_KEY isn't set. The integration can't securely store credentials yet.",
  state_error: "Couldn't start the OAuth flow. Try again.",
  missing_params: "Google didn't send back the expected parameters. Try again.",
  invalid_state:
    "The OAuth state was invalid or expired. Try connecting again.",
  token_exchange_failed: "Google rejected the auth code. Try again.",
  no_refresh_token:
    "Google didn't return a refresh token. Disconnect at myaccount.google.com → Security → Third-party apps, then try again.",
  userinfo_failed: "Couldn't read your Google account info. Try again.",
  access_denied: "You declined the consent screen.",
};

interface PageProps {
  searchParams: {
    error?: string;
    connected?: string;
    disconnected?: string;
  };
}

export default async function CateringIntegrationsPage({
  searchParams,
}: PageProps) {
  await requireUser();
  const account = await getCurrentUserGmailAccount();
  const configured = gmailOAuthConfigured();
  const errorMsg = searchParams.error
    ? ERROR_MESSAGES[searchParams.error] ?? `Error: ${searchParams.error}`
    : null;

  return (
    <>
      <PageHeader
        title="Integrations"
        description="Connect external tools to Swell. Gmail is per-user — each manager links their own inbox."
      />

      {searchParams.connected === "1" ? (
        <Alert className="mb-4 border-emerald-200 bg-emerald-50 text-emerald-900">
          <AlertDescription>
            Gmail connected. Inbound mail from your catering contacts will
            start syncing within a few minutes.
          </AlertDescription>
        </Alert>
      ) : null}
      {searchParams.disconnected === "1" ? (
        <Alert className="mb-4">
          <AlertDescription>Gmail disconnected.</AlertDescription>
        </Alert>
      ) : null}
      {errorMsg ? (
        <Alert variant="destructive" className="mb-4">
          <AlertDescription>{errorMsg}</AlertDescription>
        </Alert>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-2">
        <GmailCard account={account} configured={configured} />
      </div>
    </>
  );
}
