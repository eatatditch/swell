"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Megaphone, Pin, PinOff, Plus, Trash2 } from "lucide-react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  createAnnouncement,
  deleteAnnouncement,
  togglePinned,
} from "@/components/training/announcement-actions";
import { cn } from "@/lib/utils";
import type { TrainingAnnouncement } from "@/lib/types/database";

interface AnnouncementBoardProps {
  announcements: TrainingAnnouncement[];
  canManage: boolean;
}

export function AnnouncementBoard({
  announcements,
  canManage,
}: AnnouncementBoardProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function remove(id: string) {
    if (!confirm("Remove this announcement?")) return;
    startTransition(async () => {
      await deleteAnnouncement(id);
      router.refresh();
    });
  }
  function flip(id: string, current: boolean) {
    startTransition(async () => {
      await togglePinned(id, !current);
      router.refresh();
    });
  }

  if (announcements.length === 0 && !canManage) return null;

  return (
    <div className="space-y-2">
      {canManage ? (
        <div className="flex justify-end">
          <NewAnnouncementDialog />
        </div>
      ) : null}
      {announcements.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border bg-card/50 p-4 text-center text-sm text-muted-foreground">
          No announcements right now.
        </div>
      ) : (
        <ul className="space-y-2">
          {announcements.map((a) => (
            <li
              key={a.id}
              className={cn(
                "rounded-lg border bg-card p-4",
                a.pinned && "border-accent/40 bg-accent/5",
              )}
            >
              <div className="flex items-start gap-3">
                <span className="mt-0.5 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-muted text-accent">
                  <Megaphone className="h-4 w-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="font-medium leading-snug">
                    {a.title}
                    {a.pinned ? (
                      <Pin className="ml-1.5 inline h-3 w-3 text-accent" />
                    ) : null}
                  </p>
                  {a.body ? (
                    <p className="mt-1 whitespace-pre-wrap text-sm text-muted-foreground">
                      {a.body}
                    </p>
                  ) : null}
                  <p className="mt-1 text-xs text-muted-foreground">
                    {new Date(a.created_at).toLocaleDateString(undefined, {
                      month: "short",
                      day: "numeric",
                    })}
                    {a.expires_at
                      ? ` · expires ${a.expires_at.slice(0, 10)}`
                      : ""}
                  </p>
                </div>
                {canManage ? (
                  <div className="flex shrink-0 gap-1">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => flip(a.id, a.pinned)}
                      disabled={pending}
                      className="h-7 w-7"
                      aria-label={a.pinned ? "Unpin" : "Pin"}
                      title={a.pinned ? "Unpin" : "Pin"}
                    >
                      {a.pinned ? (
                        <PinOff className="h-3.5 w-3.5" />
                      ) : (
                        <Pin className="h-3.5 w-3.5" />
                      )}
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => remove(a.id)}
                      disabled={pending}
                      className="h-7 w-7 text-muted-foreground hover:text-destructive"
                      aria-label="Delete"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function NewAnnouncementDialog() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [pinned, setPinned] = useState(false);
  const [expires, setExpires] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function submit() {
    setError(null);
    if (!title.trim()) {
      setError("Title is required");
      return;
    }
    startTransition(async () => {
      const res = await createAnnouncement({
        title,
        body: body || null,
        pinned,
        expiresAt: expires ? new Date(expires).toISOString() : null,
      });
      if ("error" in res && res.error) {
        setError(res.error);
        return;
      }
      setTitle("");
      setBody("");
      setPinned(false);
      setExpires("");
      setOpen(false);
      router.refresh();
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="accent" size="sm" className="gap-1.5">
          <Plus className="h-4 w-4" /> Announce
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New training announcement</DialogTitle>
          <DialogDescription>
            Shows on /training and the dashboard until it expires (or you remove
            it).
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-2">
            <Label htmlFor="na-title">Title</Label>
            <Input
              id="na-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              autoFocus
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="na-body">Body</Label>
            <Textarea
              id="na-body"
              rows={4}
              value={body}
              onChange={(e) => setBody(e.target.value)}
            />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="na-expires">Expires</Label>
              <Input
                id="na-expires"
                type="date"
                value={expires}
                onChange={(e) => setExpires(e.target.value)}
              />
            </div>
            <label className="flex items-end gap-2 text-sm pb-2">
              <input
                type="checkbox"
                checked={pinned}
                onChange={(e) => setPinned(e.target.checked)}
              />
              Pin to top
            </label>
          </div>
          {error ? (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ) : null}
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button variant="accent" onClick={submit} disabled={pending}>
            {pending ? "Saving…" : "Post"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
