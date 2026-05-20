"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, Pencil, Printer, X } from "lucide-react";
import Link from "next/link";

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
  confirmHeadcount,
  deleteCateringEvent,
  setEventStatus,
} from "@/components/catering/events/actions";
import {
  EVENT_STATUSES,
  EVENT_STATUS_LABELS,
} from "@/lib/constants/catering";
import type { CateringEventStatus } from "@/lib/types/database";

interface EventStatusControlsProps {
  eventId: string;
  status: CateringEventStatus;
  guestCount: number | null;
  canDelete: boolean;
}

export function EventStatusControls({
  eventId,
  status,
  guestCount,
  canDelete,
}: EventStatusControlsProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState("");

  function changeStatus(s: CateringEventStatus) {
    if (s === "canceled") {
      setCancelOpen(true);
      return;
    }
    startTransition(async () => {
      setError(null);
      const res = await setEventStatus(eventId, s);
      if ("error" in res && res.error) {
        setError(res.error);
        return;
      }
      router.refresh();
    });
  }

  function confirmCancel() {
    startTransition(async () => {
      const res = await setEventStatus(eventId, "canceled", cancelReason || null);
      if ("error" in res && res.error) {
        setError(res.error);
        return;
      }
      setCancelOpen(false);
      setCancelReason("");
      router.refresh();
    });
  }

  function handleHeadcount() {
    const input = prompt("Confirmed guest count?", String(guestCount ?? ""));
    if (!input) return;
    const n = Number.parseInt(input, 10);
    if (!Number.isFinite(n) || n < 0) return;
    startTransition(async () => {
      await confirmHeadcount(eventId, n);
      router.refresh();
    });
  }

  function handleDelete() {
    if (!confirm("Delete this event? This cannot be undone.")) return;
    startTransition(async () => {
      const res = await deleteCateringEvent(eventId);
      if ("error" in res && res.error) {
        setError(res.error);
        return;
      }
      router.push("/catering/events");
      router.refresh();
    });
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <select
          value={status}
          onChange={(e) => changeStatus(e.target.value as CateringEventStatus)}
          disabled={pending}
          className="h-10 rounded-full border border-input bg-background px-4 text-sm font-medium"
          aria-label="Set event status"
        >
          {EVENT_STATUSES.map((s) => (
            <option key={s} value={s}>
              Status: {EVENT_STATUS_LABELS[s]}
            </option>
          ))}
        </select>

        {status === "booked" ? (
          <Button
            variant="accent"
            size="sm"
            onClick={() => changeStatus("confirmed")}
            disabled={pending}
            className="gap-1.5"
          >
            <Check className="h-4 w-4" />
            Confirm
          </Button>
        ) : null}

        {status === "confirmed" ? (
          <Button
            variant="accent"
            size="sm"
            onClick={() => changeStatus("executed")}
            disabled={pending}
            className="gap-1.5"
          >
            <Check className="h-4 w-4" />
            Mark executed
          </Button>
        ) : null}

        <Button
          variant="outline"
          size="sm"
          onClick={handleHeadcount}
          disabled={pending}
        >
          Confirm headcount
        </Button>

        <Button asChild variant="outline" size="sm" className="gap-1.5">
          <Link href={`/catering/events/${eventId}/edit`}>
            <Pencil className="h-4 w-4" />
            Edit
          </Link>
        </Button>

        <Button
          variant="ghost"
          size="sm"
          onClick={() => window.print()}
          disabled={pending}
          className="gap-1.5"
        >
          <Printer className="h-4 w-4" />
          Print BEO
        </Button>

        <Dialog open={cancelOpen} onOpenChange={setCancelOpen}>
          <DialogTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              disabled={pending || status === "canceled"}
              className="gap-1.5 text-muted-foreground hover:text-destructive"
            >
              <X className="h-4 w-4" />
              Cancel event
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Cancel event</DialogTitle>
            </DialogHeader>
            <div className="space-y-2">
              <Label htmlFor="cancel-reason">Reason (optional)</Label>
              <Textarea
                id="cancel-reason"
                rows={3}
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                placeholder="Why was this canceled?"
                disabled={pending}
              />
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="ghost"
                onClick={() => setCancelOpen(false)}
                disabled={pending}
              >
                Keep it
              </Button>
              <Button
                type="button"
                variant="default"
                onClick={confirmCancel}
                disabled={pending}
              >
                {pending ? "Saving…" : "Cancel event"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {canDelete ? (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleDelete}
            disabled={pending}
            className="text-muted-foreground hover:text-destructive"
          >
            Delete
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
