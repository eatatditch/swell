"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Pencil, Plus, Trash2, X } from "lucide-react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  createCategoryAction,
  deleteCategoryAction,
  updateCategoryAction,
} from "@/components/admin/categories/actions";
import type { Category } from "@/lib/types/database";

interface CategoryManagerProps {
  modules: Array<{ slug: string; label: string }>;
  byModule: Record<string, Category[]>;
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 64);
}

export function CategoryManager({ modules, byModule }: CategoryManagerProps) {
  return (
    <div className="space-y-6">
      {modules.map((m) => (
        <ModuleSection
          key={m.slug}
          slug={m.slug}
          label={m.label}
          categories={byModule[m.slug] ?? []}
        />
      ))}
    </div>
  );
}

function ModuleSection({
  slug,
  label,
  categories,
}: {
  slug: string;
  label: string;
  categories: Category[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState("");

  function addCategory() {
    setError(null);
    if (!newName.trim()) return;
    const nextSort = categories.length
      ? Math.max(...categories.map((c) => c.sort_order)) + 10
      : 100;
    startTransition(async () => {
      const res = await createCategoryAction({
        module: slug,
        name: newName.trim(),
        slug: slugify(newName),
        sortOrder: nextSort,
      });
      if ("error" in res) {
        setError(res.error);
        return;
      }
      setNewName("");
      setAdding(false);
      router.refresh();
    });
  }

  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <h3 className="text-sm font-semibold capitalize text-muted-foreground">
          {label}
        </h3>
        {adding ? null : (
          <Button
            variant="ghost"
            size="sm"
            className="h-7 gap-1.5 text-xs"
            onClick={() => setAdding(true)}
          >
            <Plus className="h-3.5 w-3.5" />
            Add
          </Button>
        )}
      </div>

      {error ? (
        <Alert variant="destructive" className="mb-2">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      {adding ? (
        <div className="mb-2 flex items-center gap-2 rounded-md border bg-muted/30 px-3 py-2">
          <Input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Category name"
            disabled={pending}
            autoFocus
            onKeyDown={(e) => {
              if (e.key === "Enter") addCategory();
              if (e.key === "Escape") {
                setAdding(false);
                setNewName("");
              }
            }}
          />
          <Button
            size="sm"
            onClick={addCategory}
            disabled={pending || !newName.trim()}
          >
            Add
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              setAdding(false);
              setNewName("");
            }}
            disabled={pending}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      ) : null}

      {categories.length === 0 ? (
        <p className="text-xs italic text-muted-foreground">
          No categories yet.
        </p>
      ) : (
        <div className="divide-y rounded-md border">
          {categories.map((c) => (
            <CategoryRow key={c.id} category={c} />
          ))}
        </div>
      )}
    </div>
  );
}

function CategoryRow({ category }: { category: Category }) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState(category.name);
  const [sortOrder, setSortOrder] = useState(String(category.sort_order));

  function save() {
    setError(null);
    if (!name.trim()) {
      setError("Name is required");
      return;
    }
    const sortVal = Number.parseInt(sortOrder, 10);
    if (Number.isNaN(sortVal)) {
      setError("Sort must be a number");
      return;
    }
    startTransition(async () => {
      const res = await updateCategoryAction(category.id, {
        name: name.trim(),
        sortOrder: sortVal,
      });
      if ("error" in res) {
        setError(res.error);
        return;
      }
      setEditing(false);
      router.refresh();
    });
  }

  function remove() {
    if (!confirm(`Delete "${category.name}"?`)) return;
    startTransition(async () => {
      const res = await deleteCategoryAction(category.id);
      if ("error" in res) {
        alert(res.error);
        return;
      }
      router.refresh();
    });
  }

  if (editing) {
    return (
      <div className="space-y-2 px-3 py-2">
        {error ? <p className="text-xs text-destructive">{error}</p> : null}
        <div className="flex items-center gap-2">
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            disabled={pending}
            className="flex-1"
          />
          <Input
            type="number"
            value={sortOrder}
            onChange={(e) => setSortOrder(e.target.value)}
            disabled={pending}
            className="w-20"
          />
          <Button size="sm" onClick={save} disabled={pending}>
            Save
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              setEditing(false);
              setName(category.name);
              setSortOrder(String(category.sort_order));
            }}
            disabled={pending}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-between px-3 py-2">
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm">{category.name}</p>
        <p className="truncate text-xs text-muted-foreground">
          {category.slug} · sort {category.sort_order}
        </p>
      </div>
      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="sm"
          className="h-7 w-7 p-0"
          onClick={() => setEditing(true)}
          aria-label="Edit"
        >
          <Pencil className="h-3.5 w-3.5" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="h-7 w-7 p-0 text-destructive hover:text-destructive"
          onClick={remove}
          disabled={pending}
          aria-label="Delete"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}
