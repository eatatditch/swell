"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  disconnectStripe,
  refreshStripeStatus,
  startStripeConnect,
  upsertSettings,
} from "@/components/catering/settings/actions";
import {
  basisPointsToPercent,
  percentToBasisPoints,
} from "@/lib/constants/catering";
import { cn } from "@/lib/utils";
import type { SettingsWithLocation } from "@/lib/server/catering-settings";
import type { Location } from "@/lib/types/database";

interface SettingsCardProps {
  location: Pick<Location, "id" | "name" | "slug">;
  settings: SettingsWithLocation | null;
  stripeConfigured: boolean;
}

export function SettingsCard({
  location,
  settings,
  stripeConfigured,
}: SettingsCardProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [taxPercent, setTaxPercent] = useState(
    basisPointsToPercent(settings?.default_tax_rate_bps ?? 0).toString(),
  );
  const [gratuityPercent, setGratuityPercent] = useState(
    basisPointsToPercent(settings?.default_gratuity_rate_bps ?? 0).toString(),
  );
  const [depositPercent, setDepositPercent] = useState(
    basisPointsToPercent(settings?.default_deposit_percent_bps ?? 0).toString(),
  );
  const [quoteTerms, setQuoteTerms] = useState(settings?.quote_terms ?? "");
  const [invoiceTerms, setInvoiceTerms] = useState(settings?.invoice_terms ?? "");
  const [replyToEmail, setReplyToEmail] = useState(
    settings?.reply_to_email ?? "",
  );
  const [senderName, setSenderName] = useState(settings?.sender_name ?? "");

  function save() {
    setError(null);
    startTransition(async () => {
      const res = await upsertSettings({
        locationId: location.id,
        defaultTaxRateBps: percentToBasisPoints(
          Number.parseFloat(taxPercent) || 0,
        ),
        defaultGratuityRateBps: percentToBasisPoints(
          Number.parseFloat(gratuityPercent) || 0,
        ),
        defaultDepositPercentBps: percentToBasisPoints(
          Number.parseFloat(depositPercent) || 0,
        ),
        quoteTerms: quoteTerms || null,
        invoiceTerms: invoiceTerms || null,
        replyToEmail: replyToEmail || null,
        senderName: senderName || null,
      });
      if ("error" in res && res.error) {
        setError(res.error);
        return;
      }
      router.refresh();
    });
  }

  function connectStripe() {
    setError(null);
    startTransition(async () => {
      const res = await startStripeConnect(location.id);
      if ("error" in res && res.error) {
        setError(res.error);
        return;
      }
      if (res.url) window.location.href = res.url;
    });
  }

  function disconnect() {
    if (!confirm(`Disconnect ${location.name} from Stripe?`)) return;
    setError(null);
    startTransition(async () => {
      const res = await disconnectStripe(location.id);
      if ("error" in res && res.error) {
        setError(res.error);
        return;
      }
      router.refresh();
    });
  }

  function refreshStripe() {
    setError(null);
    startTransition(async () => {
      const res = await refreshStripeStatus(location.id);
      if ("error" in res && res.error) {
        setError(res.error);
        return;
      }
      router.refresh();
    });
  }

  const stripeStatus = settings?.stripe_account_status ?? "not_connected";
  const isConnected =
    !!settings?.stripe_account_id && stripeStatus !== "disconnected";

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <CardTitle className="text-base">{location.name}</CardTitle>
            <CardDescription>
              Per-location defaults applied to new quotes and invoices, and the
              Stripe account used to charge customers.
            </CardDescription>
          </div>
          <StripeStatusPill status={stripeStatus} />
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <section className="grid gap-3 sm:grid-cols-3">
          <div className="space-y-1.5">
            <Label htmlFor={`tax-${location.id}`}>Default tax %</Label>
            <Input
              id={`tax-${location.id}`}
              type="number"
              step="0.001"
              min="0"
              value={taxPercent}
              onChange={(e) => setTaxPercent(e.target.value)}
              disabled={pending}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor={`grat-${location.id}`}>Default gratuity %</Label>
            <Input
              id={`grat-${location.id}`}
              type="number"
              step="0.001"
              min="0"
              value={gratuityPercent}
              onChange={(e) => setGratuityPercent(e.target.value)}
              disabled={pending}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor={`dep-${location.id}`}>Default deposit %</Label>
            <Input
              id={`dep-${location.id}`}
              type="number"
              step="0.001"
              min="0"
              value={depositPercent}
              onChange={(e) => setDepositPercent(e.target.value)}
              disabled={pending}
            />
          </div>
        </section>

        <section className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor={`sender-${location.id}`}>Sender name</Label>
            <Input
              id={`sender-${location.id}`}
              value={senderName}
              onChange={(e) => setSenderName(e.target.value)}
              placeholder="Ditch Catering"
              disabled={pending}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor={`reply-${location.id}`}>Reply-to email</Label>
            <Input
              id={`reply-${location.id}`}
              type="email"
              value={replyToEmail}
              onChange={(e) => setReplyToEmail(e.target.value)}
              placeholder="catering@eatatditch.com"
              disabled={pending}
            />
          </div>
        </section>

        <div className="space-y-1.5">
          <Label htmlFor={`qt-${location.id}`}>Default quote terms</Label>
          <Textarea
            id={`qt-${location.id}`}
            rows={3}
            value={quoteTerms}
            onChange={(e) => setQuoteTerms(e.target.value)}
            placeholder="$500 non-refundable deposit holds the date. 3% cash discount available."
            disabled={pending}
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor={`it-${location.id}`}>Default invoice terms</Label>
          <Textarea
            id={`it-${location.id}`}
            rows={3}
            value={invoiceTerms}
            onChange={(e) => setInvoiceTerms(e.target.value)}
            placeholder="Balance due 7 days before the event. Cash, check, or card accepted."
            disabled={pending}
          />
        </div>

        <div className="flex justify-end">
          <Button
            type="button"
            variant="accent"
            onClick={save}
            disabled={pending}
          >
            {pending ? "Saving…" : "Save defaults"}
          </Button>
        </div>

        <div className="space-y-3 rounded-2xl border border-border bg-muted/30 p-4">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="font-display text-sm font-bold">Stripe Connect</p>
              <p className="text-xs text-muted-foreground">
                Each location uses its own Stripe account for charges and
                payouts.
              </p>
            </div>
            <StripeStatusPill status={stripeStatus} />
          </div>

          {settings?.stripe_account_id ? (
            <div className="space-y-1 text-xs text-muted-foreground">
              <p>
                Account ID:{" "}
                <span className="font-mono text-foreground">
                  {settings.stripe_account_id}
                </span>
              </p>
              <p>
                Charges enabled:{" "}
                <span
                  className={cn(
                    "font-medium",
                    settings.stripe_charges_enabled
                      ? "text-emerald-700"
                      : "text-rose-700",
                  )}
                >
                  {settings.stripe_charges_enabled ? "yes" : "no"}
                </span>
                {" · "}
                Payouts enabled:{" "}
                <span
                  className={cn(
                    "font-medium",
                    settings.stripe_payouts_enabled
                      ? "text-emerald-700"
                      : "text-rose-700",
                  )}
                >
                  {settings.stripe_payouts_enabled ? "yes" : "no"}
                </span>
              </p>
              {settings.stripe_connected_at ? (
                <p>
                  Connected{" "}
                  {new Date(settings.stripe_connected_at).toLocaleString()}
                </p>
              ) : null}
            </div>
          ) : null}

          <div className="flex flex-wrap items-center gap-2">
            {!isConnected ? (
              <Button
                type="button"
                variant="accent"
                size="sm"
                onClick={connectStripe}
                disabled={pending || !stripeConfigured}
              >
                {pending ? "Redirecting…" : "Connect with Stripe"}
              </Button>
            ) : (
              <>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={refreshStripe}
                  disabled={pending}
                >
                  Refresh status
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={disconnect}
                  disabled={pending}
                  className="text-rose-700 hover:text-rose-800"
                >
                  Disconnect
                </Button>
              </>
            )}
          </div>

          {!stripeConfigured ? (
            <p className="text-xs text-amber-700">
              Stripe env vars not detected. Set{" "}
              <code>STRIPE_SECRET_KEY</code>,{" "}
              <code>STRIPE_CONNECT_CLIENT_ID</code>,{" "}
              <code>STRIPE_WEBHOOK_SECRET</code> to enable Stripe.
            </p>
          ) : null}
        </div>

        {error ? (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : null}
      </CardContent>
    </Card>
  );
}

function StripeStatusPill({
  status,
}: {
  status: SettingsWithLocation["stripe_account_status"];
}) {
  const label =
    {
      not_connected: "Not connected",
      onboarding: "Onboarding",
      active: "Active",
      restricted: "Restricted",
      disconnected: "Disconnected",
    }[status] ?? status;
  const cls =
    status === "active"
      ? "bg-emerald-100 text-emerald-900"
      : status === "onboarding"
        ? "bg-sky-100 text-sky-900"
        : status === "restricted"
          ? "bg-amber-100 text-amber-900"
          : "bg-muted text-muted-foreground";
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold",
        cls,
      )}
    >
      {label}
    </span>
  );
}
