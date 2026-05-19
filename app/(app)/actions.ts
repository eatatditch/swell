"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";

import { ACTIVE_LOCATION_COOKIE } from "@/app/(app)/constants";

export async function setActiveLocation(locationId: string | null) {
  const cookieStore = cookies();
  if (locationId) {
    cookieStore.set({
      name: ACTIVE_LOCATION_COOKIE,
      value: locationId,
      httpOnly: false,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 365,
    });
  } else {
    cookieStore.delete(ACTIVE_LOCATION_COOKIE);
  }
  revalidatePath("/", "layout");
}
