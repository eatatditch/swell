"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { logActivity } from "@/lib/server/activity";

async function requireAdminUser() {
  const supabase = createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { supabase, error: "Not signed in" as const };
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  if (profile?.role !== "founder_admin") {
    return { supabase, error: "Admins only" as const };
  }
  return { supabase, userId: user.id };
}

const cents = z.number().int().min(0).max(1_000_000_000_00);

const upsertSchema = z.object({
  snapshotDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  cashOnHandCents: cents,
  payablesCents: cents.default(0),
  receivablesCents: cents.default(0),
  weeklyBurnCents: cents.optional().nullable(),
  notes: z.string().max(5000).optional().nullable(),
});

export type UpsertCashSnapshotInput = z.input<typeof upsertSchema>;

export async function upsertCashSnapshot(raw: UpsertCashSnapshotInput) {
  const { supabase, userId, error: authError } = await requireAdminUser();
  if (authError) return { error: authError };

  const parsed = upsertSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const v = parsed.data;

  const { data: snapshot, error } = await supabase
    .from("founder_cash_snapshots")
    .upsert(
      {
        created_by: userId,
        snapshot_date: v.snapshotDate,
        cash_on_hand_cents: v.cashOnHandCents,
        payables_cents: v.payablesCents,
        receivables_cents: v.receivablesCents,
        weekly_burn_cents: v.weeklyBurnCents ?? null,
        notes: v.notes?.trim() || null,
      },
      { onConflict: "snapshot_date" },
    )
    .select("*")
    .single();

  if (error || !snapshot) {
    return { error: error?.message ?? "Could not save snapshot" };
  }

  await logActivity({
    verb: "updated",
    objectType: "founder_cash_snapshot",
    objectId: snapshot.id,
    summary: `Cash snapshot for ${snapshot.snapshot_date}`,
  });

  revalidatePath("/founder");
  return { snapshot };
}

export async function deleteCashSnapshot(id: string) {
  const { supabase, error: authError } = await requireAdminUser();
  if (authError) return { error: authError };

  const { error } = await supabase
    .from("founder_cash_snapshots")
    .delete()
    .eq("id", id);
  if (error) return { error: error.message };

  revalidatePath("/founder");
  return { ok: true };
}
