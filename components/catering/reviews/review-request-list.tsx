"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { MessageSquareQuote, Plus, Star, Trash2 } from "lucide-react";

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
import {
  deleteReviewRequest,
  upsertReviewRequest,
} from "@/components/catering/reviews/actions";
import {
  REVIEW_PLATFORMS,
  REVIEW_PLATFORM_LABELS,
} from "@/lib/constants/catering";
import { cn } from "@/lib/utils";
import type {
  EventReviewRequest,
  ReviewPlatform,
} from "@/lib/types/database";

interface ReviewRequestListProps {
  eventId: string;
  items: EventReviewRequest[];
  currentUserId: string;
}

export function ReviewRequestList({
  eventId,
  items,
  currentUserId,
}: ReviewRequestListProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function remove(id: string) {
    if (!confirm("Delete this review request?")) return;
    startTransition(async () => {
      await deleteReviewRequest(id);
      router.refresh();
    });
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-end">
        <ReviewDialog eventId={eventId} />
      </div>
      {items.length === 0 ? (
        <EmptyState
          icon={MessageSquareQuote}
          title="No review requests"
          description="Track Google, Yelp, and direct review outreach."
        />
      ) : (
        <ul className="space-y-2">
          {items.map((r) => (
            <li
              key={r.id}
              className="flex flex-col gap-2 rounded-xl border bg-card p-3 sm:flex-row sm:items-start"
            >
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-baseline gap-2">
                  <span className="text-sm font-medium">
                    {REVIEW_PLATFORM_LABELS[r.platform]}
                  </span>
                  {r.rating ? <StarRating rating={r.rating} /> : null}
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  {r.request_sent_at
                    ? `Requested ${formatDateTime(r.request_sent_at)}`
                    : "Not yet requested"}
                  {r.response_received_at
                    ? ` · responded ${formatDateTime(r.response_received_at)}`
                    : ""}
                </p>
                {r.notes ? (
                  <p className="mt-1 whitespace-pre-wrap text-sm">{r.notes}</p>
                ) : null}
                {r.link ? (
                  <a
                    href={r.link}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-1 inline-block text-xs text-primary underline-offset-2 hover:underline"
                  >
                    View review
                  </a>
                ) : null}
              </div>
              {r.created_by === currentUserId ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => remove(r.id)}
                  disabled={pending}
                  className="h-8 w-8 text-muted-foreground hover:text-destructive"
                  aria-label="Delete"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function StarRating({ rating }: { rating: number }) {
  return (
    <span className="inline-flex items-center">
      {[1, 2, 3, 4, 5].map((s) => (
        <Star
          key={s}
          className={cn(
            "h-3.5 w-3.5",
            s <= rating
              ? "fill-amber-400 text-amber-400"
              : "text-muted-foreground/40",
          )}
        />
      ))}
      <span className="ml-1 text-xs tabular-nums">{rating}/5</span>
    </span>
  );
}

function ReviewDialog({ eventId }: { eventId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [platform, setPlatform] = useState<ReviewPlatform>("google");
  const [requestSentAt, setRequestSentAt] = useState("");
  const [responseReceivedAt, setResponseReceivedAt] = useState("");
  const [rating, setRating] = useState("");
  const [link, setLink] = useState("");
  const [notes, setNotes] = useState("");

  function submit() {
    setError(null);
    startTransition(async () => {
      const res = await upsertReviewRequest({
        eventId,
        platform,
        requestSentAt: requestSentAt || null,
        responseReceivedAt: responseReceivedAt || null,
        rating: rating ? Number.parseInt(rating, 10) : null,
        link: link || null,
        notes: notes || null,
      });
      if ("error" in res && res.error) {
        setError(res.error);
        return;
      }
      setOpen(false);
      setRequestSentAt("");
      setResponseReceivedAt("");
      setRating("");
      setLink("");
      setNotes("");
      router.refresh();
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="accent" size="sm" className="gap-1.5">
          <Plus className="h-4 w-4" />
          Add review request
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Review request</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-2">
            <Label htmlFor="rr-plat">Platform</Label>
            <select
              id="rr-plat"
              className="flex h-10 w-full rounded-lg border border-input bg-background px-3 text-sm"
              value={platform}
              onChange={(e) => setPlatform(e.target.value as ReviewPlatform)}
              disabled={pending}
            >
              {REVIEW_PLATFORMS.map((p) => (
                <option key={p} value={p}>
                  {REVIEW_PLATFORM_LABELS[p]}
                </option>
              ))}
            </select>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="rr-sent">Sent</Label>
              <Input
                id="rr-sent"
                type="datetime-local"
                value={requestSentAt}
                onChange={(e) => setRequestSentAt(e.target.value)}
                disabled={pending}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="rr-resp">Responded</Label>
              <Input
                id="rr-resp"
                type="datetime-local"
                value={responseReceivedAt}
                onChange={(e) => setResponseReceivedAt(e.target.value)}
                disabled={pending}
              />
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="rr-rating">Rating (1-5)</Label>
              <Input
                id="rr-rating"
                type="number"
                min="1"
                max="5"
                value={rating}
                onChange={(e) => setRating(e.target.value)}
                disabled={pending}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="rr-link">Link</Label>
              <Input
                id="rr-link"
                value={link}
                onChange={(e) => setLink(e.target.value)}
                placeholder="https://…"
                disabled={pending}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="rr-notes">Notes</Label>
            <Textarea
              id="rr-notes"
              rows={3}
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
            disabled={pending}
          >
            {pending ? "Saving…" : "Save"}
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
  });
}
