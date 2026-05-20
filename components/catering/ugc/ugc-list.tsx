"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Camera, Plus, Trash2 } from "lucide-react";

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
import { UgcStatusBadge } from "@/components/catering/status-badges";
import {
  deleteUgc,
  setUgcStatus,
  upsertUgc,
} from "@/components/catering/ugc/actions";
import {
  UGC_CONTENT_TYPES,
  UGC_CONTENT_TYPE_LABELS,
  UGC_STATUSES,
  UGC_STATUS_LABELS,
} from "@/lib/constants/catering";
import type {
  EventUgcContentType,
  EventUgcStatus,
} from "@/lib/types/database";
import type { UgcWithOwner } from "@/lib/server/catering";

interface UgcListProps {
  eventId: string;
  items: UgcWithOwner[];
  currentUserId: string;
}

export function UgcList({ eventId, items, currentUserId }: UgcListProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function changeStatus(id: string, status: EventUgcStatus) {
    startTransition(async () => {
      await setUgcStatus(id, status);
      router.refresh();
    });
  }

  function remove(id: string) {
    if (!confirm("Delete this UGC opportunity?")) return;
    startTransition(async () => {
      await deleteUgc(id);
      router.refresh();
    });
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-end">
        <UgcDialog eventId={eventId} />
      </div>
      {items.length === 0 ? (
        <EmptyState
          icon={Camera}
          title="No UGC tracked"
          description="Capture content goals so the marketing team can plan."
        />
      ) : (
        <ul className="space-y-2">
          {items.map((u) => (
            <li
              key={u.id}
              className="flex flex-col gap-2 rounded-xl border bg-card p-3 sm:flex-row sm:items-start"
            >
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-baseline gap-2">
                  <span className="text-sm font-medium">
                    {UGC_CONTENT_TYPE_LABELS[u.content_type]}
                  </span>
                  <UgcStatusBadge status={u.status} />
                  {u.instagram_handle ? (
                    <span className="text-xs text-muted-foreground">
                      @{u.instagram_handle.replace(/^@/, "")}
                    </span>
                  ) : null}
                </div>
                {u.contact_name ? (
                  <p className="mt-0.5 text-sm">{u.contact_name}</p>
                ) : null}
                {u.notes ? (
                  <p className="mt-1 whitespace-pre-wrap text-sm text-muted-foreground">
                    {u.notes}
                  </p>
                ) : null}
                {u.posted_link ? (
                  <a
                    href={u.posted_link}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-1 inline-block text-xs text-primary underline-offset-2 hover:underline"
                  >
                    View post
                  </a>
                ) : null}
              </div>
              <div className="flex shrink-0 items-center gap-1">
                <select
                  value={u.status}
                  onChange={(e) =>
                    changeStatus(u.id, e.target.value as EventUgcStatus)
                  }
                  disabled={pending}
                  className="h-8 rounded-lg border border-input bg-background px-2 text-xs"
                  aria-label="Status"
                >
                  {UGC_STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {UGC_STATUS_LABELS[s]}
                    </option>
                  ))}
                </select>
                {u.created_by === currentUserId ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => remove(u.id)}
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

function UgcDialog({ eventId }: { eventId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [contactName, setContactName] = useState("");
  const [handle, setHandle] = useState("");
  const [type, setType] = useState<EventUgcContentType>("photos");
  const [status, setStatus] = useState<EventUgcStatus>("planned");
  const [plannedFor, setPlannedFor] = useState("");
  const [notes, setNotes] = useState("");

  function submit() {
    setError(null);
    startTransition(async () => {
      const res = await upsertUgc({
        eventId,
        contactName: contactName || null,
        instagramHandle: handle || null,
        contentType: type,
        status,
        plannedFor: plannedFor || null,
        notes: notes || null,
      });
      if ("error" in res && res.error) {
        setError(res.error);
        return;
      }
      setOpen(false);
      setContactName("");
      setHandle("");
      setNotes("");
      router.refresh();
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="accent" size="sm" className="gap-1.5">
          <Plus className="h-4 w-4" />
          Add UGC
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>UGC opportunity</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="ug-name">Contact name</Label>
              <Input
                id="ug-name"
                value={contactName}
                onChange={(e) => setContactName(e.target.value)}
                disabled={pending}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ug-ig">Instagram handle</Label>
              <Input
                id="ug-ig"
                value={handle}
                onChange={(e) => setHandle(e.target.value)}
                placeholder="@username"
                disabled={pending}
              />
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="ug-type">Content type</Label>
              <select
                id="ug-type"
                className="flex h-10 w-full rounded-lg border border-input bg-background px-3 text-sm"
                value={type}
                onChange={(e) =>
                  setType(e.target.value as EventUgcContentType)
                }
                disabled={pending}
              >
                {UGC_CONTENT_TYPES.map((c) => (
                  <option key={c} value={c}>
                    {UGC_CONTENT_TYPE_LABELS[c]}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="ug-status">Status</Label>
              <select
                id="ug-status"
                className="flex h-10 w-full rounded-lg border border-input bg-background px-3 text-sm"
                value={status}
                onChange={(e) => setStatus(e.target.value as EventUgcStatus)}
                disabled={pending}
              >
                {UGC_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {UGC_STATUS_LABELS[s]}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="ug-when">Planned for</Label>
            <Input
              id="ug-when"
              type="datetime-local"
              value={plannedFor}
              onChange={(e) => setPlannedFor(e.target.value)}
              disabled={pending}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="ug-notes">Notes</Label>
            <Textarea
              id="ug-notes"
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
            disabled={pending}
          >
            {pending ? "Saving…" : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
