"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";

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
import { createPriority } from "@/components/founder/priorities/actions";
import { PRIORITIES, PRIORITY_LABELS } from "@/lib/constants/tasks";
import type { Priority, ProfileLite } from "@/lib/types/database";

interface PriorityFormDialogProps {
  staff: ProfileLite[];
}

export function PriorityFormDialog({ staff }: PriorityFormDialogProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [ownerId, setOwnerId] = useState<string>("");
  const [priority, setPriority] = useState<Priority>("normal");
  const [targetDate, setTargetDate] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function reset() {
    setTitle("");
    setDescription("");
    setOwnerId("");
    setPriority("normal");
    setTargetDate("");
    setError(null);
  }

  function submit() {
    setError(null);
    if (!title.trim()) {
      setError("Title is required");
      return;
    }
    startTransition(async () => {
      const res = await createPriority({
        title,
        description: description || null,
        ownerId: ownerId || null,
        priority,
        targetDate: targetDate || null,
      });
      if ("error" in res && res.error) {
        setError(res.error);
        return;
      }
      reset();
      setOpen(false);
      router.refresh();
    });
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) reset();
        setOpen(v);
      }}
    >
      <DialogTrigger asChild>
        <Button variant="accent" size="sm" className="gap-1.5">
          <Plus className="h-4 w-4" />
          New priority
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New strategic priority</DialogTitle>
          <DialogDescription>
            Something that matters this quarter. Assign an owner.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="fp-title">Title</Label>
            <Input
              id="fp-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              autoFocus
              placeholder="e.g. Hit $1M annualized catering by Q4"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="fp-desc">Why it matters</Label>
            <Textarea
              id="fp-desc"
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Context, target, how we'll know we got there."
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="fp-owner">Owner</Label>
              <select
                id="fp-owner"
                className="flex h-10 w-full rounded-lg border border-input bg-background px-3 text-sm"
                value={ownerId}
                onChange={(e) => setOwnerId(e.target.value)}
              >
                <option value="">— Unassigned —</option>
                {staff.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.full_name ?? p.email ?? "(no name)"}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="fp-prio">Priority</Label>
              <select
                id="fp-prio"
                className="flex h-10 w-full rounded-lg border border-input bg-background px-3 text-sm"
                value={priority}
                onChange={(e) => setPriority(e.target.value as Priority)}
              >
                {PRIORITIES.map((p) => (
                  <option key={p} value={p}>
                    {PRIORITY_LABELS[p]}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="fp-date">Target date</Label>
            <Input
              id="fp-date"
              type="date"
              value={targetDate}
              onChange={(e) => setTargetDate(e.target.value)}
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
            variant="accent"
            onClick={submit}
            disabled={pending || !title.trim()}
          >
            {pending ? "Saving…" : "Create priority"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
