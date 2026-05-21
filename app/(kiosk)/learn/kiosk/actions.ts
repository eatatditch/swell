"use server";

import { redirect } from "next/navigation";
import { z } from "zod";

import {
  clearKioskCookie,
  setKioskCookie,
  verifyKioskPin,
} from "@/lib/server/training-staff";

const signInSchema = z.object({
  staffId: z.string().uuid(),
  pin: z.string().regex(/^\d{4,6}$/),
});

export async function kioskSignIn(
  raw: z.input<typeof signInSchema>,
): Promise<{ ok: true } | { error: string }> {
  const parsed = signInSchema.safeParse(raw);
  if (!parsed.success) return { error: "Pick your name and enter your PIN." };
  const staff = await verifyKioskPin(parsed.data.staffId, parsed.data.pin);
  if (!staff) return { error: "PIN didn't match. Try again." };
  setKioskCookie(staff.id);
  return { ok: true };
}

export async function kioskSignOut(): Promise<void> {
  clearKioskCookie();
  redirect("/learn/kiosk");
}
