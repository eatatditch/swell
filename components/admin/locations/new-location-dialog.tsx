"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
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
import { createLocationAction } from "@/components/admin/locations/actions";

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 64);
}

export function NewLocationDialog() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);
  const [sortOrder, setSortOrder] = useState("100");

  function onNameChange(value: string) {
    setName(value);
    if (!slugTouched) setSlug(slugify(value));
  }

  function submit() {
    setError(null);
    const sortVal = Number.parseInt(sortOrder, 10);
    if (Number.isNaN(sortVal) || sortVal < 0) {
      setError("Sort order must be a positive number");
      return;
    }
    startTransition(async () => {
      const res = await createLocationAction({
        name: name.trim(),
        slug: slug.trim(),
        sortOrder: sortVal,
      });
      if ("error" in res) {
        setError(res.error);
        return;
      }
      setOpen(false);
      setName("");
      setSlug("");
      setSlugTouched(false);
      setSortOrder("100");
      router.refresh();
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-1.5">
          <Plus className="h-4 w-4" />
          Add location
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add a location</DialogTitle>
          <DialogDescription>
            Locations show up in pickers, lead routing, and the location
            switcher.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          {error ? (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ) : null}

          <div className="space-y-2">
            <Label htmlFor="nl-name">Display name</Label>
            <Input
              id="nl-name"
              value={name}
              onChange={(e) => onNameChange(e.target.value)}
              placeholder="Patchogue"
              autoFocus
              disabled={pending}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="nl-slug">Slug</Label>
            <Input
              id="nl-slug"
              value={slug}
              onChange={(e) => {
                setSlugTouched(true);
                setSlug(slugify(e.target.value));
              }}
              placeholder="patchogue"
              disabled={pending}
            />
            <p className="text-xs text-muted-foreground">
              Internal id. Lowercase letters, numbers, dashes, underscores.
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="nl-sort">Sort order</Label>
            <Input
              id="nl-sort"
              type="number"
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value)}
              disabled={pending}
            />
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => setOpen(false)}
            disabled={pending}
          >
            Cancel
          </Button>
          <Button onClick={submit} disabled={pending || !name.trim() || !slug}>
            {pending ? "Creating…" : "Create location"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
