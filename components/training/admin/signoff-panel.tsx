"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Stamp } from "lucide-react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { signOffCourse } from "@/components/training/actions";
import type { ProfileLite, TrainingCourse } from "@/lib/types/database";

interface SignoffPanelProps {
  staff: ProfileLite[];
  courses: TrainingCourse[];
}

export function SignoffPanel({ staff, courses }: SignoffPanelProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [userId, setUserId] = useState("");
  const [courseId, setCourseId] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function submit() {
    setError(null);
    if (!userId || !courseId) {
      setError("Pick a person and a course");
      return;
    }
    startTransition(async () => {
      const res = await signOffCourse({
        userId,
        courseId,
        notes: notes || null,
      });
      if ("error" in res && res.error) {
        setError(res.error);
        return;
      }
      setUserId("");
      setCourseId("");
      setNotes("");
      setOpen(false);
      router.refresh();
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1.5">
          <Stamp className="h-4 w-4" /> Sign off
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-primary" />
            Manager sign-off
          </DialogTitle>
          <DialogDescription>
            Record that you watched them do it. Stamp the course, optionally
            with notes.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-2">
            <Label htmlFor="so-user">Team member</Label>
            <select
              id="so-user"
              className="flex h-10 w-full rounded-lg border border-input bg-background px-3 text-sm"
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
            >
              <option value="">— Select —</option>
              {staff.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.full_name ?? p.email ?? "(no name)"}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="so-course">Course</Label>
            <select
              id="so-course"
              className="flex h-10 w-full rounded-lg border border-input bg-background px-3 text-sm"
              value={courseId}
              onChange={(e) => setCourseId(e.target.value)}
            >
              <option value="">— Select —</option>
              {courses.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.title}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="so-notes">Notes</Label>
            <Textarea
              id="so-notes"
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Optional — what you observed."
            />
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
            {pending ? "Stamping…" : "Sign off"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
