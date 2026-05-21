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
  assignPathToStaff,
  autoAssignPathsByStaffType,
} from "@/components/training/actions";
import { TRAINING_STAFF_TYPE_SHORT } from "@/lib/constants/training";
import type {
  TrainingPath,
  TrainingStaff,
} from "@/lib/types/database";

interface AssignPathDialogProps {
  staff: Pick<TrainingStaff, "id" | "full_name" | "staff_type">[];
  paths: TrainingPath[];
}

export function AssignPathDialog({ staff, paths }: AssignPathDialogProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [staffId, setStaffId] = useState<string>("");
  const [pathId, setPathId] = useState<string>("");
  const [dueDate, setDueDate] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [autoFeedback, setAutoFeedback] = useState<string | null>(null);

  function submit() {
    setError(null);
    if (!staffId || !pathId) {
      setError("Pick a person and a path");
      return;
    }
    startTransition(async () => {
      const res = await assignPathToStaff({
        staffId,
        pathId,
        dueDate: dueDate || null,
      });
      if ("error" in res && res.error) {
        setError(res.error);
        return;
      }
      setStaffId("");
      setPathId("");
      setDueDate("");
      setOpen(false);
      router.refresh();
    });
  }

  function runAuto() {
    setError(null);
    setAutoFeedback(null);
    if (!staffId) {
      setError("Pick a person first");
      return;
    }
    const selected = staff.find((s) => s.id === staffId);
    if (!selected) return;
    startTransition(async () => {
      const res = await autoAssignPathsByStaffType({
        staffId: selected.id,
        staffType: selected.staff_type,
      });
      if ("error" in res && res.error) {
        setError(res.error);
        return;
      }
      const added = "added" in res ? (res.added ?? 0) : 0;
      setAutoFeedback(
        added > 0
          ? `Added ${added} type-matched path(s) for ${selected.full_name}.`
          : `No new type-matched paths for ${selected.staff_type}.`,
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
            Pick a person and a path. Or use auto-assign to match by staff type.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-2">
            <Label htmlFor="ap-user">Team member</Label>
            <select
              id="ap-user"
              className="flex h-10 w-full rounded-lg border border-input bg-background px-3 text-sm"
              value={staffId}
              onChange={(e) => setStaffId(e.target.value)}
            >
              <option value="">— Select —</option>
              {staff.map((p) => (
                <option key={p.id} value={p.id}>
                  {`${p.full_name} (${TRAINING_STAFF_TYPE_SHORT[p.staff_type]})`}
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
            disabled={pending || !staffId}
            className="gap-1.5"
          >
            <Sparkles className="h-4 w-4" /> Auto-assign by staff type
          </Button>
          <Button onClick={submit} disabled={pending} variant="accent">
            {pending ? "Saving…" : "Assign"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
