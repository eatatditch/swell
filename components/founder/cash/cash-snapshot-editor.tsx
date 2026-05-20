"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { upsertCashSnapshot } from "@/components/founder/cash/actions";
import { weekStart } from "@/lib/constants/founder";

function dollarsToCents(input: string): number | null {
  const trimmed = input.trim();
  if (!trimmed) return null;
  const num = Number(trimmed.replace(/[$,\s]/g, ""));
  if (!Number.isFinite(num)) return null;
  return Math.round(num * 100);
}

function centsToDollarInput(cents: number | null | undefined): string {
  if (cents == null) return "";
  return (cents / 100).toFixed(2);
}

interface CashSnapshotEditorProps {
  defaultDate?: string;
  defaults?: {
    cashOnHandCents?: number | null;
    payablesCents?: number | null;
    receivablesCents?: number | null;
    weeklyBurnCents?: number | null;
    notes?: string | null;
  };
}

export function CashSnapshotEditor({
  defaultDate,
  defaults,
}: CashSnapshotEditorProps) {
  const router = useRouter();
  const [snapshotDate, setSnapshotDate] = useState(
    defaultDate ?? weekStart(),
  );
  const [cash, setCash] = useState(
    centsToDollarInput(defaults?.cashOnHandCents),
  );
  const [payables, setPayables] = useState(
    centsToDollarInput(defaults?.payablesCents),
  );
  const [receivables, setReceivables] = useState(
    centsToDollarInput(defaults?.receivablesCents),
  );
  const [burn, setBurn] = useState(
    centsToDollarInput(defaults?.weeklyBurnCents),
  );
  const [notes, setNotes] = useState(defaults?.notes ?? "");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function submit() {
    setError(null);
    const cashCents = dollarsToCents(cash);
    if (cashCents == null || cashCents < 0) {
      setError("Cash on hand is required");
      return;
    }
    startTransition(async () => {
      const res = await upsertCashSnapshot({
        snapshotDate,
        cashOnHandCents: cashCents,
        payablesCents: dollarsToCents(payables) ?? 0,
        receivablesCents: dollarsToCents(receivables) ?? 0,
        weeklyBurnCents: dollarsToCents(burn),
        notes: notes.trim() || null,
      });
      if ("error" in res && res.error) {
        setError(res.error);
        return;
      }
      router.refresh();
    });
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="cs-date">Week starting (Mon)</Label>
          <Input
            id="cs-date"
            type="date"
            value={snapshotDate}
            onChange={(e) => setSnapshotDate(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="cs-cash">Cash on hand ($)</Label>
          <Input
            id="cs-cash"
            inputMode="decimal"
            value={cash}
            onChange={(e) => setCash(e.target.value)}
            placeholder="0.00"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="cs-pay">Payables ($)</Label>
          <Input
            id="cs-pay"
            inputMode="decimal"
            value={payables}
            onChange={(e) => setPayables(e.target.value)}
            placeholder="0.00"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="cs-rec">Receivables ($)</Label>
          <Input
            id="cs-rec"
            inputMode="decimal"
            value={receivables}
            onChange={(e) => setReceivables(e.target.value)}
            placeholder="0.00"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="cs-burn">Weekly burn ($ optional)</Label>
          <Input
            id="cs-burn"
            inputMode="decimal"
            value={burn}
            onChange={(e) => setBurn(e.target.value)}
            placeholder="0.00"
          />
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="cs-notes">Notes</Label>
        <Textarea
          id="cs-notes"
          rows={3}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Anything off-pattern: big deposits, lumpy AP, etc."
        />
      </div>
      {error ? (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}
      <div className="flex justify-end">
        <Button onClick={submit} disabled={pending}>
          {pending ? "Saving…" : "Save snapshot"}
        </Button>
      </div>
    </div>
  );
}
