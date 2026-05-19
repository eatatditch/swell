"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { createCompVoidNote } from "@/components/daily-ops/comp-void/actions";
import {
  COMP_VOID_KINDS,
  COMP_VOID_KIND_LABELS,
} from "@/lib/constants/daily-ops";
import type { CompVoidKind } from "@/lib/types/database";

interface CompVoidFormProps {
  locationId: string;
}

export function CompVoidForm({ locationId }: CompVoidFormProps) {
  const router = useRouter();
  const [kind, setKind] = useState<CompVoidKind>("comp");
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("");
  const [ticketRef, setTicketRef] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function submit() {
    setError(null);
    const parsed = Number.parseFloat(amount);
    if (!Number.isFinite(parsed) || parsed < 0) {
      setError("Enter a valid amount");
      return;
    }
    if (!reason.trim()) {
      setError("Reason is required");
      return;
    }
    startTransition(async () => {
      const res = await createCompVoidNote({
        locationId,
        kind,
        amount: parsed,
        reason,
        ticketRef: ticketRef || null,
      });
      if ("error" in res && res.error) {
        setError(res.error);
        return;
      }
      setAmount("");
      setReason("");
      setTicketRef("");
      router.refresh();
    });
  }

  return (
    <div className="space-y-3 rounded-lg border bg-card p-4">
      <p className="text-sm font-medium">Record comp / void</p>
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="space-y-1.5">
          <Label htmlFor="cv-kind">Kind</Label>
          <select
            id="cv-kind"
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
            value={kind}
            onChange={(e) => setKind(e.target.value as CompVoidKind)}
            disabled={pending}
          >
            {COMP_VOID_KINDS.map((k) => (
              <option key={k} value={k}>
                {COMP_VOID_KIND_LABELS[k]}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="cv-amount">Amount ($)</Label>
          <Input
            id="cv-amount"
            type="number"
            inputMode="decimal"
            min="0"
            step="0.01"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0.00"
            disabled={pending}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="cv-ticket">Ticket / check #</Label>
          <Input
            id="cv-ticket"
            value={ticketRef}
            onChange={(e) => setTicketRef(e.target.value)}
            placeholder="optional"
            disabled={pending}
          />
        </div>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="cv-reason">Reason</Label>
        <Textarea
          id="cv-reason"
          rows={3}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Why was this comp'd / voided?"
          disabled={pending}
        />
      </div>
      {error ? (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}
      <div className="flex justify-end">
        <Button onClick={submit} disabled={pending || !reason.trim() || !amount}>
          {pending ? "Saving…" : "Record"}
        </Button>
      </div>
    </div>
  );
}
