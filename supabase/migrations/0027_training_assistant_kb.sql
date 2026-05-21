-- SWELL — Paloma's editable knowledge base.
-- A Markdown blob that gets injected into Paloma's system prompt so admins
-- can teach her Ditch-specific business facts without a code change.

alter table public.system_settings
  add column if not exists assistant_kb text;

-- Seed with a template the first time this migration runs. Admins replace
-- the bracketed placeholders in /admin/settings → Brand & Email.
update public.system_settings
set assistant_kb = $kb$# Ditch — business facts

Use these as ground truth. Replace any `[bracketed]` placeholders below with
the real values via the Admin → Settings page.

## Brand
- **Brand name:** Ditch
- **Founded:** [year] by [founder name(s)]
- **Owner:** [owner name]
- **Concept:** [one-sentence description — e.g. coastal Mexican-American kitchen + bar]

## Locations
- **Number of locations:** [N]
- **Locations:**
  - Bay Shore, NY
  - Port Jefferson, NY
  - Kings Park, NY
- **Headquarters:** [address]

## Leadership
- **Founder / Owner:** [name]
- **Operations lead:** [name]
- **Executive Chef:** [name]
- **General Managers:** see /admin/users

## Hours
- See **Admin → Settings → Hours** for the live per-location schedule.

## Contact
- **Catering inquiries:** catering@eatatditch.com
- **General:** hi@eatatditch.com
- **Website:** eatatditch.com
- **Instagram:** @eatatditch

## Brand voice (cheat sheet for Paloma)
- Warm, direct, no corporate hedging
- "We" not "the company"
- Short sentences, real talk
- Never blame a teammate

## Anything else worth knowing
- (Add here. The more concrete facts you put in this file, the more
  accurate Paloma's answers about Ditch will be.)
$kb$
where id = 1
  and (assistant_kb is null or assistant_kb = '');
