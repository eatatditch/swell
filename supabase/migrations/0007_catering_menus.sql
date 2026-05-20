-- SWELL — Phase B: catering menu library
--
-- A reusable library of named menus that managers build once and attach
-- to quotes, BEOs, and (eventually) the public catering site. The
-- hierarchy is:
--   catering_menus
--     → catering_menu_sections           (groups: "Hors d'Oeuvres")
--       → catering_menu_subsections      (optional layer: "Cold")
--       → catering_menu_items            (the things you order)
--         → catering_menu_modifiers      (modifier groups on an item)
--           → catering_menu_modifier_options
--
-- Items live directly under a section and may optionally also point at
-- a subsection under that same section. Subsections are a display
-- grouping, not an additional ownership layer, so they're nullable.

-- =============================================================================
-- catering_menus
-- =============================================================================
create table public.catering_menus (
  id                    uuid primary key default gen_random_uuid(),
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),
  created_by            uuid references public.profiles(id) on delete set null,
  location_id           uuid references public.locations(id) on delete set null,
  name                  text not null check (length(trim(name)) > 0),
  description           text,
  default_service_type  text not null default 'buffet'
                        check (default_service_type in (
                          'drop_off','buffet','plated','family_style',
                          'cocktail','food_truck','other'
                        )),
  is_archived           boolean not null default false,
  position              int not null default 0
);

create index catering_menus_archived_idx on public.catering_menus (is_archived);
create index catering_menus_location_idx on public.catering_menus (location_id);
create index catering_menus_position_idx on public.catering_menus (position);

create trigger catering_menus_set_updated_at
before update on public.catering_menus
for each row execute function public.set_updated_at();

-- =============================================================================
-- catering_menu_sections
-- =============================================================================
create table public.catering_menu_sections (
  id          uuid primary key default gen_random_uuid(),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  menu_id     uuid not null references public.catering_menus(id) on delete cascade,
  position    int not null default 0,
  name        text not null check (length(trim(name)) > 0),
  description text
);

create index catering_menu_sections_menu_idx
  on public.catering_menu_sections (menu_id, position);

create trigger catering_menu_sections_set_updated_at
before update on public.catering_menu_sections
for each row execute function public.set_updated_at();

-- =============================================================================
-- catering_menu_subsections (optional grouping under a section)
-- =============================================================================
create table public.catering_menu_subsections (
  id          uuid primary key default gen_random_uuid(),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  section_id  uuid not null references public.catering_menu_sections(id) on delete cascade,
  position    int not null default 0,
  name        text not null check (length(trim(name)) > 0),
  description text
);

create index catering_menu_subsections_section_idx
  on public.catering_menu_subsections (section_id, position);

create trigger catering_menu_subsections_set_updated_at
before update on public.catering_menu_subsections
for each row execute function public.set_updated_at();

-- =============================================================================
-- catering_menu_items
-- =============================================================================
create table public.catering_menu_items (
  id              uuid primary key default gen_random_uuid(),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  created_by      uuid references public.profiles(id) on delete set null,
  section_id      uuid not null references public.catering_menu_sections(id) on delete cascade,
  subsection_id   uuid references public.catering_menu_subsections(id) on delete set null,
  position        int not null default 0,
  name            text not null check (length(trim(name)) > 0),
  description     text,
  unit            text not null default 'each',
  price_cents     bigint not null default 0 check (price_cents >= 0),
  min_quantity    numeric(12,2) check (min_quantity is null or min_quantity >= 0),
  allergens       text[] not null default '{}',
  image_url       text,
  is_available    boolean not null default true
);

create index catering_menu_items_section_idx
  on public.catering_menu_items (section_id, position);
create index catering_menu_items_subsection_idx
  on public.catering_menu_items (subsection_id, position)
  where subsection_id is not null;

create trigger catering_menu_items_set_updated_at
before update on public.catering_menu_items
for each row execute function public.set_updated_at();

-- Subsection must belong to the same section as the item.
create or replace function public.catering_menu_item_subsection_check()
returns trigger
language plpgsql
as $$
begin
  if NEW.subsection_id is null then
    return NEW;
  end if;
  if not exists (
    select 1 from public.catering_menu_subsections s
    where s.id = NEW.subsection_id and s.section_id = NEW.section_id
  ) then
    raise exception 'subsection % does not belong to section %', NEW.subsection_id, NEW.section_id;
  end if;
  return NEW;
end
$$;

create trigger catering_menu_items_subsection_check
before insert or update on public.catering_menu_items
for each row execute function public.catering_menu_item_subsection_check();

-- =============================================================================
-- catering_menu_modifiers (modifier groups attached to an item)
-- =============================================================================
create table public.catering_menu_modifiers (
  id              uuid primary key default gen_random_uuid(),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  item_id         uuid not null references public.catering_menu_items(id) on delete cascade,
  position        int not null default 0,
  name            text not null check (length(trim(name)) > 0),
  selection_kind  text not null default 'single'
                  check (selection_kind in ('single','multi')),
  required        boolean not null default false,
  min_select      int not null default 0 check (min_select >= 0),
  max_select      int check (max_select is null or max_select >= 1)
);

create index catering_menu_modifiers_item_idx
  on public.catering_menu_modifiers (item_id, position);

create trigger catering_menu_modifiers_set_updated_at
before update on public.catering_menu_modifiers
for each row execute function public.set_updated_at();

-- =============================================================================
-- catering_menu_modifier_options
-- =============================================================================
create table public.catering_menu_modifier_options (
  id                  uuid primary key default gen_random_uuid(),
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  modifier_id         uuid not null references public.catering_menu_modifiers(id) on delete cascade,
  position            int not null default 0,
  name                text not null check (length(trim(name)) > 0),
  price_delta_cents   bigint not null default 0,
  is_default          boolean not null default false
);

create index catering_menu_modifier_options_modifier_idx
  on public.catering_menu_modifier_options (modifier_id, position);

create trigger catering_menu_modifier_options_set_updated_at
before update on public.catering_menu_modifier_options
for each row execute function public.set_updated_at();

-- =============================================================================
-- RLS — reads gated by any authenticated catering-eligible user; writes by
-- admin or catering write access (catering managers, GMs, kitchen managers).
-- =============================================================================
alter table public.catering_menus              enable row level security;
alter table public.catering_menu_sections      enable row level security;
alter table public.catering_menu_subsections   enable row level security;
alter table public.catering_menu_items         enable row level security;
alter table public.catering_menu_modifiers     enable row level security;
alter table public.catering_menu_modifier_options enable row level security;

-- menus
create policy catering_menus_select on public.catering_menus
  for select to authenticated using (true);
create policy catering_menus_insert on public.catering_menus
  for insert to authenticated with check (
    created_by = auth.uid()
    and (public.is_admin() or public.has_catering_write_access())
  );
create policy catering_menus_update on public.catering_menus
  for update to authenticated
  using (public.is_admin() or public.has_catering_write_access())
  with check (public.is_admin() or public.has_catering_write_access());
create policy catering_menus_delete on public.catering_menus
  for delete to authenticated using (
    public.is_admin() or created_by = auth.uid()
  );

-- sections
create policy catering_menu_sections_select on public.catering_menu_sections
  for select to authenticated using (true);
create policy catering_menu_sections_write on public.catering_menu_sections
  for all to authenticated
  using (public.is_admin() or public.has_catering_write_access())
  with check (public.is_admin() or public.has_catering_write_access());

-- subsections
create policy catering_menu_subsections_select on public.catering_menu_subsections
  for select to authenticated using (true);
create policy catering_menu_subsections_write on public.catering_menu_subsections
  for all to authenticated
  using (public.is_admin() or public.has_catering_write_access())
  with check (public.is_admin() or public.has_catering_write_access());

-- items
create policy catering_menu_items_select on public.catering_menu_items
  for select to authenticated using (true);
create policy catering_menu_items_write on public.catering_menu_items
  for all to authenticated
  using (public.is_admin() or public.has_catering_write_access())
  with check (public.is_admin() or public.has_catering_write_access());

-- modifiers
create policy catering_menu_modifiers_select on public.catering_menu_modifiers
  for select to authenticated using (true);
create policy catering_menu_modifiers_write on public.catering_menu_modifiers
  for all to authenticated
  using (public.is_admin() or public.has_catering_write_access())
  with check (public.is_admin() or public.has_catering_write_access());

-- modifier options
create policy catering_menu_modifier_options_select on public.catering_menu_modifier_options
  for select to authenticated using (true);
create policy catering_menu_modifier_options_write on public.catering_menu_modifier_options
  for all to authenticated
  using (public.is_admin() or public.has_catering_write_access())
  with check (public.is_admin() or public.has_catering_write_access());
