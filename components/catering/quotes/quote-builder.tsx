"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import {
  ArrowRight,
  Check,
  Pencil,
  Plus,
  Send,
  Trash2,
  X,
} from "lucide-react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { MenuPickerDialog } from "@/components/catering/quotes/menu-picker-dialog";
import {
  addItemsFromMenu,
  addQuoteLine,
  convertQuoteToInvoice,
  deleteQuoteLine,
  sendQuoteEmail,
  setQuoteStatus,
  updateQuote,
  updateQuoteLine,
} from "@/components/catering/quotes/actions";
import {
  basisPointsToPercent,
  formatCents,
  percentToBasisPoints,
} from "@/lib/constants/catering";
import { cn } from "@/lib/utils";
import type { FullMenu } from "@/lib/server/catering-menus";
import type { FullQuote } from "@/lib/server/catering-billing";

interface QuoteBuilderProps {
  quote: FullQuote;
  menus: FullMenu[];
}

export function QuoteBuilder({ quote, menus }: QuoteBuilderProps) {
  const isLocked =
    quote.status === "accepted" ||
    quote.status === "converted" ||
    quote.status === "declined";

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <div className="space-y-4 lg:col-span-2">
        <LinesPanel quote={quote} menus={menus} locked={isLocked} />
        <NotesPanel quote={quote} locked={isLocked} />
      </div>
      <div className="space-y-4">
        <TotalsPanel quote={quote} locked={isLocked} />
        <ActionsPanel quote={quote} />
      </div>
    </div>
  );
}

// =============================================================================
// Lines
// =============================================================================
function LinesPanel({
  quote,
  menus,
  locked,
}: {
  quote: FullQuote;
  menus: FullMenu[];
  locked: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function onMenuConfirm(
    items: Array<{ menuItemId: string; quantity: number }>,
  ) {
    return new Promise<{ ok?: boolean; error?: string }>((resolve) => {
      startTransition(async () => {
        const res = await addItemsFromMenu({ quoteId: quote.id, items });
        if ("error" in res && res.error) {
          resolve({ error: res.error });
          return;
        }
        router.refresh();
        resolve({ ok: true });
      });
    });
  }

  return (
    <section className="rounded-2xl border border-border bg-card">
      <header className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-4 py-3">
        <h3 className="font-display text-base font-bold">Line items</h3>
        {!locked ? (
          <div className="flex flex-wrap items-center gap-2">
            <MenuPickerDialog
              menus={menus}
              onConfirm={onMenuConfirm}
              trigger={
                <Button size="sm" variant="outline" className="gap-1.5">
                  <Plus className="h-4 w-4" />
                  Add from menu
                </Button>
              }
            />
          </div>
        ) : null}
      </header>

      <div className="divide-y divide-border">
        {quote.lines.length === 0 ? (
          <p className="px-4 py-6 text-sm text-muted-foreground">
            No line items yet. Add from the menu library or add a custom line below.
          </p>
        ) : (
          quote.lines.map((line) => (
            <LineRow key={line.id} line={line} locked={locked} />
          ))
        )}
      </div>

      {!locked ? <NewLineForm quoteId={quote.id} /> : null}
    </section>
  );
}

function LineRow({
  line,
  locked,
}: {
  line: FullQuote["lines"][number];
  locked: boolean;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [pending, startTransition] = useTransition();

  const [name, setName] = useState(line.name);
  const [description, setDescription] = useState(line.description ?? "");
  const [unit, setUnit] = useState(line.unit);
  const [quantity, setQuantity] = useState(String(line.quantity));
  const [unitPrice, setUnitPrice] = useState(
    (line.unit_price_cents / 100).toFixed(2),
  );

  function save() {
    startTransition(async () => {
      await updateQuoteLine({
        id: line.id,
        quoteId: line.quote_id,
        name: name.trim() || line.name,
        description: description || null,
        unit: unit || "each",
        quantity: Number.parseFloat(quantity) || 0,
        unitPrice: Number.parseFloat(unitPrice) || 0,
        menuItemId: line.menu_item_id ?? null,
      });
      setEditing(false);
      router.refresh();
    });
  }

  function remove() {
    if (!confirm(`Delete "${line.name}"?`)) return;
    startTransition(async () => {
      await deleteQuoteLine(line.id);
      router.refresh();
    });
  }

  if (editing) {
    return (
      <div className="space-y-3 bg-muted/20 px-4 py-3">
        <div className="grid gap-2 sm:grid-cols-2">
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Name"
            disabled={pending}
          />
          <Input
            value={unit}
            onChange={(e) => setUnit(e.target.value)}
            placeholder="unit"
            disabled={pending}
          />
        </div>
        <Textarea
          value={description}
          rows={2}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Description"
          disabled={pending}
        />
        <div className="grid gap-2 sm:grid-cols-2">
          <Input
            type="number"
            step="0.5"
            min="0"
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            placeholder="Qty"
            disabled={pending}
          />
          <Input
            type="number"
            step="0.01"
            min="0"
            value={unitPrice}
            onChange={(e) => setUnitPrice(e.target.value)}
            placeholder="$"
            disabled={pending}
          />
        </div>
        <div className="flex items-center justify-end gap-2">
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={() => setEditing(false)}
            disabled={pending}
          >
            Cancel
          </Button>
          <Button
            type="button"
            size="sm"
            variant="accent"
            onClick={save}
            disabled={pending}
          >
            Save
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-start justify-between gap-3 px-4 py-3">
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium">{line.name}</p>
        {line.description ? (
          <p className="text-xs text-muted-foreground">{line.description}</p>
        ) : null}
        <p className="mt-1 text-xs text-muted-foreground tabular-nums">
          {line.quantity} × {formatCents(line.unit_price_cents)} / {line.unit}
        </p>
      </div>
      <div className="flex items-center gap-2">
        <span className="tabular-nums font-medium">
          {formatCents(line.total_cents)}
        </span>
        {!locked ? (
          <>
            <button
              type="button"
              onClick={() => setEditing(true)}
              className="inline-flex h-7 w-7 items-center justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground"
              aria-label="Edit"
            >
              <Pencil className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={remove}
              disabled={pending}
              className="inline-flex h-7 w-7 items-center justify-center rounded-full text-muted-foreground hover:bg-rose-100 hover:text-rose-700"
              aria-label="Delete"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </>
        ) : null}
      </div>
    </div>
  );
}

function NewLineForm({ quoteId }: { quoteId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [unit, setUnit] = useState("each");
  const [quantity, setQuantity] = useState("1");
  const [price, setPrice] = useState("0.00");
  const [pending, startTransition] = useTransition();

  function submit() {
    if (!name.trim()) return;
    startTransition(async () => {
      await addQuoteLine({
        quoteId,
        name: name.trim(),
        unit: unit || "each",
        quantity: Number.parseFloat(quantity) || 0,
        unitPrice: Number.parseFloat(price) || 0,
      });
      setName("");
      setUnit("each");
      setQuantity("1");
      setPrice("0.00");
      setOpen(false);
      router.refresh();
    });
  }

  if (!open) {
    return (
      <div className="border-t border-border px-4 py-3">
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="gap-1.5"
          onClick={() => setOpen(true)}
        >
          <Plus className="h-4 w-4" />
          Add custom line
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-3 border-t border-border bg-muted/20 px-4 py-3">
      <div className="grid gap-2 sm:grid-cols-[1fr_auto_auto_auto]">
        <Input
          value={name}
          autoFocus
          onChange={(e) => setName(e.target.value)}
          placeholder="Item name"
          disabled={pending}
        />
        <Input
          type="number"
          step="0.5"
          min="0"
          value={quantity}
          onChange={(e) => setQuantity(e.target.value)}
          placeholder="Qty"
          className="w-20"
          disabled={pending}
        />
        <Input
          type="number"
          step="0.01"
          min="0"
          value={price}
          onChange={(e) => setPrice(e.target.value)}
          placeholder="$"
          className="w-24"
          disabled={pending}
        />
        <Input
          value={unit}
          onChange={(e) => setUnit(e.target.value)}
          placeholder="unit"
          className="w-28"
          disabled={pending}
        />
      </div>
      <div className="flex items-center justify-end gap-2">
        <Button
          type="button"
          size="sm"
          variant="ghost"
          onClick={() => setOpen(false)}
          disabled={pending}
        >
          Cancel
        </Button>
        <Button
          type="button"
          size="sm"
          variant="accent"
          onClick={submit}
          disabled={pending || !name.trim()}
        >
          Add
        </Button>
      </div>
    </div>
  );
}

// =============================================================================
// Totals
// =============================================================================
function TotalsPanel({
  quote,
  locked,
}: {
  quote: FullQuote;
  locked: boolean;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [pending, startTransition] = useTransition();
  const [discount, setDiscount] = useState(
    (quote.discount_cents / 100).toFixed(2),
  );
  const [taxPercent, setTaxPercent] = useState(
    basisPointsToPercent(quote.tax_rate_bps).toString(),
  );
  const [gratuityPercent, setGratuityPercent] = useState(
    basisPointsToPercent(quote.gratuity_rate_bps).toString(),
  );
  const [deposit, setDeposit] = useState(
    (quote.deposit_required_cents / 100).toFixed(2),
  );

  function save() {
    startTransition(async () => {
      await updateQuote({
        id: quote.id,
        contactId: quote.contact_id,
        leadId: quote.lead_id,
        eventId: quote.event_id,
        locationId: quote.location_id,
        title: quote.title,
        eventDate: quote.event_date,
        guestCount: quote.guest_count,
        serviceType: quote.service_type ?? undefined,
        customerNotes: quote.customer_notes,
        internalNotes: quote.internal_notes,
        validUntil: quote.valid_until,
        taxRateBps: percentToBasisPoints(Number.parseFloat(taxPercent) || 0),
        gratuityRateBps: percentToBasisPoints(
          Number.parseFloat(gratuityPercent) || 0,
        ),
        discount: Number.parseFloat(discount) || 0,
        depositRequired: Number.parseFloat(deposit) || 0,
      });
      setEditing(false);
      router.refresh();
    });
  }

  return (
    <section className="rounded-2xl border border-border bg-card p-4">
      <div className="flex items-center justify-between">
        <h3 className="font-display text-base font-bold">Totals</h3>
        {!locked ? (
          <button
            type="button"
            onClick={() => setEditing((x) => !x)}
            className="text-xs text-muted-foreground hover:text-foreground"
          >
            {editing ? "Cancel" : "Edit rates"}
          </button>
        ) : null}
      </div>

      <dl className="mt-3 space-y-1.5 text-sm">
        <Row label="Subtotal" value={formatCents(quote.subtotal_cents)} />
        {quote.discount_cents > 0 ? (
          <Row
            label="Discount"
            value={`− ${formatCents(quote.discount_cents)}`}
            muted
          />
        ) : null}
        <Row
          label={`Tax (${basisPointsToPercent(quote.tax_rate_bps).toFixed(3)}%)`}
          value={formatCents(quote.tax_cents)}
        />
        {quote.gratuity_cents > 0 ? (
          <Row
            label={`Gratuity (${basisPointsToPercent(quote.gratuity_rate_bps).toFixed(3)}%)`}
            value={formatCents(quote.gratuity_cents)}
          />
        ) : null}
        <Separator className="my-2" />
        <Row label="Total" value={formatCents(quote.total_cents)} strong />
        {quote.deposit_required_cents > 0 ? (
          <p className="mt-2 text-xs text-muted-foreground">
            Deposit due: {formatCents(quote.deposit_required_cents)}
          </p>
        ) : null}
      </dl>

      {editing ? (
        <div className="mt-4 space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label htmlFor="totals-discount" className="text-xs">
                Discount ($)
              </Label>
              <Input
                id="totals-discount"
                type="number"
                step="0.01"
                min="0"
                value={discount}
                onChange={(e) => setDiscount(e.target.value)}
                disabled={pending}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="totals-deposit" className="text-xs">
                Deposit ($)
              </Label>
              <Input
                id="totals-deposit"
                type="number"
                step="0.01"
                min="0"
                value={deposit}
                onChange={(e) => setDeposit(e.target.value)}
                disabled={pending}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="totals-tax" className="text-xs">
                Tax %
              </Label>
              <Input
                id="totals-tax"
                type="number"
                step="0.001"
                min="0"
                value={taxPercent}
                onChange={(e) => setTaxPercent(e.target.value)}
                disabled={pending}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="totals-grat" className="text-xs">
                Gratuity %
              </Label>
              <Input
                id="totals-grat"
                type="number"
                step="0.001"
                min="0"
                value={gratuityPercent}
                onChange={(e) => setGratuityPercent(e.target.value)}
                disabled={pending}
              />
            </div>
          </div>
          <Button
            size="sm"
            variant="accent"
            className="w-full"
            onClick={save}
            disabled={pending}
          >
            {pending ? "Saving…" : "Save rates"}
          </Button>
        </div>
      ) : null}
    </section>
  );
}

function Row({
  label,
  value,
  strong,
  muted,
}: {
  label: string;
  value: string;
  strong?: boolean;
  muted?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex items-center justify-between",
        strong && "font-display text-base font-bold",
        muted && "text-muted-foreground",
      )}
    >
      <dt>{label}</dt>
      <dd className="tabular-nums">{value}</dd>
    </div>
  );
}

// =============================================================================
// Notes
// =============================================================================
function NotesPanel({
  quote,
  locked,
}: {
  quote: FullQuote;
  locked: boolean;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [pending, startTransition] = useTransition();
  const [customer, setCustomer] = useState(quote.customer_notes ?? "");
  const [internal, setInternal] = useState(quote.internal_notes ?? "");

  function save() {
    startTransition(async () => {
      await updateQuote({
        id: quote.id,
        contactId: quote.contact_id,
        leadId: quote.lead_id,
        eventId: quote.event_id,
        locationId: quote.location_id,
        title: quote.title,
        eventDate: quote.event_date,
        guestCount: quote.guest_count,
        serviceType: quote.service_type ?? undefined,
        customerNotes: customer || null,
        internalNotes: internal || null,
        validUntil: quote.valid_until,
        taxRateBps: quote.tax_rate_bps,
        gratuityRateBps: quote.gratuity_rate_bps,
        discount: quote.discount_cents / 100,
        depositRequired: quote.deposit_required_cents / 100,
      });
      setEditing(false);
      router.refresh();
    });
  }

  return (
    <section className="rounded-2xl border border-border bg-card p-4">
      <div className="flex items-center justify-between">
        <h3 className="font-display text-base font-bold">Notes</h3>
        {!locked ? (
          <button
            type="button"
            onClick={() => setEditing((x) => !x)}
            className="text-xs text-muted-foreground hover:text-foreground"
          >
            {editing ? "Cancel" : "Edit"}
          </button>
        ) : null}
      </div>

      {editing ? (
        <div className="mt-3 space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="qf-cnotes" className="text-xs">
              Customer-facing notes (shown on the quote)
            </Label>
            <Textarea
              id="qf-cnotes"
              rows={3}
              value={customer}
              onChange={(e) => setCustomer(e.target.value)}
              disabled={pending}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="qf-inotes" className="text-xs">
              Internal notes (not shown to customer)
            </Label>
            <Textarea
              id="qf-inotes"
              rows={3}
              value={internal}
              onChange={(e) => setInternal(e.target.value)}
              disabled={pending}
            />
          </div>
          <Button
            size="sm"
            variant="accent"
            onClick={save}
            disabled={pending}
          >
            {pending ? "Saving…" : "Save notes"}
          </Button>
        </div>
      ) : (
        <div className="mt-3 space-y-3 text-sm">
          {quote.customer_notes ? (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Customer
              </p>
              <p className="mt-1 whitespace-pre-wrap">{quote.customer_notes}</p>
            </div>
          ) : null}
          {quote.internal_notes ? (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Internal
              </p>
              <p className="mt-1 whitespace-pre-wrap">{quote.internal_notes}</p>
            </div>
          ) : null}
          {!quote.customer_notes && !quote.internal_notes ? (
            <p className="text-sm text-muted-foreground">
              No notes yet.
            </p>
          ) : null}
        </div>
      )}
    </section>
  );
}

// =============================================================================
// Status actions
// =============================================================================
function ActionsPanel({ quote }: { quote: FullQuote }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [declineOpen, setDeclineOpen] = useState(false);
  const [declineReason, setDeclineReason] = useState("");
  const [error, setError] = useState<string | null>(null);

  function update(status: "draft" | "sent" | "accepted" | "expired") {
    startTransition(async () => {
      setError(null);
      const res = await setQuoteStatus({ id: quote.id, status });
      if ("error" in res && res.error) {
        setError(res.error);
        return;
      }
      router.refresh();
    });
  }

  function decline() {
    startTransition(async () => {
      setError(null);
      const res = await setQuoteStatus({
        id: quote.id,
        status: "declined",
        declineReason: declineReason || null,
      });
      if ("error" in res && res.error) {
        setError(res.error);
        return;
      }
      setDeclineOpen(false);
      router.refresh();
    });
  }

  function convert() {
    startTransition(async () => {
      setError(null);
      const res = await convertQuoteToInvoice({ quoteId: quote.id });
      if ("error" in res && res.error) {
        setError(res.error);
        return;
      }
      const invoiceId = (res as { invoice?: { id: string } }).invoice?.id;
      if (invoiceId) router.push(`/catering/invoices/${invoiceId}`);
      else router.refresh();
    });
  }

  const canSend =
    (quote.status === "draft" || quote.status === "sent") &&
    quote.lines.length > 0;
  const canAcceptOrDecline = quote.status === "sent";
  const canConvert =
    quote.status === "accepted" && !quote.converted_invoice_id;

  function sendByEmail() {
    setError(null);
    startTransition(async () => {
      const res = await sendQuoteEmail({ id: quote.id });
      if ("error" in res && res.error) {
        setError(res.error);
        return;
      }
      router.refresh();
    });
  }

  return (
    <section className="space-y-2 rounded-2xl border border-border bg-card p-4">
      <h3 className="font-display text-base font-bold">Status & actions</h3>

      {canSend ? (
        <Button
          variant="accent"
          className="w-full gap-1.5"
          onClick={sendByEmail}
          disabled={pending}
        >
          <Send className="h-4 w-4" />
          {quote.status === "sent" ? "Resend quote" : "Send quote by email"}
        </Button>
      ) : null}

      {quote.accept_token && quote.status !== "draft" ? (
        <a
          href={`/q/${encodeURIComponent(quote.accept_token)}`}
          target="_blank"
          rel="noreferrer"
          className="block w-full rounded-md border border-border bg-background px-3 py-2 text-center text-xs font-semibold text-muted-foreground hover:border-primary hover:text-foreground"
        >
          Open guest view ↗
        </a>
      ) : null}

      {canAcceptOrDecline ? (
        <>
          <Button
            variant="accent"
            className="w-full gap-1.5"
            onClick={() => update("accepted")}
            disabled={pending}
          >
            <Check className="h-4 w-4" />
            Mark accepted
          </Button>
          <Button
            variant="outline"
            className="w-full gap-1.5"
            onClick={() => setDeclineOpen(true)}
            disabled={pending}
          >
            <X className="h-4 w-4" />
            Mark declined
          </Button>
        </>
      ) : null}

      {canConvert ? (
        <Button
          variant="accent"
          className="w-full gap-1.5"
          onClick={convert}
          disabled={pending}
        >
          <ArrowRight className="h-4 w-4" />
          Convert to invoice
        </Button>
      ) : null}

      {quote.converted_invoice_id ? (
        <Button asChild variant="outline" className="w-full">
          <a href={`/catering/invoices/${quote.converted_invoice_id}`}>
            View invoice
          </a>
        </Button>
      ) : null}

      {error ? (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      <Dialog open={declineOpen} onOpenChange={setDeclineOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Mark quote as declined</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="decline-reason">Reason (optional)</Label>
            <Textarea
              id="decline-reason"
              rows={3}
              value={declineReason}
              onChange={(e) => setDeclineReason(e.target.value)}
              placeholder="Why didn't this land?"
              disabled={pending}
            />
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={() => setDeclineOpen(false)}
              disabled={pending}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="default"
              onClick={decline}
              disabled={pending}
            >
              {pending ? "Saving…" : "Mark declined"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}
