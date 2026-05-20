"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, Sparkles } from "lucide-react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  assignPathToUser,
  autoAssignPathsByRole,
} from "@/components/training/actions";
import type {
  ProfileLite,
  Role,
  TrainingPath,
} from "@/lib/types/database";

interface AssignPathDialogProps {
  staff: (ProfileLite & { role: Role })[];
  paths: TrainingPath[];
}

export function AssignPathDialog({ staff, paths }: AssignPathDialogProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [userId, setUserId] = useState<string>("");
  const [pathId, setPathId] = useState<string>("");
  const [dueDate, setDueDate] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [autoFeedback, setAutoFeedback] = useState<string | null>(null);

  function submit() {
    setError(null);
    if (!userId || !pathId) {
      setError("Pick a person and a path");
      return;
    }
    startTransition(async () => {
      const res = await assignPathToUser({
        userId,
        pathId,
        dueDate: dueDate || null,
      });
      if ("error" in res && res.error) {
        setError(res.error);
        return;
      }
      setUserId("");
      setPathId("");
      setDueDate("");
      setOpen(false);
      router.refresh();
    });
  }

  function runAuto() {
    setError(null);
    setAutoFeedback(null);
    if (!userId) {
      setError("Pick a person first");
      return;
    }
    const user = staff.find((s) => s.id === userId);
    if (!user) return;
    startTransition(async () => {
      const res = await autoAssignPathsByRole({ userId, role: user.role });
      if ("error" in res && res.error) {
        setError(res.error);
        return;
      }
      const added = "added" in res ? (res.added ?? 0) : 0;
      setAutoFeedback(
        added > 0
          ? `Added ${added} role-matched path(s) for ${user.full_name ?? user.email}.`
          : `No new role-matched paths for ${user.role}.`,
      );
      router.refresh();
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="accent" size="sm" className="gap-1.5">
          <Plus className="h-4 w-4" /> Assign path
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Assign training path</DialogTitle>
          <DialogDescription>
            Pick a person and a path. Or use auto-assign to match by role.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-2">
            <Label htmlFor="ap-user">Team member</Label>
            <select
              id="ap-user"
              className="flex h-10 w-full rounded-lg border border-input bg-background px-3 text-sm"
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
            >
              <option value="">— Select —</option>
              {staff.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.full_name ?? p.email ?? "(no name)"} · {p.role}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="ap-path">Path</Label>
            <select
              id="ap-path"
              className="flex h-10 w-full rounded-lg border border-input bg-background px-3 text-sm"
              value={pathId}
              onChange={(e) => setPathId(e.target.value)}
            >
              <option value="">— Select —</option>
              {paths.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="ap-due">Due date (optional)</Label>
            <Input
              id="ap-due"
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
            />
          </div>
          {error ? (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ) : null}
          {autoFeedback ? (
            <Alert>
              <AlertDescription>{autoFeedback}</AlertDescription>
            </Alert>
          ) : null}
        </div>
        <DialogFooter className="flex-wrap gap-2">
          <Button
            type="button"
            variant="ghost"
            onClick={() => setOpen(false)}
            disabled={pending}
          >
            Close
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={runAuto}
            disabled={pending || !userId}
            className="gap-1.5"
          >
            <Sparkles className="h-4 w-4" /> Auto-assign by role
          </Button>
          <Button onClick={submit} disabled={pending} variant="accent">
            {pending ? "Saving…" : "Assign"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
