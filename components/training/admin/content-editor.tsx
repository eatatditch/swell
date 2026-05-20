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
  createCategory,
  createCourse,
  deleteCategory,
} from "@/components/training/content-actions";
import { ROLES, ROLE_LABELS } from "@/lib/constants/roles";
import type { Role, TrainingCategory } from "@/lib/types/database";

interface ContentEditorProps {
  categories: TrainingCategory[];
}

export function ContentEditor({ categories }: ContentEditorProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function removeCategory(id: string) {
    if (!confirm("Delete this category? Courses are kept but become uncategorized."))
      return;
    startTransition(async () => {
      await deleteCategory(id);
      router.refresh();
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">
          {categories.length} categor{categories.length === 1 ? "y" : "ies"}
        </p>
        <div className="flex gap-2">
          <NewCategoryDialog />
          <NewCourseDialog categories={categories} />
        </div>
      </div>

      {categories.length > 0 ? (
        <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {categories.map((cat) => (
            <li
              key={cat.id}
              className="flex items-start justify-between gap-2 rounded-lg border bg-card p-3"
            >
              <div className="min-w-0">
                <p className="truncate font-medium">{cat.name}</p>
                {cat.description ? (
                  <p className="line-clamp-2 text-xs text-muted-foreground">
                    {cat.description}
                  </p>
                ) : null}
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => removeCategory(cat.id)}
                disabled={pending}
                className="h-7 w-7 text-muted-foreground hover:text-destructive"
                aria-label="Delete category"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

function NewCategoryDialog() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function submit() {
    setError(null);
    startTransition(async () => {
      const res = await createCategory({
        name,
        description: description || null,
        sortOrder: 0,
      });
      if ("error" in res && res.error) {
        setError(res.error);
        return;
      }
      setName("");
      setDescription("");
      setOpen(false);
      router.refresh();
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1.5">
          <Plus className="h-4 w-4" /> Category
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New training category</DialogTitle>
          <DialogDescription>
            A bucket for related courses (e.g. Brand & Culture, Server Training).
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-2">
            <Label htmlFor="cat-name">Name</Label>
            <Input
              id="cat-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="cat-desc">Description</Label>
            <Textarea
              id="cat-desc"
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
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
          <Button
            onClick={submit}
            disabled={pending || !name.trim()}
            variant="accent"
          >
            {pending ? "Saving…" : "Create category"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function NewCourseDialog({ categories }: { categories: TrainingCategory[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [categoryId, setCategoryId] = useState<string>("");
  const [estimatedMinutes, setEstimatedMinutes] = useState<string>("");
  const [isRequired, setIsRequired] = useState(false);
  const [requiresSignoff, setRequiresSignoff] = useState(false);
  const [targetRoles, setTargetRoles] = useState<Role[]>([]);
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
      const res = await createCourse({
        categoryId: categoryId || null,
        title,
        description: description || null,
        estimatedMinutes: estimatedMinutes ? Number(estimatedMinutes) : null,
        isRequired,
        requiresSignoff,
        sortOrder: 0,
        tags: [],
        targetRoles,
      });
      if ("error" in res && res.error) {
        setError(res.error);
        return;
      }
      setTitle("");
      setDescription("");
      setCategoryId("");
      setEstimatedMinutes("");
      setIsRequired(false);
      setRequiresSignoff(false);
      setTargetRoles([]);
      setOpen(false);
      router.refresh();
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="accent" size="sm" className="gap-1.5">
          <Plus className="h-4 w-4" /> Course
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New course</DialogTitle>
          <DialogDescription>
            A course holds lessons. After creating it, open the course to add lessons + quiz.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-2">
            <Label htmlFor="course-title">Title</Label>
            <Input
              id="course-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              autoFocus
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="course-desc">Description</Label>
            <Textarea
              id="course-desc"
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="course-cat">Category</Label>
              <select
                id="course-cat"
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
              <Label htmlFor="course-mins">Est. minutes</Label>
              <Input
                id="course-mins"
                type="number"
                min="1"
                max="1440"
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
        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={pending} variant="accent">
            {pending ? "Saving…" : "Create course"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
