"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Ban, CheckCircle2, Trash2 } from "lucide-react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { EmptyState } from "@/components/data/empty-state";
import {
  createEightySixedItem,
  deleteEightySixedItem,
  resolveEightySixedItem,
} from "@/components/daily-ops/eighty-sixed/actions";
import type { EightySixedItem, ProfileLite } from "@/lib/types/database";

interface EightySixedListProps {
  locationId: string;
  currentUserId: string;
  items: (EightySixedItem & { creator: ProfileLite | null })[];
}

export function EightySixedList({
  locationId,
  currentUserId,
  items,
}: EightySixedListProps) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [reason, setReason] = useState("");
  const [until, setUntil] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function add() {
    setError(null);
    if (!name.trim()) {
      setError("Name is required");
      return;
    }
    startTransition(async () => {
      const res = await createEightySixedItem({
        locationId,
        name,
        reason: reason || null,
        until: until || null,
      });
      if ("error" in res && res.error) {
        setError(res.error);
        return;
      }
      setName("");
      setReason("");
      setUntil("");
      router.refresh();
    });
  }

  function resolve(id: string) {
    startTransition(async () => {
      const res = await resolveEightySixedItem(id);
      if ("error" in res && res.error) {
        setError(res.error);
        return;
      }
      router.refresh();
    });
  }

  function remove(id: string) {
    startTransition(async () => {
      const res = await deleteEightySixedItem(id);
      if ("error" in res && res.error) {
        setError(res.error);
        return;
      }
      router.refresh();
    });
  }

  return (
    <div className="space-y-4">
      <div className="space-y-3 rounded-lg border bg-card p-4">
        <p className="text-sm font-medium">86 an item</p>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="es-name">Item</Label>
            <Input
              id="es-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Wild halibut"
              disabled={pending}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="es-until">Until (optional)</Label>
            <Input
              id="es-until"
              type="datetime-local"
              value={until}
              onChange={(e) => setUntil(e.target.value)}
              disabled={pending}
            />
          </div>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="es-reason">Reason</Label>
          <Textarea
            id="es-reason"
            rows={2}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Why? Comms with FOH and BOH live here."
            disabled={pending}
          />
        </div>
        {error ? (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : null}
        <div className="flex justify-end">
          <Button onClick={add} disabled={pending || !name.trim()}>
            {pending ? "Saving…" : "86 it"}
          </Button>
        </div>
      </div>

      {items.length === 0 ? (
        <EmptyState
          icon={Ban}
          title="Nothing 86'd"
          description="Everything on the menu is available right now."
        />
      ) : (
        <ul className="space-y-2">
          {items.map((it) => {
            const overdue =
              it.until_at && new Date(it.until_at).getTime() < Date.now();
            return (
              <li
                key={it.id}
                className="flex flex-col gap-2 rounded-lg border bg-card p-3 sm:flex-row sm:items-start sm:gap-3"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium">{it.name}</p>
                  {it.reason ? (
                    <p className="mt-0.5 text-sm text-muted-foreground">
                      {it.reason}
                    </p>
                  ) : null}
                  <p className="mt-1 text-xs text-muted-foreground">
                    {it.creator?.full_name ?? it.creator?.email ?? "Someone"} ·{" "}
                    {formatRelative(it.created_at)}
                    {it.until_at ? (
                      <>
                        {" · until "}
                        <span
                          className={
                            overdue ? "text-amber-700 dark:text-amber-300" : ""
                          }
                        >
                          {formatDateTime(it.until_at)}
                        </span>
                      </>
                    ) : null}
                  </p>
                </div>
                <div className="flex shrink-0 gap-1">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => resolve(it.id)}
                    disabled={pending}
                    className="gap-1.5"
                  >
                    <CheckCircle2 className="h-4 w-4" />
                    Back on
                  </Button>
                  {it.created_by === currentUserId ? (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => remove(it.id)}
                      disabled={pending}
                      className="h-9 w-9 text-muted-foreground hover:text-destructive"
                      aria-label="Delete"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  ) : null}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function formatRelative(iso: string) {
  const ms = Date.now() - new Date(iso).getTime();
  const min = Math.round(ms / 60000);
  if (min < 1) return "just now";
  if (min < 60) return `${min}m ago`;
  const hr = Math.round(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.round(hr / 24);
  return `${day}d ago`;
}

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}
