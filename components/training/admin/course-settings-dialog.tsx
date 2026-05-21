"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Settings2, Trash2 } from "lucide-react";

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
  deleteCourse,
  updateCourse,
} from "@/components/training/content-actions";
import { ROLES, ROLE_LABELS } from "@/lib/constants/roles";
import type {
  Role,
  TrainingCategory,
  TrainingCourse,
} from "@/lib/types/database";

interface Props {
  course: TrainingCourse;
  categories: TrainingCategory[];
}

export function CourseSettingsDialog({ course, categories }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState(course.title);
  const [description, setDescription] = useState(course.description ?? "");
  const [categoryId, setCategoryId] = useState(course.category_id ?? "");
  const [estimatedMinutes, setEstimatedMinutes] = useState(
    course.estimated_minutes != null ? String(course.estimated_minutes) : "",
  );
  const [isRequired, setIsRequired] = useState(course.is_required);
  const [requiresSignoff, setRequiresSignoff] = useState(course.requires_signoff);
  const [isActive, setIsActive] = useState(course.is_active);
  const [targetRoles, setTargetRoles] = useState<Role[]>(course.target_roles);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function toggleRole(role: Role) {
    setTargetRoles((prev) =>
      prev.includes(role) ? prev.filter((r) => r !== role) : [...prev, role],
    );
  }

  function submit() {
    setError(null);
    if (!title.trim()) {
      setError("Title is required");
      return;
    }
    startTransition(async () => {
      const res = await updateCourse({
        id: course.id,
        categoryId: categoryId || null,
        title,
        description: description || null,
        estimatedMinutes: estimatedMinutes ? Number(estimatedMinutes) : null,
        isRequired,
        requiresSignoff,
        isActive,
        targetRoles,
      });
      if ("error" in res && res.error) {
        setError(res.error);
        return;
      }
      setOpen(false);
      router.refresh();
    });
  }

  function remove() {
    if (
      !confirm(
        "Delete this course, every lesson inside it, and every quiz attempt? This can't be undone.",
      )
    ) {
      return;
    }
    startTransition(async () => {
      const res = await deleteCourse(course.id);
      if ("error" in res && res.error) {
        setError(res.error);
        return;
      }
      setOpen(false);
      router.push("/training/courses");
      router.refresh();
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1.5">
          <Settings2 className="h-4 w-4" /> Course settings
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Course settings</DialogTitle>
          <DialogDescription>
            Edit metadata, change roles, archive, or delete.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-2">
            <Label htmlFor="cs-title">Title</Label>
            <Input
              id="cs-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="cs-desc">Description</Label>
            <Textarea
              id="cs-desc"
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="cs-cat">Category</Label>
              <select
                id="cs-cat"
                className="flex h-10 w-full rounded-lg border border-input bg-background px-3 text-sm"
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
              >
                <option value="">— None —</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="cs-mins">Est. minutes</Label>
              <Input
                id="cs-mins"
                type="number"
                min="1"
                value={estimatedMinutes}
                onChange={(e) => setEstimatedMinutes(e.target.value)}
              />
            </div>
          </div>
          <div className="flex flex-wrap gap-4 pt-1">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={isRequired}
                onChange={(e) => setIsRequired(e.target.checked)}
              />
              Required
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={requiresSignoff}
                onChange={(e) => setRequiresSignoff(e.target.checked)}
              />
              Manager sign-off required
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
              />
              Active
            </label>
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
          {error ? (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ) : null}
        </div>
        <DialogFooter className="flex-wrap gap-2">
          <Button
            type="button"
            variant="ghost"
            onClick={remove}
            disabled={pending}
            className="mr-auto gap-1.5 text-destructive hover:bg-destructive/10 hover:text-destructive"
          >
            <Trash2 className="h-4 w-4" /> Delete course
          </Button>
          <Button variant="ghost" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button variant="accent" onClick={submit} disabled={pending}>
            {pending ? "Saving…" : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
