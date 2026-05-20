"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ChevronRight, X } from "lucide-react";

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
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  advanceLead,
  deleteCateringLead,
  setLeadStatus,
} from "@/components/catering/leads/actions";
import {
  LEAD_STAGE_FORWARD,
  LEAD_STATUSES,
  LEAD_STATUS_LABELS,
} from "@/lib/constants/catering";
import type { CateringLeadStatus } from "@/lib/types/database";

interface LeadStageControlsProps {
  leadId: string;
  status: CateringLeadStatus;
  canDelete: boolean;
}

export function LeadStageControls({
  leadId,
  status,
  canDelete,
}: LeadStageControlsProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [lostOpen, setLostOpen] = useState(false);
  const [lostReason, setLostReason] = useState("");

  const next = LEAD_STAGE_FORWARD[status];

  function handleAdvance() {
    startTransition(async () => {
      setError(null);
      const res = await advanceLead(leadId);
      if ("error" in res && res.error) {
        setError(res.error);
        return;
      }
      router.refresh();
    });
  }

  function handleSetStatus(s: CateringLeadStatus) {
    if (s === "lost") {
      setLostOpen(true);
      return;
    }
    startTransition(async () => {
      setError(null);
      const res = await setLeadStatus(leadId, s);
      if ("error" in res && res.error) {
        setError(res.error);
        return;
      }
      router.refresh();
    });
  }

  function confirmLost() {
    startTransition(async () => {
      setError(null);
      const res = await setLeadStatus(leadId, "lost", lostReason || null);
      if ("error" in res && res.error) {
        setError(res.error);
        return;
      }
      setLostOpen(false);
      setLostReason("");
      router.refresh();
    });
  }

  function handleDelete() {
    if (!confirm("Delete this lead? This cannot be undone.")) return;
    startTransition(async () => {
      const res = await deleteCateringLead(leadId);
      if ("error" in res && res.error) {
        setError(res.error);
        return;
      }
      router.push("/catering/leads");
      router.refresh();
    });
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        {next ? (
          <Button
            type="button"
            variant="accent"
            size="sm"
            onClick={handleAdvance}
            disabled={pending}
            className="gap-1.5"
          >
            Advance to {LEAD_STATUS_LABELS[next]}
            <ChevronRight className="h-4 w-4" />
          </Button>
        ) : null}

        <select
          value={status}
          onChange={(e) => handleSetStatus(e.target.value as CateringLeadStatus)}
          disabled={pending}
          className="h-9 rounded-full border border-input bg-background px-3 text-xs font-medium"
          aria-label="Set lead status"
        >
          {LEAD_STATUSES.map((s) => (
            <option key={s} value={s}>
              Set: {LEAD_STATUS_LABELS[s]}
            </option>
          ))}
        </select>

        <Dialog open={lostOpen} onOpenChange={setLostOpen}>
          <DialogTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={pending || status === "lost"}
              className="gap-1.5"
            >
              <X className="h-4 w-4" />
              Mark lost
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Mark lead as lost</DialogTitle>
            </DialogHeader>
            <div className="space-y-2">
              <Label htmlFor="lost-reason">Reason (optional)</Label>
              <Textarea
                id="lost-reason"
                rows={3}
                value={lostReason}
                onChange={(e) => setLostReason(e.target.value)}
                placeholder="Why didn't this convert? Price, date, scope, no response…"
                disabled={pending}
              />
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="ghost"
                onClick={() => setLostOpen(false)}
                disabled={pending}
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="default"
                onClick={confirmLost}
                disabled={pending}
              >
                {pending ? "Saving…" : "Mark lost"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {canDelete ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleDelete}
            disabled={pending}
            className="text-muted-foreground hover:text-destructive"
          >
            Delete lead
          </Button>
        ) : null}
      </div>
      {error ? (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}
    </div>
  );
}
