import "server-only";

import { cookies } from "next/headers";

import { ACTIVE_LOCATION_COOKIE } from "@/app/(app)/constants";
import type { Location } from "@/lib/types/database";

/**
 * Resolve the active location for a server page. Mirrors the layout's logic:
 * fall back to the single assigned location if exactly one, otherwise null
 * (meaning "all locations" for users who can see more).
 */
export function resolveActiveLocation(
  locations: Location[],
): Location | null {
  const cookieStore = cookies();
  const stored = cookieStore.get(ACTIVE_LOCATION_COOKIE)?.value ?? null;
  if (stored) {
    const match = locations.find((l) => l.id === stored);
    if (match) return match;
  }
  if (locations.length === 1) return locations[0];
  return null;
}
