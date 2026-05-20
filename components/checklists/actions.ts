"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { logActivity } from "@/lib/server/activity";
import { CHECKLIST_KINDS, todayISO } from "@/lib/constants/daily-ops";

const kindEnum = z.enum(CHECKLIST_KINDS as [string, ...string[]]);

const createTemplateSchema = z.object({
  name: z.string().min(1, "Name is required").max(200),
  kind: kindEnum,
  description: z.string().max(2000).optional().nullable(),
  locationId: z.string().uuid().optional().nullable(),
  items: z
    .array(
      z.object({
        label: z.string().min(1).max(300),
        requiresNote: z.boolean().default(false),
      }),
    )
    .default([]),
});

export type CreateChecklistInput = z.input<typeof createTemplateSchema>;

export async function createChecklistTemplate(raw: CreateChecklistInput) {
  const supabase = createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in" };

  const parsed = createTemplateSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const v = parsed.data;

  const { data: tpl, error } = await supabase
    .from("checklists")
    .insert({
      created_by: user.id,
      name: v.name,
      kind: v.kind,
      description: v.description ?? null,
      location_id: v.locationId ?? null,
      is_active: true,
    })
    .select("*")
    .single();

  if (error || !tpl) {
    return { error: error?.message ?? "Could not create template" };
  }

  if (v.items.length > 0) {
    const rows = v.items.map((item, i) => ({
      checklist_id: tpl.id,
      position: (i + 1) * 10,
      label: item.label,
      requires_note: item.requiresNote,
    }));
    await supabase.from("checklist_items").insert(rows);
  }

  await logActivity({
    verb: "created",
    objectType: "checklist_template",
    objectId: tpl.id,
    summary: tpl.name,
    locationId: tpl.location_id,
  });

  revalidatePath("/daily-ops", "layout");
  return { template: tpl };
}

const updateTemplateSchema = z.object({
  templateId: z.string().uuid(),
  name: z.string().min(1).max(200),
  kind: kindEnum,
  description: z.string().max(2000).optional().nullable(),
  isActive: z.boolean(),
  items: z.array(
    z.object({
      id: z.string().uuid().optional(),
      label: z.string().min(1).max(300),
      requiresNote: z.boolean().default(false),
      position: z.number().int().min(0).default(0),
    }),
  ),
});

export type UpdateChecklistInput = z.input<typeof updateTemplateSchema>;

export async function updateChecklistTemplate(raw: UpdateChecklistInput) {
  const supabase = createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in" };

  const parsed = updateTemplateSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const v = parsed.data;

  const { data: tpl, error: updErr } = await supabase
    .from("checklists")
    .update({
      name: v.name,
      kind: v.kind,
      description: v.description ?? null,
      is_active: v.isActive,
    })
    .eq("id", v.templateId)
    .select("*")
    .single();

  if (updErr || !tpl) {
    return { error: updErr?.message ?? "Could not update template" };
  }

  const { data: existingItems } = await supabase
    .from("checklist_items")
    .select("id")
    .eq("checklist_id", v.templateId);

  const keptIds = new Set(
    v.items.map((i) => i.id).filter(Boolean) as string[],
  );
  const toDelete = (existingItems ?? [])
    .map((r) => r.id as string)
    .filter((id) => !keptIds.has(id));

  if (toDelete.length > 0) {
    await supabase.from("checklist_items").delete().in("id", toDelete);
  }

  for (let i = 0; i < v.items.length; i++) {
    const it = v.items[i];
    const position = (i + 1) * 10;
    if (it.id) {
      await supabase
        .from("checklist_items")
        .update({
          label: it.label,
          requires_note: it.requiresNote,
          position,
        })
        .eq("id", it.id);
    } else {
      await supabase.from("checklist_items").insert({
        checklist_id: v.templateId,
        label: it.label,
        requires_note: it.requiresNote,
        position,
      });
    }
  }

  await logActivity({
    verb: "updated",
    objectType: "checklist_template",
    objectId: tpl.id,
    summary: tpl.name,
    locationId: tpl.location_id,
  });

  revalidatePath("/daily-ops", "layout");
  return { template: tpl };
}

const startRunSchema = z.object({
  checklistId: z.string().uuid(),
  locationId: z.string().uuid(),
  runDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

export async function startChecklistRun(raw: z.input<typeof startRunSchema>) {
  const supabase = createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in" };

  const parsed = startRunSchema.safeParse(raw);
  if (!parsed.success) return { error: "Invalid input" };
  const v = parsed.data;

  const { data: existing } = await supabase
    .from("checklist_completions")
    .select("*")
    .eq("checklist_id", v.checklistId)
    .eq("location_id", v.locationId)
    .eq("run_date", v.runDate)
    .maybeSingle();

  if (existing) {
    return { completion: existing };
  }

  const { data: completion, error } = await supabase
    .from("checklist_completions")
    .insert({
      checklist_id: v.checklistId,
      location_id: v.locationId,
      run_date: v.runDate,
      created_by: user.id,
      status: "in_progress",
    })
    .select("*")
    .single();

  if (error || !completion) {
    return { error: error?.message ?? "Could not start run" };
  }

  await logActivity({
    verb: "created",
    objectType: "checklist_run",
    objectId: completion.id,
    summary: `Started ${v.runDate} run`,
    locationId: v.locationId,
  });

  revalidatePath("/daily-ops", "layout");
  return { completion };
}

const setItemStateSchema = z.object({
  completionId: z.string().uuid(),
  itemId: z.string().uuid(),
  checked: z.boolean(),
  note: z.string().max(2000).optional().nullable(),
});

export async function setChecklistItemState(
  raw: z.input<typeof setItemStateSchema>,
) {
  const supabase = createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in" };

  const parsed = setItemStateSchema.safeParse(raw);
  if (!parsed.success) return { error: "Invalid input" };
  const v = parsed.data;

  const { data: existing } = await supabase
    .from("checklist_item_completions")
    .select("id")
    .eq("completion_id", v.completionId)
    .eq("item_id", v.itemId)
    .maybeSingle();

  const payload = {
    completion_id: v.completionId,
    item_id: v.itemId,
    checked: v.checked,
    note: v.note ?? null,
    checked_by: v.checked ? user.id : null,
    checked_at: v.checked ? new Date().toISOString() : null,
  };

  if (existing) {
    await supabase
      .from("checklist_item_completions")
      .update(payload)
      .eq("id", existing.id);
  } else {
    await supabase.from("checklist_item_completions").insert(payload);
  }

  revalidatePath("/daily-ops", "layout");
  return { ok: true };
}

const managerLogPayloadSchema = z.object({
  notes: z.string().max(10000).optional().nullable(),
  salesCents: z.number().int().min(0).max(1_000_000_000).optional().nullable(),
  guestCount: z.number().int().min(0).max(100_000).optional().nullable(),
  compsCents: z.number().int().min(0).max(1_000_000_000).optional().nullable(),
  voidsCents: z.number().int().min(0).max(1_000_000_000).optional().nullable(),
});

const completeRunSchema = z.object({
  completionId: z.string().uuid(),
  notes: z.string().max(5000).optional().nullable(),
  managerLog: managerLogPayloadSchema.optional().nullable(),
});

export type CompleteChecklistRunInput = z.input<typeof completeRunSchema>;

export async function completeChecklistRun(raw: CompleteChecklistRunInput) {
  const supabase = createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in" };

  const parsed = completeRunSchema.safeParse(raw);
  if (!parsed.success) return { error: "Invalid input" };
  const v = parsed.data;

  const { data: completion, error } = await supabase
    .from("checklist_completions")
    .update({
      status: "completed",
      completed_by: user.id,
      completed_at: new Date().toISOString(),
      notes: v.notes ?? null,
    })
    .eq("id", v.completionId)
    .select("*, checklist:checklists(name, kind)")
    .single();

  if (error || !completion) {
    return { error: error?.message ?? "Could not complete run" };
  }

  await logActivity({
    verb: "completed",
    objectType: "checklist_run",
    objectId: completion.id,
    summary:
      (completion as { checklist?: { name?: string } }).checklist?.name ??
      "Checklist run",
    locationId: completion.location_id,
  });

  if (v.managerLog) {
    const kind = (completion as { checklist?: { kind?: string } }).checklist
      ?.kind;
    if (kind === "opening" || kind === "closing") {
      await upsertManagerLogForRun({
        completionId: completion.id,
        locationId: completion.location_id,
        runDate: completion.run_date,
        kind,
        userId: user.id,
        log: v.managerLog,
      });
    }
  }

  revalidatePath("/daily-ops", "layout");
  return { completion };
}

interface UpsertManagerLogArgs {
  completionId: string;
  locationId: string;
  runDate: string;
  kind: "opening" | "closing";
  userId: string;
  log: z.infer<typeof managerLogPayloadSchema>;
}

async function upsertManagerLogForRun({
  completionId,
  locationId,
  runDate,
  kind,
  userId,
  log,
}: UpsertManagerLogArgs) {
  const supabase = createSupabaseServerClient();
  const notes = log.notes?.trim() || null;
  const hasContent =
    (notes && notes.length > 0) ||
    log.salesCents != null ||
    log.guestCount != null ||
    log.compsCents != null ||
    log.voidsCents != null;
  if (!hasContent) return;

  const shift = kind === "opening" ? "am" : "pm";

  const { data: existing } = await supabase
    .from("manager_logs")
    .select("id")
    .eq("checklist_completion_id", completionId)
    .maybeSingle();

  if (existing) {
    const { data: updated } = await supabase
      .from("manager_logs")
      .update({
        notes,
        body: null,
        sales_cents: log.salesCents ?? null,
        guest_count: log.guestCount ?? null,
        comps_cents: log.compsCents ?? null,
        voids_cents: log.voidsCents ?? null,
      })
      .eq("id", existing.id)
      .select("id, location_id")
      .single();
    if (updated) {
      await logActivity({
        verb: "updated",
        objectType: "manager_log",
        objectId: updated.id,
        summary: managerLogSummary(notes, log.salesCents, log.guestCount),
        locationId: updated.location_id,
      });
    }
    return;
  }

  const { data: inserted } = await supabase
    .from("manager_logs")
    .insert({
      created_by: userId,
      author_id: userId,
      location_id: locationId,
      log_date: runDate,
      shift,
      body: null,
      notes,
      sales_cents: log.salesCents ?? null,
      guest_count: log.guestCount ?? null,
      comps_cents: log.compsCents ?? null,
      voids_cents: log.voidsCents ?? null,
      checklist_completion_id: completionId,
    })
    .select("id, location_id")
    .single();

  if (inserted) {
    await logActivity({
      verb: "created",
      objectType: "manager_log",
      objectId: inserted.id,
      summary: managerLogSummary(notes, log.salesCents, log.guestCount),
      locationId: inserted.location_id,
    });
  }
}

function managerLogSummary(
  notes: string | null,
  salesCents: number | null | undefined,
  guestCount: number | null | undefined,
): string {
  if (notes) return notes.slice(0, 140);
  const bits: string[] = [];
  if (salesCents != null) bits.push(`sales $${(salesCents / 100).toFixed(2)}`);
  if (guestCount != null) bits.push(`${guestCount} guests`);
  return bits.join(" · ") || "Manager log";
}

export async function reopenChecklistRun(completionId: string) {
  const supabase = createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in" };

  const { error } = await supabase
    .from("checklist_completions")
    .update({
      status: "in_progress",
      completed_at: null,
      completed_by: null,
    })
    .eq("id", completionId);
  if (error) return { error: error.message };
  revalidatePath("/daily-ops", "layout");
  return { ok: true };
}

export async function deleteChecklistTemplate(templateId: string) {
  const supabase = createSupabaseServerClient();
  const { error } = await supabase
    .from("checklists")
    .delete()
    .eq("id", templateId);
  if (error) return { error: error.message };
  revalidatePath("/daily-ops", "layout");
  return { ok: true };
}

export { todayISO };
