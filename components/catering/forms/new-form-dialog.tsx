"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createLeadForm } from "@/components/catering/forms/actions";
import {
  SOURCE_CHANNEL_LABELS,
  SOURCE_CHANNEL_ORDER,
} from "@/lib/forms/schema";
import type { FormSourceChannel, Location } from "@/lib/types/database";

interface NewFormProps {
  locations: Pick<Location, "id" | "name" | "slug">[];
}

export function NewFormPanel({ locations }: NewFormProps) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [locationId, setLocationId] = useState(locations[0]?.id ?? "");
  const [slug, setSlug] = useState("");
  const [sourceChannel, setSourceChannel] =
    useState<FormSourceChannel>("website");
  const [sourceLabel, setSourceLabel] = useState("");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function submit() {
    setError(null);
    startTransition(async () => {
      const res = await createLeadForm({
        name: name.trim(),
        locationId,
        slug: slug.trim() || null,
        sourceChannel,
        sourceLabel: sourceLabel.trim() || null,
      });
      if ("error" in res && res.error) {
        setError(res.error);
        return;
      }
      if ("form" in res && res.form) {
        router.push(`/catering/forms/${res.form.id}`);
      }
    });
  }

  return (
    <div className="space-y-4 rounded-2xl border border-border bg-card p-6 shadow-sm">
      <h2 className="font-display text-xl font-bold">Create a new form</h2>

      <div className="space-y-1.5">
        <Label htmlFor="new-form-name">Form name</Label>
        <Input
          id="new-form-name"
          value={name}
          placeholder="Wedding inquiry"
          onChange={(e) => setName(e.target.value)}
          disabled={pending}
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="new-form-slug">URL slug (optional)</Label>
        <Input
          id="new-form-slug"
          value={slug}
          placeholder="leave blank to auto-generate"
          onChange={(e) => setSlug(e.target.value)}
          disabled={pending}
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="new-form-loc">Location</Label>
        <select
          id="new-form-loc"
          value={locationId}
          onChange={(e) => setLocationId(e.target.value)}
          disabled={pending}
          className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
        >
          {locations.map((l) => (
            <option key={l.id} value={l.id}>
              {l.name}
            </option>
          ))}
        </select>
        <p className="text-[11px] text-muted-foreground">
          Submissions create leads filed against this location.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="new-form-channel">Channel</Label>
          <select
            id="new-form-channel"
            value={sourceChannel}
            onChange={(e) =>
              setSourceChannel(e.target.value as FormSourceChannel)
            }
            disabled={pending}
            className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
          >
            {SOURCE_CHANNEL_ORDER.map((c) => (
              <option key={c} value={c}>
                {SOURCE_CHANNEL_LABELS[c]}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="new-form-label">Attribution label</Label>
          <Input
            id="new-form-label"
            value={sourceLabel}
            placeholder="Spring IG ad, Patio QR, …"
            onChange={(e) => setSourceLabel(e.target.value)}
            disabled={pending}
          />
        </div>
      </div>
      <p className="text-[11px] text-muted-foreground">
        Channel + label get stamped on every lead this form creates so you can
        track which marketing point each inquiry came from.
      </p>

      {error ? (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      <Button
        type="button"
        variant="accent"
        onClick={submit}
        disabled={pending || !name.trim() || !locationId}
      >
        {pending ? "Creating…" : "Create form"}
      </Button>
    </div>
  );
}
