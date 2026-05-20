-- Operator correction to 0013: Brunch / Lunch / Dinner are plated-service
-- events, not buffet. Move those three package items from Buffet > Packages
-- to Plated > Packages, leaving Taco Party as the lone Buffet package.
--
-- Idempotent: if the items no longer live in the Buffet section, the
-- update is a no-op.

update public.catering_menu_items i
set section_id = (
  select s.id from public.catering_menu_sections s
  join public.catering_menus m on m.id = s.menu_id
  where m.name = 'Plated' and m.is_archived = false and s.name = 'Packages'
  limit 1
),
position = case i.name
  when 'Brunch · Private Events' then 0
  when 'Lunch · Private Events' then 1
  when 'Dinner · Private Events' then 2
end
where i.name in (
  'Brunch · Private Events',
  'Lunch · Private Events',
  'Dinner · Private Events'
)
  and exists (
    select 1 from public.catering_menu_sections s
    join public.catering_menus m on m.id = s.menu_id
    where s.id = i.section_id and m.name = 'Buffet'
  );

update public.catering_menu_items i
set position = 0
where i.name = 'Taco Party · Private Events'
  and exists (
    select 1 from public.catering_menu_sections s
    join public.catering_menus m on m.id = s.menu_id
    where s.id = i.section_id and m.name = 'Buffet'
  );
