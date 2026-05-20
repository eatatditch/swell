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
import { createMaintenanceIssue } from "@/components/daily-ops/issues/actions";
import { PRIORITIES, PRIORITY_LABELS } from "@/lib/constants/tasks";
import type { Priority } from "@/lib/types/database";

interface NewIssueDialogProps {
  locationId: string;
}

export function NewIssueDialog({ locationId }: NewIssueDialogProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<Priority>("normal");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function submit() {
    setError(null);
    if (!title.trim()) {
      setError("Title is required");
      return;
    }
    startTransition(async () => {
      const res = await createMaintenanceIssue({
        locationId,
        title,
        description: description || null,
        priority,
      });
      if ("error" in res && res.error) {
        setError(res.error);
        return;
      }
      setTitle("");
      setDescription("");
      setPriority("normal");
      setOpen(false);
      router.refresh();
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="accent" size="sm" className="gap-1.5">
          <Plus className="h-4 w-4" />
          New issue
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New maintenance issue</DialogTitle>
          <DialogDescription>
            Equipment, building, or anything in disrepair.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="ni-title">Title</Label>
            <Input
              id="ni-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              autoFocus
              placeholder="e.g. Walk-in freezer fan is grinding"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="ni-desc">Description</Label>
            <Textarea
              id="ni-desc"
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Details, location of the issue, anything tried."
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="ni-prio">Priority</Label>
            <select
              id="ni-prio"
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
            {pending ? "Saving…" : "Create issue"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
