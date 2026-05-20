"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Banknote, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/data/empty-state";
import { deleteCashSnapshot } from "@/components/founder/cash/actions";
import { formatCents } from "@/lib/constants/daily-ops";
import { cn } from "@/lib/utils";
import type { FounderCashSnapshot } from "@/lib/types/database";

interface CashSnapshotListProps {
  snapshots: FounderCashSnapshot[];
}

export function CashSnapshotList({ snapshots }: CashSnapshotListProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function remove(id: string) {
    startTransition(async () => {
      await deleteCashSnapshot(id);
      router.refresh();
    });
  }

  if (snapshots.length === 0) {
    return (
      <EmptyState
        icon={Banknote}
        title="No snapshots yet"
        description="Enter this week's cash position above to start the runway."
      />
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-xs uppercase tracking-wide text-muted-foreground">
            <th className="px-3 py-2 font-medium">Week</th>
            <th className="px-3 py-2 text-right font-medium">Cash</th>
            <th className="px-3 py-2 text-right font-medium">A/P</th>
            <th className="px-3 py-2 text-right font-medium">A/R</th>
            <th className="px-3 py-2 text-right font-medium">Net</th>
            <th className="px-3 py-2 text-right font-medium">Burn</th>
            <th className="px-3 py-2 text-right font-medium">Runway</th>
            <th className="w-8" />
          </tr>
        </thead>
        <tbody>
          {snapshots.map((s) => {
            const net = s.cash_on_hand_cents - s.payables_cents +
              s.receivables_cents;
            const runwayWeeks =
              s.weekly_burn_cents && s.weekly_burn_cents > 0
                ? s.cash_on_hand_cents / s.weekly_burn_cents
                : null;
            return (
              <tr key={s.id} className="border-t border-border align-top">
                <td className="px-3 py-2 font-medium">
                  {s.snapshot_date}
                  {s.notes ? (
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {s.notes}
                    </p>
                  ) : null}
                </td>
                <td className="px-3 py-2 text-right tabular-nums">
                  {formatCents(s.cash_on_hand_cents)}
                </td>
                <td className="px-3 py-2 text-right tabular-nums text-muted-foreground">
                  {formatCents(s.payables_cents)}
                </td>
                <td className="px-3 py-2 text-right tabular-nums text-muted-foreground">
                  {formatCents(s.receivables_cents)}
                </td>
                <td
                  className={cn(
                    "px-3 py-2 text-right tabular-nums",
                    net < 0 && "text-rose-600",
                  )}
                >
                  {formatCents(net)}
                </td>
                <td className="px-3 py-2 text-right tabular-nums text-muted-foreground">
                  {s.weekly_burn_cents != null
                    ? formatCents(s.weekly_burn_cents)
                    : "—"}
                </td>
                <td className="px-3 py-2 text-right tabular-nums">
                  {runwayWeeks != null ? `${runwayWeeks.toFixed(1)} wk` : "—"}
                </td>
                <td className="px-3 py-2 text-right">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => remove(s.id)}
                    disabled={pending}
                    className="h-7 w-7 text-muted-foreground hover:text-destructive"
                    aria-label="Delete snapshot"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
