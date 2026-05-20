"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CreditCard, DollarSign, Plus, Trash2 } from "lucide-react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { EmptyState } from "@/components/data/empty-state";
import { PaymentStatusBadge } from "@/components/catering/status-badges";
import {
  deletePayment,
  recordPayment,
  updatePaymentStatus,
} from "@/components/catering/payments/actions";
import {
  formatCents,
  PAYMENT_KINDS,
  PAYMENT_KIND_LABELS,
  PAYMENT_METHODS,
  PAYMENT_METHOD_LABELS,
  PAYMENT_STATUSES,
  PAYMENT_STATUS_LABELS,
} from "@/lib/constants/catering";
import type {
  EventPaymentKind,
  EventPaymentMethod,
  EventPaymentStatus,
} from "@/lib/types/database";
import type { PaymentWithRecorder } from "@/lib/server/catering";

interface PaymentListProps {
  eventId: string;
  payments: PaymentWithRecorder[];
  canRecord: boolean;
  currentUserId: string;
}

export function PaymentList({
  eventId,
  payments,
  canRecord,
  currentUserId,
}: PaymentListProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function changeStatus(id: string, status: EventPaymentStatus) {
    startTransition(async () => {
      await updatePaymentStatus(id, status);
      router.refresh();
    });
  }

  function remove(id: string) {
    if (!confirm("Delete this payment record?")) return;
    startTransition(async () => {
      await deletePayment(id);
      router.refresh();
    });
  }

  return (
    <div className="space-y-3">
      {canRecord ? (
        <div className="flex items-center justify-end">
          <RecordPaymentDialog eventId={eventId} />
        </div>
      ) : (
        <div className="rounded-lg border border-dashed border-border bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
          Managers can record payments. Read-only for your role.
        </div>
      )}

      {payments.length === 0 ? (
        <EmptyState
          icon={DollarSign}
          title="No payments recorded"
          description={
            canRecord
              ? "Record deposits, balance, gratuity, and refunds here."
              : "Payments will appear here once a manager records them."
          }
        />
      ) : (
        <ul className="space-y-2">
          {payments.map((p) => (
            <li
              key={p.id}
              className="flex flex-col gap-2 rounded-xl border bg-card p-3 sm:flex-row sm:items-start sm:gap-3"
            >
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-baseline gap-2">
                  <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-xs uppercase tracking-wide">
                    <CreditCard className="h-3 w-3" />
                    {PAYMENT_KIND_LABELS[p.kind]}
                  </span>
                  <span className="text-base font-semibold tabular-nums">
                    {formatCents(p.amount_cents)}
                  </span>
                  <PaymentStatusBadge status={p.status} />
                  {p.method ? (
                    <span className="text-xs text-muted-foreground">
                      via {PAYMENT_METHOD_LABELS[p.method]}
                    </span>
                  ) : null}
                </div>
                {p.reference ? (
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    Ref: {p.reference}
                  </p>
                ) : null}
                {p.notes ? (
                  <p className="mt-1 whitespace-pre-wrap text-sm text-muted-foreground">
                    {p.notes}
                  </p>
                ) : null}
                <p className="mt-1 text-xs text-muted-foreground">
                  {p.recorder?.full_name ?? p.recorder?.email ?? "—"}
                  {p.due_at ? ` · due ${formatDateTime(p.due_at)}` : ""}
                  {p.paid_at ? ` · paid ${formatDateTime(p.paid_at)}` : ""}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-1">
                {canRecord ? (
                  <select
                    value={p.status}
                    onChange={(e) =>
                      changeStatus(p.id, e.target.value as EventPaymentStatus)
                    }
                    disabled={pending}
                    className="h-8 rounded-lg border border-input bg-background px-2 text-xs"
                    aria-label="Status"
                  >
                    {PAYMENT_STATUSES.map((s) => (
                      <option key={s} value={s}>
                        {PAYMENT_STATUS_LABELS[s]}
                      </option>
                    ))}
                  </select>
                ) : null}
                {p.created_by === currentUserId ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => remove(p.id)}
                    disabled={pending}
                    className="h-8 w-8 text-muted-foreground hover:text-destructive"
                    aria-label="Delete"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function RecordPaymentDialog({ eventId }: { eventId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [kind, setKind] = useState<EventPaymentKind>("deposit");
  const [status, setStatus] = useState<EventPaymentStatus>("received");
  const [method, setMethod] = useState<EventPaymentMethod | "">("card");
  const [amount, setAmount] = useState("");
  const [dueAt, setDueAt] = useState("");
  const [paidAt, setPaidAt] = useState("");
  const [reference, setReference] = useState("");
  const [notes, setNotes] = useState("");

  function submit() {
    setError(null);
    const amt = Number.parseFloat(amount);
    if (!Number.isFinite(amt) || amt < 0) {
      setError("Amount is required");
      return;
    }
    startTransition(async () => {
      const res = await recordPayment({
        eventId,
        kind,
        status,
        method: (method || null) as EventPaymentMethod | null,
        amount: amt,
        dueAt: dueAt || null,
        paidAt: paidAt || null,
        reference: reference || null,
        notes: notes || null,
      });
      if ("error" in res && res.error) {
        setError(res.error);
        return;
      }
      setOpen(false);
      setAmount("");
      setDueAt("");
      setPaidAt("");
      setReference("");
      setNotes("");
      router.refresh();
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="accent" size="sm" className="gap-1.5">
          <Plus className="h-4 w-4" />
          Record payment
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Record payment</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="pm-kind">Kind</Label>
              <select
                id="pm-kind"
                className="flex h-10 w-full rounded-lg border border-input bg-background px-3 text-sm"
                value={kind}
                onChange={(e) => setKind(e.target.value as EventPaymentKind)}
                disabled={pending}
              >
                {PAYMENT_KINDS.map((k) => (
                  <option key={k} value={k}>
                    {PAYMENT_KIND_LABELS[k]}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="pm-status">Status</Label>
              <select
                id="pm-status"
                className="flex h-10 w-full rounded-lg border border-input bg-background px-3 text-sm"
                value={status}
                onChange={(e) =>
                  setStatus(e.target.value as EventPaymentStatus)
                }
                disabled={pending}
              >
                {PAYMENT_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {PAYMENT_STATUS_LABELS[s]}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="pm-method">Method</Label>
              <select
                id="pm-method"
                className="flex h-10 w-full rounded-lg border border-input bg-background px-3 text-sm"
                value={method}
                onChange={(e) =>
                  setMethod(e.target.value as EventPaymentMethod)
                }
                disabled={pending}
              >
                {PAYMENT_METHODS.map((m) => (
                  <option key={m} value={m}>
                    {PAYMENT_METHOD_LABELS[m]}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="pm-amt">Amount ($)</Label>
            <Input
              id="pm-amt"
              type="number"
              min="0"
              step="0.01"
              inputMode="decimal"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              autoFocus
              disabled={pending}
            />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="pm-due">Due</Label>
              <Input
                id="pm-due"
                type="datetime-local"
                value={dueAt}
                onChange={(e) => setDueAt(e.target.value)}
                disabled={pending}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="pm-paid">Paid</Label>
              <Input
                id="pm-paid"
                type="datetime-local"
                value={paidAt}
                onChange={(e) => setPaidAt(e.target.value)}
                disabled={pending}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="pm-ref">Reference</Label>
            <Input
              id="pm-ref"
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              placeholder="Check # / transaction id"
              disabled={pending}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="pm-notes">Notes</Label>
            <Textarea
              id="pm-notes"
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              disabled={pending}
            />
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
            onClick={submit}
            disabled={pending || !amount}
          >
            {pending ? "Saving…" : "Record"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}
