"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { logActivity } from "@/lib/server/activity";
import { SERVICE_TYPES } from "@/lib/constants/catering";

const stringy = z.string().trim();

// =============================================================================
// Menu
// =============================================================================
const menuSchema = z.object({
  name: stringy.min(1, "Name required").max(200),
  description: stringy.max(2000).optional().nullable(),
  defaultServiceType: z.enum(SERVICE_TYPES as [string, ...string[]]),
  locationId: z.string().uuid().optional().nullable(),
});

export type MenuInput = z.input<typeof menuSchema>;

export async function createMenu(raw: MenuInput) {
  const supabase = createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in" };

  const parsed = menuSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const v = parsed.data;

  const { data, error } = await supabase
    .from("catering_menus")
    .insert({
      created_by: user.id,
      location_id: v.locationId ?? null,
      name: v.name,
      description: v.description || null,
      default_service_type: v.defaultServiceType,
    })
    .select("*")
    .single();
  if (error || !data) return { error: error?.message ?? "Could not create menu" };

  await logActivity({
    verb: "created",
    objectType: "catering_menu",
    objectId: data.id,
    summary: data.name,
  });

  revalidatePath("/catering/menus");
  return { menu: data };
}

const updateMenuSchema = menuSchema.extend({ id: z.string().uuid() });

export async function updateMenu(raw: z.input<typeof updateMenuSchema>) {
  const supabase = createSupabaseServerClient();
  const parsed = updateMenuSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const v = parsed.data;

  const { data, error } = await supabase
    .from("catering_menus")
    .update({
      name: v.name,
      description: v.description || null,
      default_service_type: v.defaultServiceType,
      location_id: v.locationId ?? null,
    })
    .eq("id", v.id)
    .select("*")
    .single();
  if (error || !data) return { error: error?.message ?? "Could not update menu" };

  revalidatePath("/catering/menus");
  revalidatePath(`/catering/menus/${v.id}`);
  return { menu: data };
}

export async function setMenuArchived(id: string, archived: boolean) {
  const supabase = createSupabaseServerClient();
  const { error } = await supabase
    .from("catering_menus")
    .update({ is_archived: archived })
    .eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/catering/menus");
  revalidatePath(`/catering/menus/${id}`);
  return { ok: true };
}

export async function deleteMenu(id: string) {
  const supabase = createSupabaseServerClient();
  const { error } = await supabase.from("catering_menus").delete().eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/catering/menus");
  return { ok: true };
}

// =============================================================================
// Sections
// =============================================================================
const sectionSchema = z.object({
  menuId: z.string().uuid(),
  name: stringy.min(1).max(200),
  description: stringy.max(2000).optional().nullable(),
});

export async function createSection(raw: z.input<typeof sectionSchema>) {
  const supabase = createSupabaseServerClient();
  const parsed = sectionSchema.safeParse(raw);
  if (!parsed.success) return { error: "Invalid input" };
  const v = parsed.data;

  const { data: max } = await supabase
    .from("catering_menu_sections")
    .select("position")
    .eq("menu_id", v.menuId)
    .order("position", { ascending: false })
    .limit(1)
    .maybeSingle();
  const position = (max?.position ?? -1) + 1;

  const { data, error } = await supabase
    .from("catering_menu_sections")
    .insert({
      menu_id: v.menuId,
      name: v.name,
      description: v.description || null,
      position,
    })
    .select("*")
    .single();
  if (error || !data) return { error: error?.message ?? "Could not create section" };

  revalidatePath(`/catering/menus/${v.menuId}`);
  return { section: data };
}

const updateSectionSchema = z.object({
  id: z.string().uuid(),
  name: stringy.min(1).max(200),
  description: stringy.max(2000).optional().nullable(),
});

export async function updateSection(raw: z.input<typeof updateSectionSchema>) {
  const supabase = createSupabaseServerClient();
  const parsed = updateSectionSchema.safeParse(raw);
  if (!parsed.success) return { error: "Invalid input" };
  const v = parsed.data;

  const { data, error } = await supabase
    .from("catering_menu_sections")
    .update({
      name: v.name,
      description: v.description || null,
    })
    .eq("id", v.id)
    .select("menu_id")
    .single();
  if (error || !data) return { error: error?.message ?? "Could not update" };

  revalidatePath(`/catering/menus/${data.menu_id}`);
  return { ok: true };
}

export async function deleteSection(id: string) {
  const supabase = createSupabaseServerClient();
  const { data: existing } = await supabase
    .from("catering_menu_sections")
    .select("menu_id")
    .eq("id", id)
    .maybeSingle();
  const { error } = await supabase
    .from("catering_menu_sections")
    .delete()
    .eq("id", id);
  if (error) return { error: error.message };
  if (existing) revalidatePath(`/catering/menus/${existing.menu_id}`);
  return { ok: true };
}

export async function moveSection(id: string, direction: "up" | "down") {
  const supabase = createSupabaseServerClient();
  const { data: self } = await supabase
    .from("catering_menu_sections")
    .select("id, menu_id, position")
    .eq("id", id)
    .maybeSingle();
  if (!self) return { error: "Section not found" };

  const { data: neighbor } = await supabase
    .from("catering_menu_sections")
    .select("id, position")
    .eq("menu_id", self.menu_id)
    [direction === "up" ? "lt" : "gt"]("position", self.position)
    .order("position", { ascending: direction !== "up" })
    .limit(1)
    .maybeSingle();
  if (!neighbor) return { ok: true };

  await supabase
    .from("catering_menu_sections")
    .update({ position: neighbor.position })
    .eq("id", self.id);
  await supabase
    .from("catering_menu_sections")
    .update({ position: self.position })
    .eq("id", neighbor.id);

  revalidatePath(`/catering/menus/${self.menu_id}`);
  return { ok: true };
}

// =============================================================================
// Subsections
// =============================================================================
const subsectionSchema = z.object({
  sectionId: z.string().uuid(),
  name: stringy.min(1).max(200),
  description: stringy.max(2000).optional().nullable(),
});

export async function createSubsection(raw: z.input<typeof subsectionSchema>) {
  const supabase = createSupabaseServerClient();
  const parsed = subsectionSchema.safeParse(raw);
  if (!parsed.success) return { error: "Invalid input" };
  const v = parsed.data;

  const { data: max } = await supabase
    .from("catering_menu_subsections")
    .select("position")
    .eq("section_id", v.sectionId)
    .order("position", { ascending: false })
    .limit(1)
    .maybeSingle();
  const position = (max?.position ?? -1) + 1;

  const { data, error } = await supabase
    .from("catering_menu_subsections")
    .insert({
      section_id: v.sectionId,
      name: v.name,
      description: v.description || null,
      position,
    })
    .select("*, section:catering_menu_sections!inner(menu_id)")
    .single();
  if (error || !data) return { error: error?.message ?? "Could not create" };

  const menuId = (data as unknown as { section: { menu_id: string } }).section
    .menu_id;
  revalidatePath(`/catering/menus/${menuId}`);
  return { subsection: data };
}

export async function updateSubsection(
  id: string,
  patch: { name?: string; description?: string | null },
) {
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from("catering_menu_subsections")
    .update({
      ...(patch.name != null ? { name: patch.name } : {}),
      ...(patch.description !== undefined
        ? { description: patch.description || null }
        : {}),
    })
    .eq("id", id)
    .select("section:catering_menu_sections!inner(menu_id)")
    .single();
  if (error || !data) return { error: error?.message ?? "Could not update" };
  const menuId = (data as unknown as { section: { menu_id: string } }).section
    .menu_id;
  revalidatePath(`/catering/menus/${menuId}`);
  return { ok: true };
}

export async function deleteSubsection(id: string) {
  const supabase = createSupabaseServerClient();
  const { data: existing } = await supabase
    .from("catering_menu_subsections")
    .select("section:catering_menu_sections!inner(menu_id)")
    .eq("id", id)
    .maybeSingle();
  const { error } = await supabase
    .from("catering_menu_subsections")
    .delete()
    .eq("id", id);
  if (error) return { error: error.message };
  if (existing) {
    const menuId = (existing as unknown as { section: { menu_id: string } })
      .section.menu_id;
    revalidatePath(`/catering/menus/${menuId}`);
  }
  return { ok: true };
}

// =============================================================================
// Items
// =============================================================================
const itemSchema = z.object({
  sectionId: z.string().uuid(),
  subsectionId: z.string().uuid().optional().nullable(),
  name: stringy.min(1).max(200),
  description: stringy.max(2000).optional().nullable(),
  unit: stringy.min(1).max(64),
  price: z.number().min(0).max(10_000_000),
  minQuantity: z.number().min(0).max(100_000).optional().nullable(),
  allergens: z.array(stringy.max(64)).max(40).optional().default([]),
  imageUrl: stringy.max(2000).optional().nullable(),
  isAvailable: z.boolean().optional().default(true),
});

export async function createItem(raw: z.input<typeof itemSchema>) {
  const supabase = createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in" };

  const parsed = itemSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const v = parsed.data;

  const { data: max } = await supabase
    .from("catering_menu_items")
    .select("position")
    .eq("section_id", v.sectionId)
    .order("position", { ascending: false })
    .limit(1)
    .maybeSingle();
  const position = (max?.position ?? -1) + 1;

  const { data, error } = await supabase
    .from("catering_menu_items")
    .insert({
      created_by: user.id,
      section_id: v.sectionId,
      subsection_id: v.subsectionId || null,
      name: v.name,
      description: v.description || null,
      unit: v.unit,
      price_cents: Math.round(v.price * 100),
      min_quantity: v.minQuantity ?? null,
      allergens: v.allergens ?? [],
      image_url: v.imageUrl || null,
      is_available: v.isAvailable ?? true,
      position,
    })
    .select("*, section:catering_menu_sections!inner(menu_id)")
    .single();
  if (error || !data) return { error: error?.message ?? "Could not create item" };

  const menuId = (data as unknown as { section: { menu_id: string } }).section
    .menu_id;
  revalidatePath(`/catering/menus/${menuId}`);
  return { item: data };
}

const updateItemSchema = itemSchema.extend({ id: z.string().uuid() });

export async function updateItem(raw: z.input<typeof updateItemSchema>) {
  const supabase = createSupabaseServerClient();
  const parsed = updateItemSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const v = parsed.data;

  const { data, error } = await supabase
    .from("catering_menu_items")
    .update({
      section_id: v.sectionId,
      subsection_id: v.subsectionId || null,
      name: v.name,
      description: v.description || null,
      unit: v.unit,
      price_cents: Math.round(v.price * 100),
      min_quantity: v.minQuantity ?? null,
      allergens: v.allergens ?? [],
      image_url: v.imageUrl || null,
      is_available: v.isAvailable ?? true,
    })
    .eq("id", v.id)
    .select("*, section:catering_menu_sections!inner(menu_id)")
    .single();
  if (error || !data) return { error: error?.message ?? "Could not update" };

  const menuId = (data as unknown as { section: { menu_id: string } }).section
    .menu_id;
  revalidatePath(`/catering/menus/${menuId}`);
  return { ok: true };
}

export async function deleteItem(id: string) {
  const supabase = createSupabaseServerClient();
  const { data: existing } = await supabase
    .from("catering_menu_items")
    .select("section:catering_menu_sections!inner(menu_id)")
    .eq("id", id)
    .maybeSingle();
  const { error } = await supabase
    .from("catering_menu_items")
    .delete()
    .eq("id", id);
  if (error) return { error: error.message };
  if (existing) {
    const menuId = (existing as unknown as { section: { menu_id: string } })
      .section.menu_id;
    revalidatePath(`/catering/menus/${menuId}`);
  }
  return { ok: true };
}

export async function moveItem(id: string, direction: "up" | "down") {
  const supabase = createSupabaseServerClient();
  const { data: self } = await supabase
    .from("catering_menu_items")
    .select("id, section_id, position, section:catering_menu_sections!inner(menu_id)")
    .eq("id", id)
    .maybeSingle();
  if (!self) return { error: "Item not found" };

  const { data: neighbor } = await supabase
    .from("catering_menu_items")
    .select("id, position")
    .eq("section_id", self.section_id)
    [direction === "up" ? "lt" : "gt"]("position", self.position)
    .order("position", { ascending: direction !== "up" })
    .limit(1)
    .maybeSingle();
  if (!neighbor) return { ok: true };

  await supabase
    .from("catering_menu_items")
    .update({ position: neighbor.position })
    .eq("id", self.id);
  await supabase
    .from("catering_menu_items")
    .update({ position: self.position })
    .eq("id", neighbor.id);

  const menuId = (self as unknown as { section: { menu_id: string } }).section
    .menu_id;
  revalidatePath(`/catering/menus/${menuId}`);
  return { ok: true };
}

// =============================================================================
// Modifier groups and options
// =============================================================================
const modifierSchema = z.object({
  itemId: z.string().uuid(),
  name: stringy.min(1).max(200),
  selectionKind: z.enum(["single", "multi"]),
  required: z.boolean().optional().default(false),
  minSelect: z.number().int().min(0).optional().default(0),
  maxSelect: z.number().int().min(1).optional().nullable(),
});

export async function createModifier(raw: z.input<typeof modifierSchema>) {
  const supabase = createSupabaseServerClient();
  const parsed = modifierSchema.safeParse(raw);
  if (!parsed.success) return { error: "Invalid input" };
  const v = parsed.data;

  const { data: max } = await supabase
    .from("catering_menu_modifiers")
    .select("position")
    .eq("item_id", v.itemId)
    .order("position", { ascending: false })
    .limit(1)
    .maybeSingle();
  const position = (max?.position ?? -1) + 1;

  const { data, error } = await supabase
    .from("catering_menu_modifiers")
    .insert({
      item_id: v.itemId,
      name: v.name,
      selection_kind: v.selectionKind,
      required: v.required ?? false,
      min_select: v.minSelect ?? 0,
      max_select: v.maxSelect ?? null,
      position,
    })
    .select(
      "*, item:catering_menu_items!inner(section:catering_menu_sections!inner(menu_id))",
    )
    .single();
  if (error || !data) return { error: error?.message ?? "Could not create modifier" };

  const menuId = (
    data as unknown as { item: { section: { menu_id: string } } }
  ).item.section.menu_id;
  revalidatePath(`/catering/menus/${menuId}`);
  return { modifier: data };
}

const updateModifierSchema = modifierSchema.extend({ id: z.string().uuid() });

export async function updateModifier(
  raw: z.input<typeof updateModifierSchema>,
) {
  const supabase = createSupabaseServerClient();
  const parsed = updateModifierSchema.safeParse(raw);
  if (!parsed.success) return { error: "Invalid input" };
  const v = parsed.data;

  const { data, error } = await supabase
    .from("catering_menu_modifiers")
    .update({
      name: v.name,
      selection_kind: v.selectionKind,
      required: v.required ?? false,
      min_select: v.minSelect ?? 0,
      max_select: v.maxSelect ?? null,
    })
    .eq("id", v.id)
    .select(
      "item:catering_menu_items!inner(section:catering_menu_sections!inner(menu_id))",
    )
    .single();
  if (error || !data) return { error: error?.message ?? "Could not update" };

  const menuId = (
    data as unknown as { item: { section: { menu_id: string } } }
  ).item.section.menu_id;
  revalidatePath(`/catering/menus/${menuId}`);
  return { ok: true };
}

export async function deleteModifier(id: string) {
  const supabase = createSupabaseServerClient();
  const { data: existing } = await supabase
    .from("catering_menu_modifiers")
    .select(
      "item:catering_menu_items!inner(section:catering_menu_sections!inner(menu_id))",
    )
    .eq("id", id)
    .maybeSingle();
  const { error } = await supabase
    .from("catering_menu_modifiers")
    .delete()
    .eq("id", id);
  if (error) return { error: error.message };
  if (existing) {
    const menuId = (
      existing as unknown as { item: { section: { menu_id: string } } }
    ).item.section.menu_id;
    revalidatePath(`/catering/menus/${menuId}`);
  }
  return { ok: true };
}

const optionSchema = z.object({
  modifierId: z.string().uuid(),
  name: stringy.min(1).max(200),
  priceDelta: z.number().min(-10_000_000).max(10_000_000).optional().default(0),
  isDefault: z.boolean().optional().default(false),
});

export async function createModifierOption(
  raw: z.input<typeof optionSchema>,
) {
  const supabase = createSupabaseServerClient();
  const parsed = optionSchema.safeParse(raw);
  if (!parsed.success) return { error: "Invalid input" };
  const v = parsed.data;

  const { data: max } = await supabase
    .from("catering_menu_modifier_options")
    .select("position")
    .eq("modifier_id", v.modifierId)
    .order("position", { ascending: false })
    .limit(1)
    .maybeSingle();
  const position = (max?.position ?? -1) + 1;

  const { data, error } = await supabase
    .from("catering_menu_modifier_options")
    .insert({
      modifier_id: v.modifierId,
      name: v.name,
      price_delta_cents: Math.round((v.priceDelta ?? 0) * 100),
      is_default: v.isDefault ?? false,
      position,
    })
    .select(
      "*, modifier:catering_menu_modifiers!inner(item:catering_menu_items!inner(section:catering_menu_sections!inner(menu_id)))",
    )
    .single();
  if (error || !data) return { error: error?.message ?? "Could not create" };

  const menuId = (
    data as unknown as {
      modifier: { item: { section: { menu_id: string } } };
    }
  ).modifier.item.section.menu_id;
  revalidatePath(`/catering/menus/${menuId}`);
  return { option: data };
}

const updateOptionSchema = optionSchema.extend({ id: z.string().uuid() });

export async function updateModifierOption(
  raw: z.input<typeof updateOptionSchema>,
) {
  const supabase = createSupabaseServerClient();
  const parsed = updateOptionSchema.safeParse(raw);
  if (!parsed.success) return { error: "Invalid input" };
  const v = parsed.data;

  const { data, error } = await supabase
    .from("catering_menu_modifier_options")
    .update({
      name: v.name,
      price_delta_cents: Math.round((v.priceDelta ?? 0) * 100),
      is_default: v.isDefault ?? false,
    })
    .eq("id", v.id)
    .select(
      "modifier:catering_menu_modifiers!inner(item:catering_menu_items!inner(section:catering_menu_sections!inner(menu_id)))",
    )
    .single();
  if (error || !data) return { error: error?.message ?? "Could not update" };

  const menuId = (
    data as unknown as {
      modifier: { item: { section: { menu_id: string } } };
    }
  ).modifier.item.section.menu_id;
  revalidatePath(`/catering/menus/${menuId}`);
  return { ok: true };
}

export async function deleteModifierOption(id: string) {
  const supabase = createSupabaseServerClient();
  const { data: existing } = await supabase
    .from("catering_menu_modifier_options")
    .select(
      "modifier:catering_menu_modifiers!inner(item:catering_menu_items!inner(section:catering_menu_sections!inner(menu_id)))",
    )
    .eq("id", id)
    .maybeSingle();
  const { error } = await supabase
    .from("catering_menu_modifier_options")
    .delete()
    .eq("id", id);
  if (error) return { error: error.message };
  if (existing) {
    const menuId = (
      existing as unknown as {
        modifier: { item: { section: { menu_id: string } } };
      }
    ).modifier.item.section.menu_id;
    revalidatePath(`/catering/menus/${menuId}`);
  }
  return { ok: true };
}
