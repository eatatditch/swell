"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Check, Pencil, X } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { updateLocationAction } from "@/components/admin/locations/actions";
import type { Location } from "@/lib/types/database";

interface LocationRowProps {
  location: Location;
}

export function LocationRow({ location }: LocationRowProps) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState(location.name);
  const [sortOrder, setSortOrder] = useState(String(location.sort_order));
  const [isActive, setIsActive] = useState(location.is_active);

  function save() {
    setError(null);
    if (!name.trim()) {
      setError("Name is required");
      return;
    }
    const sortVal = Number.parseInt(sortOrder, 10);
    if (Number.isNaN(sortVal) || sortVal < 0) {
      setError("Sort order must be a positive number");
      return;
    }
    startTransition(async () => {
      const res = await updateLocationAction(location.id, {
        name: name.trim(),
        sortOrder: sortVal,
        isActive,
      });
      if ("error" in res) {
        setError(res.error);
        return;
      }
      setEditing(false);
      router.refresh();
    });
  }

  function cancel() {
    setName(location.name);
    setSortOrder(String(location.sort_order));
    setIsActive(location.is_active);
    setError(null);
    setEditing(false);
  }

  if (editing) {
    return (
      <div className="space-y-3 px-4 py-3">
        {error ? <p className="text-xs text-destructive">{error}</p> : null}
        <div className="grid gap-3 sm:grid-cols-[2fr,1fr,1fr,auto]">
          <div className="space-y-1.5">
            <Label htmlFor={`lr-name-${location.id}`} className="text-xs">
              Name
            </Label>
            <Input
              id={`lr-name-${location.id}`}
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={pending}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor={`lr-sort-${location.id}`} className="text-xs">
              Sort
            </Label>
            <Input
              id={`lr-sort-${location.id}`}
              type="number"
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value)}
              disabled={pending}
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Status</Label>
            <label className="flex h-10 items-center gap-2 rounded-lg border px-3 text-sm">
              <input
                type="checkbox"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
                disabled={pending || location.slug === "company_wide"}
                className="h-4 w-4"
              />
              <span>Active</span>
            </label>
          </div>
          <div className="flex items-end gap-1.5">
            <Button
              size="sm"
              variant="outline"
              onClick={cancel}
              disabled={pending}
              aria-label="Cancel"
            >
              <X className="h-4 w-4" />
            </Button>
            <Button
              size="sm"
              onClick={save}
              disabled={pending}
              aria-label="Save"
            >
              <Check className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-between px-4 py-3">
      <div className="min-w-0">
        <p className="truncate text-sm font-medium">{location.name}</p>
        <p className="truncate text-xs text-muted-foreground">
          {location.slug} · sort {location.sort_order}
        </p>
      </div>
      <div className="flex items-center gap-2">
        <Badge variant={location.is_active ? "secondary" : "outline"}>
          {location.is_active ? "Active" : "Inactive"}
        </Badge>
        <Button
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0"
          onClick={() => setEditing(true)}
          aria-label="Edit"
        >
          <Pencil className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
