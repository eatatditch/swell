"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import {
  Ban,
  Pencil,
  Plus,
  Send,
  Trash2,
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
  addInvoiceItemsFromMenu,
  addInvoiceLine,
  deleteInvoiceLine,
  recordInvoicePayment,
  setInvoiceStatus,
  updateInvoice,
  updateInvoiceLine,
} from "@/components/catering/invoices/actions";
import {
  PAYMENT_KINDS,
  PAYMENT_KIND_LABELS,
  PAYMENT_METHODS,
  PAYMENT_METHOD_LABELS,
  basisPointsToPercent,
  formatCents,
  percentToBasisPoints,
} from "@/lib/constants/catering";
import { cn } from "@/lib/utils";
import type { FullMenu } from "@/lib/server/catering-menus";
import type { FullInvoice } from "@/lib/server/catering-billing";
import type { PaymentWithRecorder } from "@/lib/server/catering";

interface InvoiceBuilderProps {
  invoice: FullInvoice;
  menus: FullMenu[];
  payments: PaymentWithRecorder[];
}

export function InvoiceBuilder({
  invoice,
  menus,
  payments,
}: InvoiceBuilderProps) {
  const locked = invoice.status === "void" || invoice.status === "paid";

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <div className="space-y-4 lg:col-span-2">
        <LinesPanel invoice={invoice} menus={menus} locked={locked} />
        <PaymentsPanel invoice={invoice} payments={payments} locked={locked} />
      </div>
      <div className="space-y-4">
        <TotalsPanel invoice={invoice} locked={locked} />
        <ActionsPanel invoice={invoice} />
      </div>
    </div>
  );
}

function LinesPanel({
  invoice,
  menus,
  locked,
}: {
  invoice: FullInvoice;
  menus: FullMenu[];
  locked: boolean;
}) {
  const router = useRouter();
  const [, startTransition] = useTransition();

  function onMenuConfirm(
    items: Array<{ menuItemId: string; quantity: number }>,
  ) {
    return new Promise<{ ok?: boolean; error?: string }>((resolve) => {
      startTransition(async () => {
        const res = await addInvoiceItemsFromMenu({
          invoiceId: invoice.id,
          items,
        });
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
        ) : null}
      </header>

      <div className="divide-y divide-border">
        {invoice.lines.length === 0 ? (
          <p className="px-4 py-6 text-sm text-muted-foreground">
            No line items yet.
          </p>
        ) : (
          invoice.lines.map((line) => (
            <LineRow key={line.id} line={line} locked={locked} />
          ))
        )}
      </div>

      {!locked ? <NewLineForm invoiceId={invoice.id} /> : null}
    </section>
  );
}

function LineRow({
  line,
  locked,
}: {
  line: FullInvoice["lines"][number];
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
      await updateInvoiceLine({
        id: line.id,
        invoiceId: line.invoice_id,
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
      await deleteInvoiceLine(line.id);
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

function NewLineForm({ invoiceId }: { invoiceId: string }) {
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
      await addInvoiceLine({
        invoiceId,
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
          className="w-20"
          disabled={pending}
        />
        <Input
          type="number"
          step="0.01"
          min="0"
          value={price}
          onChange={(e) => setPrice(e.target.value)}
          className="w-24"
          disabled={pending}
        />
        <Input
          value={unit}
          onChange={(e) => setUnit(e.target.value)}
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
// Payments
// =============================================================================
function PaymentsPanel({
  invoice,
  payments,
  locked,
}: {
  invoice: FullInvoice;
  payments: PaymentWithRecorder[];
  locked: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [amount, setAmount] = useState(
    (invoice.balance_cents / 100).toFixed(2),
  );
  const [kind, setKind] = useState("balance");
  const [method, setMethod] = useState("card");
  const [reference, setReference] = useState("");
  const [notes, setNotes] = useState("");
  const [paidAt, setPaidAt] = useState(
    new Date().toISOString().slice(0, 16),
  );

  function record() {
    setError(null);
    startTransition(async () => {
      const res = await recordInvoicePayment({
        invoiceId: invoice.id,
        amount: Number.parseFloat(amount) || 0,
        kind: kind as "deposit" | "balance" | "refund" | "gratuity",
        method: method as "cash" | "check" | "card" | "ach" | "other",
        reference: reference || null,
        notes: notes || null,
        paidAt,
      });
      if ("error" in res && res.error) {
        setError(res.error);
        return;
      }
      setOpen(false);
      setReference("");
      setNotes("");
      router.refresh();
    });
  }

  return (
    <section className="rounded-2xl border border-border bg-card">
      <header className="flex items-center justify-between gap-2 border-b border-border px-4 py-3">
        <h3 className="font-display text-base font-bold">Payments</h3>
        {!locked && invoice.event_id ? (
          <Button
            size="sm"
            variant="accent"
            className="gap-1.5"
            onClick={() => setOpen(true)}
          >
            <Plus className="h-4 w-4" />
            Record payment
          </Button>
        ) : null}
      </header>

      <div className="divide-y divide-border">
        {payments.length === 0 ? (
          <p className="px-4 py-6 text-sm text-muted-foreground">
            {invoice.event_id
              ? "No payments recorded yet."
              : "Link this invoice to an event before recording payments."}
          </p>
        ) : (
          payments.map((p) => (
            <div
              key={p.id}
              className="flex items-center justify-between gap-3 px-4 py-3"
            >
              <div className="min-w-0">
                <p className="text-sm font-medium">
                  {PAYMENT_KIND_LABELS[p.kind]}
                  {p.method
                    ? ` · ${PAYMENT_METHOD_LABELS[p.method]}`
                    : ""}
                </p>
                <p className="text-xs text-muted-foreground">
                  {p.paid_at
                    ? new Date(p.paid_at).toLocaleString()
                    : "Pending"}
                  {p.reference ? ` · ${p.reference}` : ""}
                  {p.recorder?.full_name
                    ? ` · by ${p.recorder.full_name}`
                    : ""}
                </p>
              </div>
              <span
                className={cn(
                  "tabular-nums font-medium",
                  p.kind === "refund" && "text-rose-600",
                )}
              >
                {p.kind === "refund" ? "− " : ""}
                {formatCents(p.amount_cents)}
              </span>
            </div>
          ))
        )}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Record payment</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="rp-amount">Amount ($)</Label>
                <Input
                  id="rp-amount"
                  type="number"
                  step="0.01"
                  min="0"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  disabled={pending}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="rp-kind">Kind</Label>
                <select
                  id="rp-kind"
                  className="flex h-10 w-full rounded-lg border border-input bg-background px-3 text-sm"
                  value={kind}
                  onChange={(e) => setKind(e.target.value)}
                  disabled={pending}
                >
                  {PAYMENT_KINDS.map((k) => (
                    <option key={k} value={k}>
                      {PAYMENT_KIND_LABELS[k]}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="rp-method">Method</Label>
                <select
                  id="rp-method"
                  className="flex h-10 w-full rounded-lg border border-input bg-background px-3 text-sm"
                  value={method}
                  onChange={(e) => setMethod(e.target.value)}
                  disabled={pending}
                >
                  {PAYMENT_METHODS.map((m) => (
                    <option key={m} value={m}>
                      {PAYMENT_METHOD_LABELS[m]}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="rp-paidat">Date</Label>
                <Input
                  id="rp-paidat"
                  type="datetime-local"
                  value={paidAt}
                  onChange={(e) => setPaidAt(e.target.value)}
                  disabled={pending}
                />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="rp-ref">Reference</Label>
                <Input
                  id="rp-ref"
                  value={reference}
                  onChange={(e) => setReference(e.target.value)}
                  placeholder="Check # / confirmation code / Stripe id"
                  disabled={pending}
                />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="rp-notes">Notes</Label>
                <Textarea
                  id="rp-notes"
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  disabled={pending}
                />
              </div>
            </div>
            {error ? (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            ) : null}
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={() => setOpen(false)}
              disabled={pending}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="accent"
              onClick={record}
              disabled={pending}
            >
              {pending ? "Recording…" : "Record"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}

// =============================================================================
// Totals (compact)
// =============================================================================
function TotalsPanel({
  invoice,
  locked,
}: {
  invoice: FullInvoice;
  locked: boolean;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [pending, startTransition] = useTransition();
  const [discount, setDiscount] = useState(
    (invoice.discount_cents / 100).toFixed(2),
  );
  const [taxPercent, setTaxPercent] = useState(
    basisPointsToPercent(invoice.tax_rate_bps).toString(),
  );
  const [gratuityPercent, setGratuityPercent] = useState(
    basisPointsToPercent(invoice.gratuity_rate_bps).toString(),
  );

  function save() {
    startTransition(async () => {
      await updateInvoice({
        id: invoice.id,
        contactId: invoice.contact_id,
        quoteId: invoice.quote_id,
        eventId: invoice.event_id,
        locationId: invoice.location_id,
        title: invoice.title,
        dueDate: invoice.due_date,
        customerNotes: invoice.customer_notes,
        internalNotes: invoice.internal_notes,
        taxRateBps: percentToBasisPoints(Number.parseFloat(taxPercent) || 0),
        gratuityRateBps: percentToBasisPoints(
          Number.parseFloat(gratuityPercent) || 0,
        ),
        discount: Number.parseFloat(discount) || 0,
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
        <Row label="Subtotal" value={formatCents(invoice.subtotal_cents)} />
        {invoice.discount_cents > 0 ? (
          <Row
            label="Discount"
            value={`− ${formatCents(invoice.discount_cents)}`}
            muted
          />
        ) : null}
        <Row
          label={`Tax (${basisPointsToPercent(invoice.tax_rate_bps).toFixed(3)}%)`}
          value={formatCents(invoice.tax_cents)}
        />
        {invoice.gratuity_cents > 0 ? (
          <Row
            label={`Gratuity (${basisPointsToPercent(invoice.gratuity_rate_bps).toFixed(3)}%)`}
            value={formatCents(invoice.gratuity_cents)}
          />
        ) : null}
        <Separator className="my-2" />
        <Row label="Total" value={formatCents(invoice.total_cents)} strong />
        <Row
          label="Paid"
          value={formatCents(invoice.amount_paid_cents)}
          muted
        />
        <Row
          label="Balance"
          value={formatCents(invoice.balance_cents)}
          strong
        />
      </dl>

      {editing ? (
        <div className="mt-4 space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label htmlFor="iv-discount" className="text-xs">
                Discount ($)
              </Label>
              <Input
                id="iv-discount"
                type="number"
                step="0.01"
                min="0"
                value={discount}
                onChange={(e) => setDiscount(e.target.value)}
                disabled={pending}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="iv-tax" className="text-xs">
                Tax %
              </Label>
              <Input
                id="iv-tax"
                type="number"
                step="0.001"
                min="0"
                value={taxPercent}
                onChange={(e) => setTaxPercent(e.target.value)}
                disabled={pending}
              />
            </div>
            <div className="space-y-1 col-span-2">
              <Label htmlFor="iv-grat" className="text-xs">
                Gratuity %
              </Label>
              <Input
                id="iv-grat"
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
// Status actions
// =============================================================================
function ActionsPanel({ invoice }: { invoice: FullInvoice }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [voidOpen, setVoidOpen] = useState(false);
  const [voidReason, setVoidReason] = useState("");
  const [error, setError] = useState<string | null>(null);

  function update(status: "draft" | "sent") {
    startTransition(async () => {
      setError(null);
      const res = await setInvoiceStatus({ id: invoice.id, status });
      if ("error" in res && res.error) {
        setError(res.error);
        return;
      }
      router.refresh();
    });
  }

  function makeVoid() {
    startTransition(async () => {
      setError(null);
      const res = await setInvoiceStatus({
        id: invoice.id,
        status: "void",
        voidReason: voidReason || null,
      });
      if ("error" in res && res.error) {
        setError(res.error);
        return;
      }
      setVoidOpen(false);
      router.refresh();
    });
  }

  const canSend =
    invoice.status === "draft" && invoice.total_cents > 0;
  const canVoid =
    invoice.status !== "paid" && invoice.status !== "void";

  return (
    <section className="space-y-2 rounded-2xl border border-border bg-card p-4">
      <h3 className="font-display text-base font-bold">Status & actions</h3>

      {canSend ? (
        <Button
          variant="accent"
          className="w-full gap-1.5"
          onClick={() => update("sent")}
          disabled={pending}
        >
          <Send className="h-4 w-4" />
          Mark as sent
        </Button>
      ) : null}

      {canVoid ? (
        <Button
          variant="outline"
          className="w-full gap-1.5"
          onClick={() => setVoidOpen(true)}
          disabled={pending}
        >
          <Ban className="h-4 w-4" />
          Void invoice
        </Button>
      ) : null}

      {invoice.quote_id ? (
        <Button asChild variant="outline" className="w-full">
          <a href={`/catering/quotes/${invoice.quote_id}`}>Source quote</a>
        </Button>
      ) : null}

      {invoice.event_id ? (
        <Button asChild variant="outline" className="w-full">
          <a href={`/catering/events/${invoice.event_id}`}>View event</a>
        </Button>
      ) : null}

      {error ? (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      <Dialog open={voidOpen} onOpenChange={setVoidOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Void invoice</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="void-reason">Reason</Label>
            <Textarea
              id="void-reason"
              rows={3}
              value={voidReason}
              onChange={(e) => setVoidReason(e.target.value)}
              placeholder="Why is this being voided?"
              disabled={pending}
            />
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={() => setVoidOpen(false)}
              disabled={pending}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="default"
              onClick={makeVoid}
              disabled={pending}
            >
              {pending ? "Saving…" : "Void"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}
