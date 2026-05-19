"use client";

import { useState, useTransition } from "react";
import { Check, ChevronsUpDown, MapPin } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { setActiveLocation } from "@/app/(app)/actions";
import type { Location } from "@/lib/types/database";

interface LocationSwitcherProps {
  locations: Location[];
  activeLocationId: string | null;
}

const ALL = "all";

export function LocationSwitcher({
  locations,
  activeLocationId,
}: LocationSwitcherProps) {
  const [pending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);

  if (locations.length === 0) {
    return (
      <div className="hidden items-center gap-2 rounded-md border bg-muted px-3 py-1.5 text-xs text-muted-foreground sm:flex">
        <MapPin className="h-3.5 w-3.5" />
        No locations assigned
      </div>
    );
  }

  const showsAll = locations.length > 1;
  const activeLabel = activeLocationId
    ? (locations.find((l) => l.id === activeLocationId)?.name ?? "All locations")
    : "All locations";

  function choose(value: string) {
    startTransition(async () => {
      await setActiveLocation(value === ALL ? null : value);
      setOpen(false);
    });
  }

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          disabled={pending}
          className="gap-2"
        >
          <MapPin className="h-4 w-4" />
          <span className="max-w-[10rem] truncate">{activeLabel}</span>
          <ChevronsUpDown className="h-3.5 w-3.5 text-muted-foreground" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>Location</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {showsAll ? (
          <DropdownMenuItem onSelect={() => choose(ALL)}>
            <Check
              className={cn(
                "mr-2 h-4 w-4",
                activeLocationId ? "opacity-0" : "opacity-100",
              )}
            />
            All locations
          </DropdownMenuItem>
        ) : null}
        {locations.map((loc) => (
          <DropdownMenuItem key={loc.id} onSelect={() => choose(loc.id)}>
            <Check
              className={cn(
                "mr-2 h-4 w-4",
                activeLocationId === loc.id ? "opacity-100" : "opacity-0",
              )}
            />
            {loc.name}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
