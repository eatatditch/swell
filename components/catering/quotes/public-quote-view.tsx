"use client";

import { useState, useTransition } from "react";
import { Check, X, AlertCircle } from "lucide-react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import type {
  CateringQuote,
  CateringQuoteLineItem,
} from "@/lib/types/database";

interface PublicQuoteViewProps {
  quote: Pick<
    CateringQuote,
    | "id"
    | "quote_number"
    | "title"
    | "guest_count"
    | "customer_notes"
    | "subtotal_cents"
    | "discount_cents"
    | "tax_cents"
    | "gratuity_cents"
    | "total_cents"
    | "deposit_required_cents"
    | "valid_until"
    | "accepted_at"
    | "declined_at"
    | "deposit_paid_at"
    | "decline_reason"
  > & {
    contact: { full_name: string; company: string | null } | null;
    location: { name: string } | null;
    lines: CateringQuoteLineItem[];
  };
  token: string;
  canceled: boolean;
  formattedTotals: {
    subtotal: string;
    discount: string | null;
    tax: string | null;
    gratuity: string | null;
    total: string;
    deposit: string;
  };
  formattedDate: string | null;
}

export function PublicQuoteView({
  quote,
  token,
  canceled,
  formattedTotals,
  formattedDate,
}: PublicQuoteViewProps) {
  const [declining, setDeclining] = useState(false);
  const [declineReason, setDeclineReason] = useState("");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const isAccepted = !!quote.accepted_at;
  const isDeclined = !!quote.declined_at;
  const isPaid = !!quote.deposit_paid_at;

  function accept() {
    setError(null);
    startTransition(async () => {
      const res = await fetch(`/api/quotes/${encodeURIComponent(token)}/accept`, {
        method: "POST",
      });
      const data = (await res.json()) as { url?: string; error?: string };
      if (!res.ok || !data.url) {
        setError(data.error ?? "Could not start checkout. Try again.");
        return;
      }
      window.location.href = data.url;
    });
  }

  function decline() {
    setError(null);
    startTransition(async () => {
      const res = await fetch(`/api/quotes/${encodeURIComponent(token)}/decline`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: declineReason }),
      });
      const data = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok || !data.ok) {
        setError(data.error ?? "Could not record decline. Try again.");
        return;
      }
      window.location.reload();
    });
  }

  return (
    <article className="space-y-6">
      <header className="text-center">
        <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
          Quote {quote.quote_number}
          {quote.location?.name ? ` · ${quote.location.name}` : ""}
        </p>
        <h1 className="mt-2 font-display text-3xl font-black tracking-tight">
          {quote.title}
        </h1>
        {quote.contact ? (
          <p className="mt-1 text-sm text-muted-foreground">
            Prepared for{" "}
            <span className="font-semibold text-foreground">
              {quote.contact.full_name}
            </span>
            {quote.contact.company ? ` · ${quote.contact.company}` : ""}
          </p>
        ) : null}
      </header>

      {isPaid ? (
        <Alert className="border-emerald-200 bg-emerald-50 text-emerald-900">
          <AlertDescription>
            ✓ Deposit received. Your event is on the books — we&apos;ll be in
            touch shortly with next steps.
          </AlertDescription>
        </Alert>
      ) : isAccepted ? (
        <Alert className="border-amber-200 bg-amber-50 text-amber-900">
          <AlertDescription>
            Quote accepted. Awaiting deposit to confirm.
          </AlertDescription>
        </Alert>
      ) : isDeclined ? (
        <Alert className="border-rose-200 bg-rose-50 text-rose-900">
          <AlertDescription>
            You declined this quote on{" "}
            {new Date(quote.declined_at!).toLocaleDateString()}. Reach out if
            you&apos;d like us to put together another option.
          </AlertDescription>
        </Alert>
      ) : null}

      {canceled ? (
        <Alert className="border-amber-200 bg-amber-50 text-amber-900">
          <AlertDescription className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4" />
            Deposit checkout canceled — no payment was processed. You can try
            again below.
          </AlertDescription>
        </Alert>
      ) : null}

      <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
        <div className="grid gap-4 text-sm sm:grid-cols-2">
          {formattedDate ? (
            <Fact label="Event date">{formattedDate}</Fact>
          ) : null}
          {quote.guest_count ? (
            <Fact label="Guests">{quote.guest_count}</Fact>
          ) : null}
          {quote.valid_until ? (
            <Fact label="Valid until">
              {new Date(quote.valid_until).toLocaleDateString()}
            </Fact>
          ) : null}
        </div>

        {quote.lines.length > 0 ? (
          <div className="mt-4 space-y-1">
            <h2 className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
              Line items
            </h2>
            <ul className="divide-y divide-border">
              {quote.lines.map((line) => (
                <li
                  key={line.id}
                  className="flex items-start justify-between gap-3 py-2 text-sm"
                >
                  <div>
                    <p className="font-semibold">{line.name}</p>
                    {line.description ? (
                      <p className="text-xs text-muted-foreground">
                        {line.description}
                      </p>
                    ) : null}
                    <p className="text-xs text-muted-foreground">
                      {Number(line.quantity)} × {line.unit ?? "ea"} @{" "}
                      {(line.unit_price_cents / 100).toLocaleString("en-US", {
                        style: "currency",
                        currency: "USD",
                      })}
                    </p>
                  </div>
                  <p className="whitespace-nowrap text-sm font-semibold">
                    {(line.total_cents / 100).toLocaleString("en-US", {
                      style: "currency",
                      currency: "USD",
                    })}
                  </p>
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        <div className="mt-4 space-y-1 border-t border-border pt-3 text-sm">
          <Row label="Subtotal">{formattedTotals.subtotal}</Row>
          {formattedTotals.discount ? (
            <Row label="Discount">−{formattedTotals.discount}</Row>
          ) : null}
          {formattedTotals.tax ? (
            <Row label="Tax">{formattedTotals.tax}</Row>
          ) : null}
          {formattedTotals.gratuity ? (
            <Row label="Gratuity">{formattedTotals.gratuity}</Row>
          ) : null}
          <Row label="Total" bold>
            {formattedTotals.total}
          </Row>
          <Row label="Non-refundable deposit to confirm">
            {formattedTotals.deposit}
          </Row>
        </div>

        {quote.customer_notes ? (
          <div className="mt-4 border-t border-border pt-3">
            <h2 className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
              Notes
            </h2>
            <p className="mt-1 whitespace-pre-wrap text-sm">
              {quote.customer_notes}
            </p>
          </div>
        ) : null}
      </div>

      {error ? (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      {!isPaid && !isDeclined ? (
        declining ? (
          <div className="space-y-2 rounded-2xl border border-border bg-card p-4 shadow-sm">
            <p className="text-sm font-semibold">Let us know what to change</p>
            <Textarea
              rows={4}
              value={declineReason}
              onChange={(e) => setDeclineReason(e.target.value)}
              placeholder="More vegetarian options, smaller package, different date…"
              disabled={pending}
            />
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setDeclining(false)}
                disabled={pending}
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="accent"
                onClick={decline}
                disabled={pending || !declineReason.trim()}
              >
                {pending ? "Sending…" : "Send feedback"}
              </Button>
            </div>
          </div>
        ) : (
          <div className="grid gap-2 sm:grid-cols-2">
            <Button
              type="button"
              variant="accent"
              size="lg"
              onClick={accept}
              disabled={pending || isAccepted}
              className="gap-1.5"
            >
              <Check className="h-4 w-4" />
              {isAccepted
                ? "Awaiting deposit…"
                : pending
                  ? "Loading…"
                  : `Accept & pay ${formattedTotals.deposit} deposit`}
            </Button>
            <Button
              type="button"
              variant="outline"
              size="lg"
              onClick={() => setDeclining(true)}
              disabled={pending}
              className="gap-1.5"
            >
              <X className="h-4 w-4" />
              Request changes
            </Button>
          </div>
        )
      ) : null}

      <p className="pt-2 text-center text-[11px] text-muted-foreground">
        Deposit is non-refundable and applied toward your final balance.
        Questions? Just reply to the email this quote came from.
      </p>
    </article>
  );
}

function Fact({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <p className="mt-0.5 text-sm">{children}</p>
    </div>
  );
}

function Row({
  label,
  bold,
  children,
}: {
  label: string;
  bold?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        "flex items-baseline justify-between",
        bold && "border-t border-border pt-2 text-base font-bold",
      )}
    >
      <span className={cn(bold ? "" : "text-muted-foreground")}>{label}</span>
      <span>{children}</span>
    </div>
  );
}
