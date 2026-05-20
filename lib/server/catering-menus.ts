import "server-only";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import type {
  CateringMenu,
  CateringMenuItem,
  CateringMenuModifier,
  CateringMenuModifierOption,
  CateringMenuSection,
  CateringMenuSubsection,
} from "@/lib/types/database";

export type ModifierWithOptions = CateringMenuModifier & {
  options: CateringMenuModifierOption[];
};

export type MenuItemWithModifiers = CateringMenuItem & {
  modifiers: ModifierWithOptions[];
};

export type SectionWithChildren = CateringMenuSection & {
  subsections: CateringMenuSubsection[];
  items: MenuItemWithModifiers[];
};

export type FullMenu = CateringMenu & {
  sections: SectionWithChildren[];
};

export type MenuWithStats = CateringMenu & {
  section_count: number;
  item_count: number;
};

export async function listMenus(opts: {
  locationId?: string | null;
  includeArchived?: boolean;
}): Promise<MenuWithStats[]> {
  const supabase = createSupabaseServerClient();
  let query = supabase
    .from("catering_menus")
    .select("*")
    .order("is_archived")
    .order("position", { ascending: true })
    .order("created_at", { ascending: false });

  if (opts.locationId) query = query.eq("location_id", opts.locationId);
  if (!opts.includeArchived) query = query.eq("is_archived", false);

  const { data: menus } = await query;
  const list = (menus ?? []) as CateringMenu[];
  if (list.length === 0) return [];

  const menuIds = list.map((m) => m.id);

  // Pull section + item counts in two queries.
  const [sectionsResp, itemsResp] = await Promise.all([
    supabase
      .from("catering_menu_sections")
      .select("id, menu_id")
      .in("menu_id", menuIds),
    supabase
      .from("catering_menu_items")
      .select("id, section_id, catering_menu_sections!inner(menu_id)")
      .in("catering_menu_sections.menu_id", menuIds),
  ]);

  const sectionCounts = new Map<string, number>();
  for (const s of (sectionsResp.data ?? []) as { menu_id: string }[]) {
    sectionCounts.set(s.menu_id, (sectionCounts.get(s.menu_id) ?? 0) + 1);
  }

  const itemCounts = new Map<string, number>();
  for (const i of (itemsResp.data ?? []) as unknown as {
    catering_menu_sections: { menu_id: string } | { menu_id: string }[];
  }[]) {
    const join = i.catering_menu_sections;
    const mid = Array.isArray(join) ? join[0]?.menu_id : join.menu_id;
    if (!mid) continue;
    itemCounts.set(mid, (itemCounts.get(mid) ?? 0) + 1);
  }

  return list.map((m) => ({
    ...m,
    section_count: sectionCounts.get(m.id) ?? 0,
    item_count: itemCounts.get(m.id) ?? 0,
  }));
}

export async function getMenuFull(id: string): Promise<FullMenu | null> {
  const supabase = createSupabaseServerClient();

  const { data: menu } = await supabase
    .from("catering_menus")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (!menu) return null;

  const [sectionsResp, subsectionsResp, itemsResp] = await Promise.all([
    supabase
      .from("catering_menu_sections")
      .select("*")
      .eq("menu_id", id)
      .order("position", { ascending: true }),
    supabase
      .from("catering_menu_subsections")
      .select(
        "*, section:catering_menu_sections!inner(menu_id)",
      )
      .eq("section.menu_id", id)
      .order("position", { ascending: true }),
    supabase
      .from("catering_menu_items")
      .select(
        "*, section:catering_menu_sections!inner(menu_id)",
      )
      .eq("section.menu_id", id)
      .order("position", { ascending: true }),
  ]);

  const sections = (sectionsResp.data ?? []) as CateringMenuSection[];
  const subsections = (subsectionsResp.data ?? []) as CateringMenuSubsection[];
  const items = (itemsResp.data ?? []) as CateringMenuItem[];

  let modifiers: CateringMenuModifier[] = [];
  let options: CateringMenuModifierOption[] = [];
  if (items.length > 0) {
    const itemIds = items.map((i) => i.id);
    const { data: modsData } = await supabase
      .from("catering_menu_modifiers")
      .select("*")
      .in("item_id", itemIds)
      .order("position", { ascending: true });
    modifiers = (modsData ?? []) as CateringMenuModifier[];

    if (modifiers.length > 0) {
      const modIds = modifiers.map((m) => m.id);
      const { data: optsData } = await supabase
        .from("catering_menu_modifier_options")
        .select("*")
        .in("modifier_id", modIds)
        .order("position", { ascending: true });
      options = (optsData ?? []) as CateringMenuModifierOption[];
    }
  }

  const subsectionsBySection = new Map<string, CateringMenuSubsection[]>();
  for (const s of subsections) {
    const arr = subsectionsBySection.get(s.section_id) ?? [];
    arr.push(s);
    subsectionsBySection.set(s.section_id, arr);
  }

  const optionsByModifier = new Map<string, CateringMenuModifierOption[]>();
  for (const o of options) {
    const arr = optionsByModifier.get(o.modifier_id) ?? [];
    arr.push(o);
    optionsByModifier.set(o.modifier_id, arr);
  }

  const modifiersByItem = new Map<string, ModifierWithOptions[]>();
  for (const m of modifiers) {
    const arr = modifiersByItem.get(m.item_id) ?? [];
    arr.push({ ...m, options: optionsByModifier.get(m.id) ?? [] });
    modifiersByItem.set(m.item_id, arr);
  }

  const itemsBySection = new Map<string, MenuItemWithModifiers[]>();
  for (const it of items) {
    const arr = itemsBySection.get(it.section_id) ?? [];
    arr.push({ ...it, modifiers: modifiersByItem.get(it.id) ?? [] });
    itemsBySection.set(it.section_id, arr);
  }

  return {
    ...(menu as CateringMenu),
    sections: sections.map((s) => ({
      ...s,
      subsections: subsectionsBySection.get(s.id) ?? [],
      items: itemsBySection.get(s.id) ?? [],
    })),
  };
}
