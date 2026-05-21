import "server-only";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { createSupabaseAdminClient } from "@/lib/supabase/admin-server";
import type { TrainingStaff, TrainingStaffType } from "@/lib/types/database";

export const KIOSK_COOKIE_NAME = "swell_kiosk_staff";

export interface KioskNamePickEntry {
  id: string;
  full_name: string;
  staff_type: TrainingStaffType;
}

/** Active roster for the kiosk name-picker. Service-role read (no auth). */
export async function listKioskRoster(): Promise<KioskNamePickEntry[]> {
  const admin = createSupabaseAdminClient();
  const { data } = await admin
    .from("training_staff")
    .select("id, full_name, staff_type")
    .eq("is_active", true)
    .order("full_name");
  return (data ?? []) as KioskNamePickEntry[];
}

/**
 * Verify a (staff_id, pin) pair via the kiosk_verify_pin SQL function.
 * Returns the staff record on success, null on failure.
 */
export async function verifyKioskPin(
  staffId: string,
  pin: string,
): Promise<TrainingStaff | null> {
  const trimmed = pin.trim();
  if (!trimmed) return null;
  const admin = createSupabaseAdminClient();
  const { data: verifiedId, error } = await admin.rpc("kiosk_verify_pin", {
    p_staff_id: staffId,
    p_pin: trimmed,
  });
  if (error || !verifiedId) return null;
  const { data: row } = await admin
    .from("training_staff")
    .select("*")
    .eq("id", verifiedId as string)
    .maybeSingle();
  return (row as TrainingStaff | null) ?? null;
}

/** Sign the kiosk staff cookie. PIN verification is the caller's job. */
export function setKioskCookie(staffId: string): void {
  cookies().set({
    name: KIOSK_COOKIE_NAME,
    value: staffId,
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
  });
}

export function clearKioskCookie(): void {
  cookies().set({
    name: KIOSK_COOKIE_NAME,
    value: "",
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  });
}

export async function getCurrentKioskStaff(): Promise<TrainingStaff | null> {
  const id = cookies().get(KIOSK_COOKIE_NAME)?.value;
  if (!id) return null;
  const admin = createSupabaseAdminClient();
  const { data } = await admin
    .from("training_staff")
    .select("*")
    .eq("id", id)
    .eq("is_active", true)
    .maybeSingle();
  return (data as TrainingStaff | null) ?? null;
}

export async function requireKioskStaff(): Promise<TrainingStaff> {
  const staff = await getCurrentKioskStaff();
  if (!staff) redirect("/training/kiosk");
  return staff;
}
