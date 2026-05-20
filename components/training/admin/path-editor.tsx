"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2 } from "lucide-react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import {
  addCourseToPath,
  createPath,
  deletePath,
  removeCourseFromPath,
} from "@/components/training/content-actions";
import { ROLES, ROLE_LABELS } from "@/lib/constants/roles";
import type {
  Role,
  TrainingCourse,
  TrainingPath,
  TrainingPathCourse,
} from "@/lib/types/database";

interface PathEditorProps {
  paths: (TrainingPath & {
    path_courses: (TrainingPathCourse & { course: TrainingCourse })[];
  })[];
  courses: TrainingCourse[];
}

export function PathEditor({ paths, courses }: PathEditorProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function remove(id: string) {
    if (!confirm("Delete this path? Anyone assigned to it loses the assignment."))
      return;
    startTransition(async () => {
      await deletePath(id);
      router.refresh();
    });
  }

  function unlink(linkId: string) {
    startTransition(async () => {
      await removeCourseFromPath(linkId);
      router.refresh();
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">
          {paths.length} path{paths.length === 1 ? "" : "s"}
        </p>
        <NewPathDialog />
      </div>

      {paths.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Paths are sequences of courses you assign to people. Start by creating one.
        </p>
      ) : (
        <ul className="space-y-3">
          {paths.map((p) => (
            <li key={p.id} className="rounded-lg border bg-card p-4">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-medium">{p.name}</p>
                  {p.description ? (
                    <p className="text-sm text-muted-foreground">
                      {p.description}
                    </p>
                  ) : null}
                  <p className="mt-1 text-xs text-muted-foreground">
                    For:{" "}
                    {p.target_roles.length === 0
                      ? "anyone"
                      : p.target_roles
                          .map((r) => ROLE_LABELS[r as Role] ?? r)
                          .join(", ")}{" "}
                    · {p.course_interval_days}d between courses
                  </p>
                </div>
                <div className="flex gap-1">
                  <AddCourseToPathButton
                    pathId={p.id}
                    nextPosition={
                      (p.path_courses[p.path_courses.length - 1]?.position ??
                        0) + 10
                    }
                    courses={courses.filter(
                      (c) =>
                        !p.path_courses.some((pc) => pc.course_id === c.id),
                    )}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => remove(p.id)}
                    disabled={pending}
                    className="h-7 w-7 text-muted-foreground hover:text-destructive"
                    aria-label="Delete path"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>

              {p.path_courses.length === 0 ? (
                <p className="mt-3 text-xs text-muted-foreground">
                  No courses yet. Add the first one.
                </p>
              ) : (
                <ol className="mt-3 space-y-1.5">
                  {p.path_courses
                    .sort((a, b) => a.position - b.position)
                    .map((pc, i) => (
                      <li
                        key={pc.id}
                        className="flex items-center gap-2 rounded-md bg-muted/40 px-2 py-1.5 text-sm"
                      >
                        <span className="font-mono text-xs text-muted-foreground">
                          {String(i + 1).padStart(2, "0")}
                        </span>
                        <span className="flex-1 truncate">{pc.course.title}</span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => unlink(pc.id)}
                          disabled={pending}
                          className="h-6 w-6 text-muted-foreground hover:text-destructive"
                          aria-label="Remove course"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </li>
                    ))}
                </ol>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function NewPathDialog() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [targetRoles, setTargetRoles] = useState<Role[]>([]);
  const [courseIntervalDays, setCourseIntervalDays] = useState("7");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function toggleRole(role: Role) {
    setTargetRoles((prev) =>
      prev.includes(role) ? prev.filter((r) => r !== role) : [...prev, role],
    );
  }

  function submit() {
    setError(null);
    if (!name.trim()) {
      setError("Name is required");
      return;
    }
    startTransition(async () => {
      const res = await createPath({
        name,
        description: description || null,
        targetRoles,
        targetDepartment: null,
        courseIntervalDays: Number(courseIntervalDays) || 7,
      });
      if ("error" in res && res.error) {
        setError(res.error);
        return;
      }
      setName("");
      setDescription("");
      setTargetRoles([]);
      setCourseIntervalDays("7");
      setOpen(false);
      router.refresh();
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="accent" size="sm" className="gap-1.5">
          <Plus className="h-4 w-4" /> New path
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New training path</DialogTitle>
          <DialogDescription>
            A path is a sequence of courses. Pick target roles so it can auto-assign.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-2">
            <Label htmlFor="path-name">Name</Label>
            <Input
              id="path-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
              placeholder="e.g. New Server Onboarding"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="path-desc">Description</Label>
            <Textarea
              id="path-desc"
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>Target roles</Label>
            <div className="flex flex-wrap gap-1.5">
              {ROLES.map((r) => {
                const active = targetRoles.includes(r);
                return (
                  <button
                    key={r}
                    type="button"
                    onClick={() => toggleRole(r)}
                    className={
                      active
                        ? "rounded-full bg-accent px-3 py-1 text-xs font-semibold text-accent-foreground"
                        : "rounded-full border border-input px-3 py-1 text-xs text-muted-foreground hover:text-foreground"
                    }
                  >
                    {ROLE_LABELS[r]}
                  </button>
                );
              })}
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="path-interval">Days between courses</Label>
            <Input
              id="path-interval"
              type="number"
              min="1"
              value={courseIntervalDays}
              onChange={(e) => setCourseIntervalDays(e.target.value)}
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
            {pending ? "Saving…" : "Create path"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function AddCourseToPathButton({
  pathId,
  nextPosition,
  courses,
}: {
  pathId: string;
  nextPosition: number;
  courses: TrainingCourse[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [courseId, setCourseId] = useState<string>("");
  const [pending, startTransition] = useTransition();

  function submit() {
    if (!courseId) return;
    startTransition(async () => {
      await addCourseToPath({
        pathId,
        courseId,
        position: nextPosition,
        isRequired: true,
      });
      setCourseId("");
      setOpen(false);
      router.refresh();
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          disabled={courses.length === 0}
          className="h-7 w-7"
          aria-label="Add course to path"
        >
          <Plus className="h-3.5 w-3.5" />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add course to path</DialogTitle>
        </DialogHeader>
        <div className="space-y-2">
          <Label htmlFor="apc-course">Course</Label>
          <select
            id="apc-course"
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
        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={pending || !courseId} variant="accent">
            {pending ? "Adding…" : "Add"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
