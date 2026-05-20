import Link from "next/link";
import { Mail, CheckCircle2, AlertTriangle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { GmailAccount } from "@/lib/types/database";

interface GmailCardProps {
  account: GmailAccount | null;
  configured: boolean;
}

export function GmailCard({ account, configured }: GmailCardProps) {
  return (
    <div className="space-y-4 rounded-2xl border border-border bg-card p-5 shadow-sm">
      <div className="flex items-start gap-3">
        <div className="rounded-xl bg-rose-50 p-2.5 text-rose-600">
          <Mail className="h-5 w-5" />
        </div>
        <div className="flex-1">
          <h2 className="font-display text-lg font-bold">Gmail</h2>
          <p className="text-sm text-muted-foreground">
            Connect your Gmail so inbound mail from catering leads shows up on
            their lead card and you can reply without leaving Swell.
          </p>
        </div>
      </div>

      {!configured ? (
        <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <div>
            Gmail OAuth isn&apos;t configured yet. An admin needs to set
            <code className="mx-1 rounded bg-amber-100 px-1 py-0.5 text-xs">
              GOOGLE_OAUTH_CLIENT_ID
            </code>
            and
            <code className="mx-1 rounded bg-amber-100 px-1 py-0.5 text-xs">
              GOOGLE_OAUTH_CLIENT_SECRET
            </code>
            in the deploy environment before users can connect.
          </div>
        </div>
      ) : null}

      {account ? (
        <ConnectedView account={account} />
      ) : (
        <DisconnectedView configured={configured} />
      )}
    </div>
  );
}

function DisconnectedView({ configured }: { configured: boolean }) {
  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground">
        You&apos;ll be asked to grant Swell read access to your inbox, send
        access to reply from your own address, and modify access so we can
        apply labels like <code>Swell/Lead</code> for bookkeeping.
      </p>
      <Button
        asChild
        variant="accent"
        size="sm"
        className="gap-1.5"
        disabled={!configured}
      >
        <Link
          href={configured ? "/integrations/gmail/connect" : "#"}
          aria-disabled={!configured}
          className={cn(!configured && "pointer-events-none opacity-50")}
        >
          <Mail className="h-4 w-4" />
          Connect Gmail
        </Link>
      </Button>
    </div>
  );
}

function ConnectedView({ account }: { account: GmailAccount }) {
  const statusColor =
    account.status === "active"
      ? "text-emerald-700"
      : account.status === "expired" || account.status === "error"
        ? "text-amber-700"
        : "text-rose-700";
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between rounded-lg border border-border bg-background px-3 py-2">
        <div className="flex items-center gap-2">
          <CheckCircle2 className={cn("h-4 w-4", statusColor)} />
          <div>
            <p className="text-sm font-semibold">{account.email}</p>
            <p className="text-xs text-muted-foreground">
              Status: <span className={statusColor}>{account.status}</span>
              {account.last_synced_at
                ? ` · last sync ${new Date(account.last_synced_at).toLocaleString()}`
                : " · never synced"}
            </p>
          </div>
        </div>
        <Button asChild variant="outline" size="sm">
          <Link href="/integrations/gmail/disconnect">Disconnect</Link>
        </Button>
      </div>
      {account.last_error ? (
        <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-xs text-rose-900">
          Last error: {account.last_error}
        </div>
      ) : null}
    </div>
  );
}
