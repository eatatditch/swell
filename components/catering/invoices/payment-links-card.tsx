"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Copy, ExternalLink, Zap } from "lucide-react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createInvoicePaymentLink } from "@/components/catering/invoices/payment-link-actions";
import { formatCents } from "@/lib/constants/catering";
import { cn } from "@/lib/utils";
import type {
  CateringPaymentLink,
  PaymentLinkStatus,
} from "@/lib/types/database";

interface PaymentLinksCardProps {
  invoiceId: string;
  invoiceBalanceCents: number;
  invoiceLocationId: string | null;
  links: CateringPaymentLink[];
  stripeConnected: boolean;
  chargesEnabled: boolean;
}

export function PaymentLinksCard({
  invoiceId,
  invoiceBalanceCents,
  invoiceLocationId,
  links,
  stripeConnected,
  chargesEnabled,
}: PaymentLinksCardProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [amount, setAmount] = useState(
    (invoiceBalanceCents / 100).toFixed(2),
  );

  const canGenerate =
    invoiceLocationId &&
    stripeConnected &&
    chargesEnabled &&
    invoiceBalanceCents > 0;

  function generate() {
    setError(null);
    startTransition(async () => {
      const res = await createInvoicePaymentLink({
        invoiceId,
        amount: Number.parseFloat(amount) || undefined,
      });
      if ("error" in res && res.error) {
        setError(res.error);
        return;
      }
      router.refresh();
    });
  }

  return (
    <section className="rounded-2xl border border-border bg-card">
      <header className="flex items-center justify-between gap-2 border-b border-border px-4 py-3">
        <h3 className="font-display text-base font-bold">Stripe payment links</h3>
      </header>

      <div className="space-y-3 px-4 py-3">
        {!invoiceLocationId ? (
          <p className="text-xs text-muted-foreground">
            Set a location on this invoice to enable payment links.
          </p>
        ) : !stripeConnected ? (
          <p className="text-xs text-muted-foreground">
            This location isn&apos;t connected to Stripe. Visit{" "}
            <a
              href="/catering/settings"
              className="text-accent underline-offset-2 hover:underline"
            >
              Settings
            </a>{" "}
            to connect.
          </p>
        ) : !chargesEnabled ? (
          <p className="text-xs text-amber-700">
            Stripe account exists but charges aren&apos;t enabled yet. Finish
            onboarding from the Stripe dashboard, then refresh status in
            Settings.
          </p>
        ) : null}

        {canGenerate ? (
          <div className="flex flex-wrap items-end gap-2">
            <div className="space-y-1">
              <Label htmlFor="pl-amount" className="text-xs">
                Amount ($)
              </Label>
              <Input
                id="pl-amount"
                type="number"
                min="0.50"
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-32"
                disabled={pending}
              />
            </div>
            <Button
              type="button"
              variant="accent"
              onClick={generate}
              disabled={pending}
              className="gap-1.5"
            >
              <Zap className="h-4 w-4" />
              {pending ? "Generating…" : "Generate link"}
            </Button>
          </div>
        ) : null}

        {error ? (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : null}

        {links.length === 0 ? (
          <p className="text-xs text-muted-foreground">
            No payment links yet.
          </p>
        ) : (
          <ul className="divide-y divide-border">
            {links.map((link) => (
              <LinkRow key={link.id} link={link} />
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}

function LinkRow({ link }: { link: CateringPaymentLink }) {
  const [copied, setCopied] = useState(false);

  function copy() {
    if (typeof window === "undefined") return;
    void navigator.clipboard.writeText(link.url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }

  return (
    <li className="flex flex-wrap items-center justify-between gap-2 py-2.5">
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium">
          {formatCents(link.amount_cents)}{" "}
          <StatusPill status={link.status} />
        </p>
        <p className="truncate text-xs text-muted-foreground">
          {new Date(link.created_at).toLocaleString()}
          {link.expires_at
            ? ` · expires ${new Date(link.expires_at).toLocaleString()}`
            : ""}
        </p>
      </div>
      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={copy}
          className="inline-flex h-7 w-7 items-center justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground"
          aria-label="Copy URL"
          title={copied ? "Copied!" : "Copy URL"}
        >
          <Copy className="h-3.5 w-3.5" />
        </button>
        <a
          href={link.url}
          target="_blank"
          rel="noreferrer"
          className="inline-flex h-7 w-7 items-center justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground"
          aria-label="Open URL"
        >
          <ExternalLink className="h-3.5 w-3.5" />
        </a>
      </div>
    </li>
  );
}

function StatusPill({ status }: { status: PaymentLinkStatus }) {
  const label =
    {
      pending: "Pending",
      completed: "Paid",
      expired: "Expired",
      canceled: "Canceled",
      failed: "Failed",
    }[status] ?? status;
  const cls =
    status === "completed"
      ? "bg-emerald-100 text-emerald-900"
      : status === "pending"
        ? "bg-sky-100 text-sky-900"
        : status === "expired" || status === "failed"
          ? "bg-rose-100 text-rose-900"
          : "bg-muted text-muted-foreground";
  return (
    <span
      className={cn(
        "ml-1 inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
        cls,
      )}
    >
      {label}
    </span>
  );
}
