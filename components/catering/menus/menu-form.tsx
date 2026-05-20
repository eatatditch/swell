"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { createMenu, updateMenu } from "@/components/catering/menus/actions";
import {
  SERVICE_TYPES,
  SERVICE_TYPE_LABELS,
} from "@/lib/constants/catering";
import type {
  CateringMenu,
  CateringServiceType,
  Location,
} from "@/lib/types/database";

interface MenuFormProps {
  locations: Location[];
  menu?: CateringMenu;
  defaultLocationId?: string | null;
}

export function MenuForm({ locations, menu, defaultLocationId }: MenuFormProps) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const [name, setName] = useState(menu?.name ?? "");
  const [description, setDescription] = useState(menu?.description ?? "");
  const [serviceType, setServiceType] = useState<CateringServiceType>(
    menu?.default_service_type ?? "buffet",
  );
  const [locationId, setLocationId] = useState<string>(
    menu?.location_id ?? defaultLocationId ?? "",
  );

  function submit() {
    setError(null);
    if (!name.trim()) {
      setError("Name is required");
      return;
    }
    startTransition(async () => {
      const payload = {
        name: name.trim(),
        description: description || null,
        defaultServiceType: serviceType,
        locationId: locationId || null,
      };
      const res = menu
        ? await updateMenu({ id: menu.id, ...payload })
        : await createMenu(payload);
      if ("error" in res && res.error) {
        setError(res.error);
        return;
      }
      const id = (res as { menu?: { id: string } }).menu?.id ?? menu?.id;
      router.push(`/catering/menus/${id}`);
      router.refresh();
    });
  }

  return (
    <div className="space-y-4 rounded-2xl border bg-card p-6">
      <div className="space-y-2">
        <Label htmlFor="mf-name">Menu name *</Label>
        <Input
          id="mf-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Summer wedding buffet"
          autoFocus
          disabled={pending}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="mf-desc">Description</Label>
        <Textarea
          id="mf-desc"
          rows={3}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Optional context — who this menu is for, what's included."
          disabled={pending}
        />
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="mf-svc">Default service type</Label>
          <select
            id="mf-svc"
            className="flex h-10 w-full rounded-lg border border-input bg-background px-3 text-sm"
            value={serviceType}
            onChange={(e) => setServiceType(e.target.value as CateringServiceType)}
            disabled={pending}
          >
            {SERVICE_TYPES.map((s) => (
              <option key={s} value={s}>
                {SERVICE_TYPE_LABELS[s]}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="mf-loc">Location</Label>
          <select
            id="mf-loc"
            className="flex h-10 w-full rounded-lg border border-input bg-background px-3 text-sm"
            value={locationId}
            onChange={(e) => setLocationId(e.target.value)}
            disabled={pending}
          >
            <option value="">All locations</option>
            {locations
              .filter((l) => l.slug !== "company_wide")
              .map((l) => (
                <option key={l.id} value={l.id}>
                  {l.name}
                </option>
              ))}
          </select>
        </div>
      </div>

      {error ? (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      <div className="flex flex-wrap items-center justify-end gap-2">
        <Button
          type="button"
          variant="ghost"
          onClick={() => router.back()}
          disabled={pending}
        >
          Cancel
        </Button>
        <Button
          type="button"
          variant="accent"
          onClick={submit}
          disabled={pending || !name.trim()}
        >
          {pending ? "Saving…" : menu ? "Save changes" : "Create menu"}
        </Button>
      </div>
    </div>
  );
}
