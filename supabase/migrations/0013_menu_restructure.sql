-- Restructure existing catering menus into the operator's intended shape:
-- three standardized top-level menus (Buffet / Plated / Add-ons), with the
-- old per-event menus collapsing into package items under Buffet (each old
-- section becomes a modifier group, each old item becomes a modifier
-- option). Anything that looks like a drinks / liquid menu flows into
-- Add-ons as standalone priced items.
--
-- Idempotent: skips if a non-archived "Buffet" menu already exists.
-- Original menus are archived (not deleted) so existing quotes' line items
-- continue to resolve.

do $$
declare
  buffet_menu_id   uuid;
  plated_menu_id   uuid;
  addons_menu_id   uuid;
  packages_section_id uuid;
  addons_section_id   uuid;

  menu_rec    record;
  section_rec record;
  item_rec    record;

  package_item_id uuid;
  modifier_id     uuid;
  next_pos        int;
begin
  if exists (
    select 1 from public.catering_menus
    where name in ('Buffet','Plated','Add-ons') and is_archived = false
  ) then
    raise notice 'Menu restructure already applied; skipping.';
    return;
  end if;

  insert into public.catering_menus (name, description, location_id, is_archived)
  values (
    'Buffet',
    'Buffet-style packages. Each item is a per-guest package; the modifier groups under it are the course choices included.',
    null,
    false
  )
  returning id into buffet_menu_id;

  insert into public.catering_menus (name, description, location_id, is_archived)
  values (
    'Plated',
    'Plated-service packages. Mirror of Buffet but for table-service events.',
    null,
    false
  )
  returning id into plated_menu_id;

  insert into public.catering_menus (name, description, location_id, is_archived)
  values (
    'Add-ons',
    'A la carte additions: drinks, premium sides, late-night snacks.',
    null,
    false
  )
  returning id into addons_menu_id;

  insert into public.catering_menu_sections (menu_id, name, position)
  values (buffet_menu_id, 'Packages', 0)
  returning id into packages_section_id;

  insert into public.catering_menu_sections (menu_id, name, position)
  values (addons_menu_id, 'All add-ons', 0)
  returning id into addons_section_id;

  insert into public.catering_menu_sections (menu_id, name, position)
  values (plated_menu_id, 'Packages', 0);

  for menu_rec in
    select id, name, description, created_by
    from public.catering_menus
    where is_archived = false
      and id not in (buffet_menu_id, plated_menu_id, addons_menu_id)
    order by created_at
  loop
    if lower(menu_rec.name) ~ '(liquid|upgrade|drink|beverage|bar)' then
      for item_rec in
        select i.name, i.description, i.unit, i.price_cents, i.min_quantity,
               i.allergens, i.is_available, i.created_by
        from public.catering_menu_items i
        join public.catering_menu_sections s on i.section_id = s.id
        where s.menu_id = menu_rec.id
        order by s.position, i.position
      loop
        select coalesce(max(position), -1) + 1 into next_pos
        from public.catering_menu_items
        where section_id = addons_section_id;

        insert into public.catering_menu_items
          (section_id, position, name, description, unit, price_cents,
           min_quantity, allergens, is_available, created_by)
        values
          (addons_section_id, next_pos, item_rec.name, item_rec.description,
           item_rec.unit, item_rec.price_cents, item_rec.min_quantity,
           item_rec.allergens, item_rec.is_available, item_rec.created_by);
      end loop;
    else
      select coalesce(max(position), -1) + 1 into next_pos
      from public.catering_menu_items
      where section_id = packages_section_id;

      insert into public.catering_menu_items
        (section_id, position, name, description, unit, price_cents,
         min_quantity, allergens, is_available, created_by)
      values
        (packages_section_id, next_pos, menu_rec.name, menu_rec.description,
         'per person', 0, 1, array[]::text[], true, menu_rec.created_by)
      returning id into package_item_id;

      for section_rec in
        select id, name, position
        from public.catering_menu_sections
        where menu_id = menu_rec.id
        order by position
      loop
        insert into public.catering_menu_modifiers
          (item_id, position, name, selection_kind, required, min_select, max_select)
        values
          (package_item_id, section_rec.position, section_rec.name,
           'single', false, 0, null)
        returning id into modifier_id;

        for item_rec in
          select name, position, price_cents
          from public.catering_menu_items
          where section_id = section_rec.id
          order by position
        loop
          insert into public.catering_menu_modifier_options
            (modifier_id, position, name, price_delta_cents, is_default)
          values
            (modifier_id, item_rec.position, item_rec.name,
             item_rec.price_cents, false);
        end loop;
      end loop;
    end if;

    update public.catering_menus set is_archived = true where id = menu_rec.id;
  end loop;
end $$;
