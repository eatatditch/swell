-- SWELL — Training content port from TrainOS.
-- Seeds 3 categories, 8 courses, and 17 lessons with full Markdown-with-block
-- syntax content. Idempotent: guarded on the 'service-roles' category slug,
-- which is unique to this migration. Re-running is a no-op.

do $$
declare
  -- Category ids
  cat_brand uuid;
  cat_service uuid;
  cat_ops uuid;

  -- Course ids
  c_brand_culture uuid;
  c_server uuid;
  c_bartender uuid;
  c_support uuid;
  c_safety uuid;
  c_menu uuid;
  c_open_close uuid;
  c_alcohol uuid;

  _ignored_id uuid;
begin
  -- Idempotency guard.
  if exists (select 1 from public.training_categories where slug = 'service-roles') then
    return;
  end if;

  -- ===========================================================================
  -- Categories
  -- ===========================================================================
  insert into public.training_categories (slug, name, description, department, sort_order, icon)
  values
    ('brand-culture', 'Brand & Culture',
     'Who we are, the standards we hold, how we treat the room.',
     null, 10, null)
  on conflict (slug) do nothing;
  select id into cat_brand from public.training_categories where slug = 'brand-culture';

  insert into public.training_categories (slug, name, description, department, sort_order, icon)
  values
    ('service-roles', 'Service Roles',
     'FOH and support training: servers, bartenders, hosts, bussers, runners.',
     null, 20, null)
  returning id into cat_service;

  insert into public.training_categories (slug, name, description, department, sort_order, icon)
  values
    ('operations', 'Operations',
     'Safety, menu knowledge, open/close, and alcohol awareness.',
     null, 30, null)
  returning id into cat_ops;

  -- ===========================================================================
  -- Courses
  -- ===========================================================================
  insert into public.training_courses (
    category_id, slug, title, description,
    estimated_minutes, is_required, requires_signoff, sort_order, target_roles
  )
  values (
    cat_brand,
    'brand-culture',
    'Brand & Culture',
    $desc$Our mission, the values that don't bend, and how to handle the room when things go sideways.$desc$,
    30,
    true,
    false,
    10,
    array['team_member','service_manager','kitchen_manager','general_manager','catering_manager','marketing_manager']
  )
  returning id into c_brand_culture;

  insert into public.training_courses (
    category_id, slug, title, description,
    estimated_minutes, is_required, requires_signoff, sort_order, target_roles
  )
  values (
    cat_service,
    'server-training',
    'Server Training',
    $desc$Station, sales, checkout, and what to do when shit hits the fan.$desc$,
    60,
    true,
    true,
    10,
    array['team_member','service_manager','general_manager']
  )
  returning id into c_server;

  insert into public.training_courses (
    category_id, slug, title, description,
    estimated_minutes, is_required, requires_signoff, sort_order, target_roles
  )
  values (
    cat_service,
    'bartender-training',
    'Bartender Training',
    'Behind the stick: setup, service, speed, and spec.',
    30,
    true,
    true,
    20,
    array['team_member','service_manager','general_manager']
  )
  returning id into c_bartender;

  insert into public.training_courses (
    category_id, slug, title, description,
    estimated_minutes, is_required, requires_signoff, sort_order, target_roles
  )
  values (
    cat_service,
    'support-staff',
    'Support Staff',
    'Host, busser/barback, runner/expo. The roles that hold the room together.',
    45,
    true,
    false,
    30,
    array['team_member','service_manager','general_manager']
  )
  returning id into c_support;

  insert into public.training_courses (
    category_id, slug, title, description,
    estimated_minutes, is_required, requires_signoff, sort_order, target_roles
  )
  values (
    cat_ops,
    'safety-sanitation',
    'Safety, Sanitation & Security',
    'Food safety, storage, and not poisoning anyone.',
    45,
    true,
    true,
    10,
    array['team_member','service_manager','kitchen_manager','general_manager']
  )
  returning id into c_safety;

  insert into public.training_courses (
    category_id, slug, title, description,
    estimated_minutes, is_required, requires_signoff, sort_order, target_roles
  )
  values (
    cat_ops,
    'menu-knowledge',
    'Menu Knowledge',
    'Every item, every cocktail. Allergens. Pairings.',
    60,
    true,
    false,
    20,
    array['team_member','service_manager','general_manager','catering_manager']
  )
  returning id into c_menu;

  insert into public.training_courses (
    category_id, slug, title, description,
    estimated_minutes, is_required, requires_signoff, sort_order, target_roles
  )
  values (
    cat_ops,
    'opening-closing',
    'Opening & Closing Procedures',
    'What happens before doors open and after the last guest leaves.',
    20,
    true,
    true,
    30,
    array['service_manager','kitchen_manager','general_manager']
  )
  returning id into c_open_close;

  insert into public.training_courses (
    category_id, slug, title, description,
    estimated_minutes, is_required, requires_signoff, sort_order, target_roles
  )
  values (
    cat_ops,
    'alcohol-awareness',
    'Alcohol Awareness',
    'TIPS-adjacent: spot intoxication, refuse service, protect the room.',
    30,
    true,
    true,
    40,
    array['team_member','service_manager','general_manager']
  )
  returning id into c_alcohol;

  -- ===========================================================================
  -- Lessons
  -- ===========================================================================

  -- ---------------------------------------------------------------------------
  -- brand-culture / brand-purpose
  -- ---------------------------------------------------------------------------
  insert into public.training_lessons (course_id, slug, title, position, content, estimated_minutes)
  values (
    c_brand_culture,
    'brand-purpose',
    'Core Values & Brand Purpose',
    10,
$content$*All Roles · Required · Day 1*

:::callout tip Why this matters
Our purpose doesn't change with size, location, or trends. Know it. Live it.
:::

## Brand Purpose — 100-Year Thinking

Ditch exists to create places people feel connected to — to the food, the people they're with, and the moment they're in.

We believe restaurants should be more than transactions. They should be gathering points that bring joy, spark conversation, and leave people feeling better than when they arrived.

As we grow, we are committed to protecting what makes Ditch Ditch — the experience, the energy, the care — ensuring our brand is never diluted in the pursuit of scale, efficiency, or profit.

:::callout warn The Mission
**Growth is the outcome. The experience is the mission.**

This purpose does not change with size, location, or trends.
:::

## The 7 Core Values — Forever, Non-Negotiable

### 1. The Experience Is Sacred

Everything starts with how it feels to be here — for guests and for our team. If something improves margins but weakens the experience, it's the wrong move.

### 2. We Build With Intention

Nothing is accidental — food, design, music, service, culture. We sweat details because details compound into something unforgettable.

### 3. People Over Shortcuts

We choose long-term trust over short-term wins — with guests, staff, partners, and our communities.

### 4. Standards Create Freedom

High standards aren't restrictive — they're what allow us to scale without losing ourselves. Discipline, consistency, and accountability preserve creativity and soul.

### 5. Energy Is Contagious

We bring it. We protect it. **We don't tolerate energy vampires.** The room reflects the people running it.

### 6. Earned, Not Given

Respect, growth, leadership, and opportunity are built through effort and ownership. We reward those who show up, step up, and care deeply.

### 7. Growth Without Erosion

We will scale — but never at the cost of our identity. Expansion only happens if the experience can travel with us.

## Internal Culture

:::checklist
- [ ] We coach, not just manage.
- [ ] We hold standards without ego.
- [ ] We praise publicly and correct privately.
- [ ] We act like owners, not renters.
- [ ] We take pride in being underestimated.
:::

:::callout note External Brand Promise
When someone walks into Ditch — anywhere — they should feel **welcomed, energized, relaxed, and confident they found their spot.**
:::

:::takeaway
- Growth is the outcome — the experience is the mission
- The 7 core values are forever and non-negotiable
- We don't tolerate energy vampires — protect the room
- We act like owners, not renters
- Expansion only happens if the experience can travel with us
- Every guest should feel welcomed, energized, relaxed, and confident
:::
$content$,
    10
  )
  returning id into _ignored_id;

  -- ---------------------------------------------------------------------------
  -- brand-culture / brand-etiquette
  -- ---------------------------------------------------------------------------
  insert into public.training_lessons (course_id, slug, title, position, content, estimated_minutes)
  values (
    c_brand_culture,
    'brand-etiquette',
    'Brand Etiquette & Language',
    20,
$content$*Brand · Required*

:::callout tip Why this matters
One wrong phrase can undo an entire great experience. The right words build trust, loyalty, and bigger tips.
:::

## Forbidden Phrases

*Never say these to a guest — use the Ditch alternative instead.*

| Never Say | Say Instead |
| --- | --- |
| "No problem" | "My pleasure" or "Absolutely" |
| "I don't know" | "Great question — let me find out for you" |
| "That's not my table" | "Let me grab your server" or just help them |
| "We can't do that" | "Here's what I can do for you" |
| "Are you still working on that?" | "How is everything tasting?" |
| "Do you want change?" | Always bring the change back automatically |
| "No" | Find a way to say yes or offer an alternative |
| "You guys" | "Folks", "everyone", or "you all" |

## Service Turnoffs

*Habits that kill the guest experience.*

:::quickref dont Service Turnoffs
- Leaning on walls, counters, or POS stations
- Being on your phone anywhere a guest can see you
- Clustering with other staff and ignoring the floor
- Chewing gum or eating in view of guests
- Eye-rolling, sighing, or showing frustration
- Pointing instead of walking the guest to where they need to go
- Ignoring a guest because they're not in your section
:::

## Etiquette Standards

:::quickref do The Ditch Way
- Make eye contact and smile when speaking with guests
- Use the guest's name if you know it
- Serve and clear from the right, beverages from the left
- Ladies first when serving the table
- Crouch to eye level when speaking with a seated guest
- Say "behind" and "corner" when moving through the restaurant
- Two hands on every plate — never carry with your thumb on the food
- Always walk a guest to the restroom or bar, never point
:::

:::callout tip Pro Tip: The 15/5 Rule
At 15 feet, make eye contact and smile. At 5 feet, verbally greet the guest. This simple habit makes every guest feel acknowledged before they even sit down.
:::

:::takeaway
- Words matter — use Ditch-approved language at all times
- Avoid the forbidden phrases; they undermine the guest experience
- The 15/5 Rule: eye contact at 15 feet, verbal greeting at 5 feet
- When in doubt, find a way to say yes
:::
$content$,
    10
  )
  returning id into _ignored_id;

  -- ---------------------------------------------------------------------------
  -- brand-culture / brand-unhappy
  -- ---------------------------------------------------------------------------
  insert into public.training_lessons (course_id, slug, title, position, content, estimated_minutes)
  values (
    c_brand_culture,
    'brand-unhappy',
    'Handling Unhappy Guests',
    30,
$content$*Brand · Required*

:::callout tip Why this matters
A dissatisfied guest tells an average of 11 people about a bad experience. A recovered guest becomes more loyal than one who never had a problem.
:::

## Why Recovery Matters

Mistakes happen. Food gets delayed, orders get mixed up, drinks get forgotten. What separates great restaurants from average ones is not perfection — it is recovery. Studies show that a guest whose problem is resolved quickly and genuinely is more likely to return than a guest who never had a problem at all.

:::callout warn The 11-Person Rule
A dissatisfied guest tells an average of 11 people about their bad experience. That means one unrecovered complaint can cost you dozens of future guests. Recovery is not optional — it is essential.
:::

## The 4-Step Recovery Process

### 1. Listen

Give the guest your full, undivided attention. Do not interrupt, do not get defensive, and do not make excuses. Let them finish completely before you respond.

- Make eye contact and nod to show you're engaged
- Put down whatever you're doing — they need your full focus
- Never say "but" or try to explain why it happened
- Repeat back what you heard so they know you understand

### 2. Apologize

Offer a sincere, specific apology. Don't use generic phrases. Acknowledge what went wrong and take responsibility.

- "I'm so sorry your steak came out overcooked — that's not our standard"
- "I apologize for the wait — you deserved better"
- Never blame the kitchen, bar, or another team member
- Own it as a team, even if it wasn't your fault

### 3. Fix It

Take immediate action to resolve the problem. If you can fix it, do it now. If you need a manager, get one immediately.

- Refire the item on the fly — don't make them wait again
- Offer an alternative if the same item can't be remade quickly
- Get a manager involved for comps, discounts, or larger issues
- Speed matters — the longer they wait, the angrier they get

### 4. Follow Up

Check back within 2 minutes to make sure the fix worked. Thank them for their patience and make sure they leave happy.

- "How is the new dish? Is that more what you were looking for?"
- Thank them sincerely for giving you the chance to make it right
- A manager visit to the table shows the guest they matter
- End on a positive note — they should leave feeling good about Ditch

:::callout warn When to Escalate to a Manager
Get a manager immediately if a guest raises their voice, requests a manager, has an allergy concern, mentions calling corporate, or if the problem involves a safety issue. Never try to handle an escalated situation alone.
:::

:::takeaway
- Follow the 4 steps in order: Listen, Apologize, Fix, Follow Up
- A recovered guest becomes more loyal than one who never had an issue
- Never blame a teammate — own the problem as a team
- Speed is everything — fix it now, not later
- Escalate to a manager when the situation is beyond your control
:::
$content$,
    10
  )
  returning id into _ignored_id;

  -- ---------------------------------------------------------------------------
  -- server-training / server-station
  -- ---------------------------------------------------------------------------
  insert into public.training_lessons (course_id, slug, title, position, content, estimated_minutes)
  values (
    c_server,
    'server-station',
    'Station Mechanics & Service Flow',
    10,
$content$*Server · Required*

:::callout tip Why this matters
Great servers don't just work hard — they work smart. Station mechanics are the system that keeps you in control, even on the busiest nights.
:::

## Work in Loops

Never make a single-purpose trip. Every time you leave a table or the kitchen, you should be accomplishing multiple tasks. A loop means you are always dropping off, picking up, scanning, and moving — never standing still.

:::quickref do The Loop in Action
- Drop drinks at table 5, clear plates from table 6, check on table 7 — all in one trip
- Grab refills, silverware, or condiments on your way out of the kitchen
- Pre-bus a table every time you pass it, even if it's not yours
- Scan the room as you walk — look for empty glasses, raised hands, dirty plates
- Full hands in, full hands out — never walk empty-handed
:::

## Full Hands In, Full Hands Out

This is the single most important habit you can develop. Every time you walk into the kitchen, bring dirty plates. Every time you walk out, bring something the floor needs. Empty hands mean wasted steps and wasted time.

## Scan the Room

Before you head to the back, take 3 seconds to scan your section and the surrounding area. You will catch problems before they become complaints and spot opportunities to help teammates.

## Rules of Service

:::checklist
- [ ] Serve food from the right side of the guest
- [ ] Serve and clear beverages from the left
- [ ] Ladies first when serving the table
- [ ] Clear only when everyone at the table is finished — never pull plates early
- [ ] Two hands on every plate — thumb never touches the food
- [ ] Carry a crumber or towel for table maintenance between courses
- [ ] Never stack plates in front of the guest — clear one at a time
- [ ] Carry a maximum of what you can handle safely — two trips beats a dropped plate
:::

## Quality Control

**Before Every Plate Leaves the Window**

:::checklist
- [ ] Correct plate for the correct seat number
- [ ] Presentation matches the menu photo and standard
- [ ] All garnishes and sauces are present
- [ ] Plate is clean — no drips, smudges, or fingerprints on the rim
- [ ] Temperature is correct — hot food hot, cold food cold
:::

:::callout warn The Key Principle
Urgency without panic. Move with purpose and speed, but never look rushed or stressed in front of guests. The best servers look calm and in control even when it is chaos behind the scenes.
:::

:::takeaway
- Work in loops — never make a single-purpose trip
- Full hands in, full hands out — no empty-handed trips
- Scan the room before every trip to the back
- Follow the rules of service for professional plate handling
- Quality-check every plate before it leaves the window
- Urgency without panic — stay calm, move with purpose
:::
$content$,
    12
  )
  returning id into _ignored_id;

  -- ---------------------------------------------------------------------------
  -- server-training / server-suggestive
  -- ---------------------------------------------------------------------------
  insert into public.training_lessons (course_id, slug, title, position, content, estimated_minutes)
  values (
    c_server,
    'server-suggestive',
    'Suggestive Selling',
    20,
$content$*Server · Required*

:::callout tip Why this matters
Suggestive selling is not upselling — it is helping guests discover items they will love. It increases your check averages, your tips, and the guest's overall experience.
:::

## The 7 Sales Opportunities

*Every table visit is a chance to suggest something specific.*

### Chips & Guac — *Starter*

Suggest this for every table as soon as they sit down. It's our signature starter and the easiest sell on the menu.

- "Can I get some fresh Chips & Guac started for the table?"
- Don't ask if — ask which: "House-made guac or our queso?"

### Hang 10 Combo — *Value Add*

A fan favorite — highlight the value and variety for groups or indecisive guests.

- "The Hang 10 is perfect for sharing — you get to try a little of everything"
- Great for tables of 3 or more

### Specialty Margaritas — *Beverage*

Lead with a specific margarita recommendation instead of a generic drink question.

- "Our Ditch Rita is the most popular — have you tried it?"
- Mention seasonal or limited-time specialty drinks

### Premium Upgrades — *Upgrade*

Offer top-shelf liquor upgrades and premium add-ons when guests order cocktails.

- "Would you like that with Casamigos or Patron?"
- Suggest extra protein or avocado on bowls and tacos

### Dessert — *Closer*

Never skip the dessert offer. Be specific and enthusiastic — name the item.

- "You have to try our Churros — they're the perfect way to end the meal"
- Offer dessert before presenting the check

### Second Round — *Beverage*

Offer a refill or second cocktail before the glass is empty. Timing is everything.

- "Can I get you another one of those? It looked like you were enjoying it"
- Approach when the drink is about one-third full

### Seasonal & LTOs — *Special*

Always mention limited-time offers and seasonal specials — guests don't know about them unless you tell them.

- "We just launched our new summer menu — the Mango Habanero Tacos are incredible"
- Create urgency: "It's only available this month"

## How to Sell Without Being Pushy

:::quickref do Suggestive Selling Best Practices
- Be specific — say the name of the dish, not "do you want an appetizer?"
- Be enthusiastic — if you love it, they'll want to try it
- Be patient — give them time to think, don't hover
- Share personal favorites — "I always get the..." builds trust
- Read the table — big group celebrating? Suggest sharing plates and cocktails
- Pair items — "That pairs perfectly with our..."
:::

:::quickref dont What to Avoid
- Rapid-fire suggestions that overwhelm the guest
- Suggesting the most expensive item on the menu without context
- Pushing after a guest says no — one suggestion per opportunity
- Being vague: "Do you want anything else?" is not suggestive selling
- Sounding scripted or robotic — be natural and conversational
:::

:::takeaway
- Suggestive selling helps the guest — you're a guide, not a salesperson
- Be specific: name the dish, describe why it's great
- There are 7 natural selling moments in every table visit — use them
- One suggestion per moment — don't overwhelm
- Higher check averages mean higher tips for you
:::
$content$,
    12
  )
  returning id into _ignored_id;

  -- ---------------------------------------------------------------------------
  -- server-training / server-checkout
  -- ---------------------------------------------------------------------------
  insert into public.training_lessons (course_id, slug, title, position, content, estimated_minutes)
  values (
    c_server,
    'server-checkout',
    'Checkout & Payment Procedures',
    30,
$content$*Server · Required*

:::callout tip Why this matters
The checkout experience is the last impression you leave. A smooth, fast close-out makes the guest feel taken care of. A fumbled one undoes the whole meal.
:::

## Payment Methods

### Credit & Debit Cards

The most common payment method. Process promptly and always return the card to the correct guest. Never walk away with a card without telling the guest you are processing it.

### Cash Payments

Always bring the change back to the table. Never ask "Do you want change?" — this is a forbidden phrase. Count the change carefully before returning it to the guest.

### Gift Cards

Swipe gift cards like a credit card in the POS. If the gift card does not cover the full balance, ask the guest for a second form of payment for the remaining amount. Always return the gift card to the guest with the remaining balance printed on the receipt.

### Comps & Voids

Only a manager can authorize comps and voids. Never comp or void an item on your own. If a guest has a complaint that warrants a comp, get your manager to the table first, then process the comp with manager approval in the POS.

## Checkout Procedure

:::steps
1. **Print the Check** — Print the check only when the guest requests it or gives a clear signal they are ready. Never drop the check unsolicited — read the table.
2. **Present the Check** — Place the check in a clean presenter with a working pen. Thank the guest for dining with you as you set it down. "Thank you so much — no rush at all. I'll be right here when you're ready"
3. **Pick Up Payment Promptly** — Once the guest places their card or cash in the presenter, pick it up within 1 minute. Do not let it sit.
4. **Process the Payment** — Process the payment accurately in the POS. For split checks, confirm which items go to which guest before processing. Double-check the amount before swiping or running the card. For splits, confirm the split before processing — not after.
5. **Return the Payment** — Bring back the signed receipt, card, and any change within 2 minutes. Thank the guest again and invite them back. "We hope to see you again soon — have a great night!" Make sure the correct card goes back to the correct guest.
6. **Pre-Bus the Table** — As the guest is preparing to leave, begin pre-bussing the table. Reset it for the next party as soon as they depart.
:::

:::callout warn Cash Handling Rule
Never count money in view of guests. All cash handling and counting must be done at the POS station or in the back. Counting cash at the table looks unprofessional and creates a security risk.
:::

:::callout warn Split Checks
Always ask at the beginning of the meal if the table would like separate checks. Setting up split checks upfront saves time and prevents errors at checkout. If they decide to split later, do it cheerfully — never show frustration.
:::

:::takeaway
- Never ask "Do you want change?" — always bring it back
- Process payments within 2 minutes of receiving them
- Only managers can authorize comps and voids
- Never count cash in view of guests
- Ask about split checks early — not at the end of the meal
- The checkout is your last impression — make it smooth and gracious
:::
$content$,
    10
  )
  returning id into _ignored_id;

  -- ---------------------------------------------------------------------------
  -- server-training / server-sos
  -- ---------------------------------------------------------------------------
  insert into public.training_lessons (course_id, slug, title, position, content, estimated_minutes)
  values (
    c_server,
    'server-sos',
    'Server Steps of Service',
    40,
$content$*Server · Required*

:::callout tip Why this matters
Consistency is what separates good restaurants from great ones. These 8 steps ensure every guest gets a flawless experience every single time.
:::

:::callout note Timing Is Everything
Every step has a time standard. These are not guidelines — they are expectations. Guests notice when you are fast, and they definitely notice when you are slow.
:::

## The 8 Steps of Service

:::steps
1. **Greet the Table — Within 1 Minute** — Approach with energy and a genuine smile. Introduce yourself by name and set the tone for the entire experience. The first 60 seconds determine how the guest feels about you. Make eye contact and smile before you speak. "Welcome to Ditch! My name is ___ and I'll be taking care of you today". Offer water immediately — don't wait to be asked. Read the table: are they in a rush, celebrating, or just hanging out?
2. **Beverage Order — Within 2 Minutes** — Suggest a specific drink before defaulting to "what can I get you?" This is your first opportunity to drive sales and show product knowledge. "Can I start you with one of our Specialty Margaritas? The Ditch Rita is our most popular". Know the cocktail menu cold — guests trust confident recommendations. If they order water, offer sparkling or a zero-proof cocktail. Ring in beverages immediately — do not wait for the food order.
3. **Deliver Beverages & Take Food Order — Within 3 Minutes** — Deliver drinks and take the food order in one trip whenever possible. Suggest Chips & Guac or a starter while they decide. "While you're looking, can I get some Chips & Guac started for the table?" Use suggestive selling: be specific, be enthusiastic, be helpful. Note any allergies or dietary restrictions and repeat them back. Serve beverages from the left side of the guest.
4. **Starter/Appetizer Course — 3-7 Minutes After Order** — Starters should hit the table quickly. Check back after the first few bites to make sure everything is on point. If a starter is taking too long, check with the kitchen proactively. Pre-bus as you go — remove menus, napkin wraps, empty glasses. Two-bite check: come back after the guest has had two bites. "How is everything tasting so far?"
5. **Entree Delivery — 10-15 Minutes After Order** — Deliver entrees to the correct guest without auctioning food. Know your seat numbers and place every plate with confidence. Never auction food — "Who had the fish tacos?" is unacceptable. Use pivot points and seat numbers to deliver without asking. Serve from the right, ladies first. Ensure all condiments, silverware, and extras are on the table before you walk away.
6. **Two-Minute Check Back** — Return within 2 minutes of entree delivery to confirm everything is correct. This is your last chance to catch a problem before it becomes a complaint. "How is everything? Is the steak cooked the way you like it?" Check drinks — offer a refill or a second round. Look at the table: do they need anything you haven't asked about? If something is wrong, fix it immediately — don't wait.
7. **Table Maintenance & Dessert Offer** — Keep the table clean and the experience flowing. Clear finished plates, refill drinks, and suggest dessert when the timing is right. Pre-bus throughout the meal — never let plates stack up. Offer dessert with enthusiasm: "You have to try our Churros — they're incredible". Suggest after-dinner drinks or coffee. Read the table: if they're lingering, let them enjoy; if they're ready, move to checkout.
8. **Present Check & Close Out — Within 2 Minutes of Request** — When the guest is ready, present the check promptly. Process payment quickly and thank them sincerely. Never rush the check — but when they ask, be fast. Present the check in a clean holder with a pen. Process payment within 2 minutes of receiving it. "Thank you so much for coming in! We hope to see you again soon". Pre-bus the table before leaving — set it up for the next guest.
:::

:::callout warn The Golden Rule of Timing
If you are ever unsure whether to check on a table, check on the table. A quick glance, a smile, or a simple "Everything good?" takes two seconds and can prevent a complaint. Neglect is the number one reason guests do not return.
:::

:::takeaway
- Greet within 1 minute — first impressions are everything
- Suggest specific items, don't just take orders
- Never auction food — know your seat numbers
- Two-minute check back on entrees is mandatory, not optional
- Timing standards exist for every step — hit them consistently
- Pre-bus throughout the meal to keep the table clean
- Close the experience with genuine gratitude
:::
$content$,
    20
  )
  returning id into _ignored_id;

  -- ---------------------------------------------------------------------------
  -- bartender-training / bartender-ops
  -- ---------------------------------------------------------------------------
  insert into public.training_lessons (course_id, slug, title, position, content, estimated_minutes)
  values (
    c_bartender,
    'bartender-ops',
    'Bartender Operations',
    10,
$content$*Bar · Required*

:::callout tip Why this matters
The bar is one of the highest-revenue stations in the restaurant. A great bartender drives sales, builds regulars, and keeps the energy up. Master these standards and the bar becomes your stage.
:::

## Bartender Sequence of Service

:::steps
1. **Acknowledge & Greet — Within 30 Seconds** — Every guest who sits at the bar gets acknowledged within 30 seconds, even if you are mid-pour. A nod, a smile, or a quick "I'll be right with you" sets the tone. "Welcome to Ditch! I'm ___ — what can I get started for you?" Place a napkin or coaster in front of the guest immediately. If they need a minute, offer water while they decide.
2. **Take the Order & Suggest** — Listen, suggest, and confirm. Lead with a specific recommendation — don't just ask "what do you want?" "Have you tried our Ditch Rita? It's our most popular margarita". Know the full cocktail, beer, and wine menu — no hesitation. Confirm the order before you start making the drink. Suggest food: "Can I get some Chips & Guac started for you?"
3. **Make & Deliver the Drink** — Build drinks quickly, accurately, and with showmanship. Presentation matters — every cocktail should look as good as it tastes. Follow the recipe card exactly — consistency is key. Use a jigger for every pour — no free-pouring. Garnish every drink properly per the recipe. Place the drink on the napkin/coaster with the logo facing the guest.
4. **Check Back & Maintain** — Check in after the first sip. Keep the bar clean, manage the tab, and stay engaged with every guest. "How does that taste? Is that what you were looking for?" Offer a second drink when the first is one-third full. Keep the bar top clean — wipe down after every guest leaves. Close tabs promptly when guests are ready to leave.
:::

## Bar Station Rules

A clean, organized bar is a fast bar. These rules keep your station running at peak performance all night.

**Station Management Standards**

:::checklist
- [ ] Keep the bar top wiped down and free of clutter at all times
- [ ] Use a jigger for every pour — free-pouring is not allowed
- [ ] Follow the recipe card for every drink — consistency over creativity
- [ ] Wash hands after handling cash, touching your face, or handling garbage
- [ ] Keep the well organized: bottles in the same spot, labels facing out
- [ ] Restock during slow moments — do not wait until you're out
- [ ] Empty garnish trays go to the back immediately — never serve old garnishes
- [ ] Clean as you go: rinse shakers, wipe spills, clear empty glasses
- [ ] Keep the speed rail organized and the ice bin full
- [ ] Run service bar tickets promptly — servers are waiting on those drinks
:::

:::callout note Service Bar Priorities
Service bar tickets are just as important as your bar guests. When a ticket comes in, make the drinks promptly and call for a runner or notify the server. Delays at the service bar create delays on the floor — and frustrated servers mean frustrated guests.
:::

:::callout warn Pour Accuracy
Use a jigger on every single pour. Free-pouring leads to inconsistent drinks, higher liquor costs, and over-serving. The jigger is not a suggestion — it is a requirement. Consistency is what brings guests back for the same drink again and again.
:::

:::takeaway
- Acknowledge every bar guest within 30 seconds
- Lead with specific drink suggestions — know the menu cold
- Use a jigger on every pour — no free-pouring, no exceptions
- Follow the recipe card for every cocktail — consistency wins
- Keep the bar clean, organized, and stocked throughout the shift
- Service bar tickets are a priority — don't let them pile up
- The bar is your stage — bring energy, personality, and professionalism
:::
$content$,
    15
  )
  returning id into _ignored_id;

  -- ---------------------------------------------------------------------------
  -- support-staff / support-host
  -- ---------------------------------------------------------------------------
  insert into public.training_lessons (course_id, slug, title, position, content, estimated_minutes)
  values (
    c_support,
    'support-host',
    'Host Sequence of Service',
    10,
$content$*Support · Required*

:::callout tip Why this matters
The host sets the tone for the entire dining experience. A warm, organized, and confident host makes guests feel welcome before they even sit down.
:::

## The 6-Step Host Sequence

:::steps
1. **Greet Within 15 Seconds** — Every guest who walks through the door gets acknowledged within 15 seconds — even if you are busy with another party. A smile and eye contact go a long way. "Welcome to Ditch! How many are in your party today?" If you're seating someone else, make eye contact and say "I'll be right with you!"
2. **Determine Party Size & Preferences** — Ask how many guests, whether they prefer indoor or patio seating, and if they have a reservation. Check the reservation list and waitlist before seating. Note any special requests: highchairs, booths, accessibility needs.
3. **Quote Wait Times Accurately** — If there is a wait, give an honest estimate. Underpromising and overdelivering is better than the reverse. Put their name on the waitlist and explain the process. "It looks like about a 20-minute wait — I'll text you when your table is ready". Never say "just a few minutes" if it will be longer.
4. **Seat the Guest** — Walk the guest to their table — never point. Walk at a comfortable pace, make small talk, and pull out a chair or indicate the booth. Carry menus in hand and place them neatly at each setting. Introduce the server by name if you can.
5. **Communicate with the Server** — Let the server know they have a new table immediately. If the server is unavailable, flag a manager or nearby teammate so the table is not left waiting. Use the seating chart to balance sections fairly. Never double-seat a server without giving them time to greet the first table.
6. **Farewell the Guest** — When guests leave, thank them sincerely and invite them back. The last words they hear should be warm and genuine. "Thank you for coming to Ditch — we hope to see you again soon!" Open the door for them if you can.
:::

## Seating Guidelines

Smart seating keeps the restaurant running smoothly. Rotate sections evenly so no server gets overwhelmed while others stand around.

:::quickref do Seating Best Practices
- Rotate sections evenly — follow the rotation chart
- Seat large parties at appropriate-sized tables — don't put 2 guests at a 6-top
- Check with the server before double-seating their section
- Seat guests away from bussing stations and kitchen doors when possible
- Keep the waitlist organized and accurate — guests hate being skipped
- Communicate with the kitchen if a large party is being seated
:::

:::quickref dont Host Service Turnoffs
- Ignoring guests at the door while chatting with coworkers
- Staring at your phone or the computer instead of watching the door
- Giving inaccurate wait times — honesty builds trust
- Pointing to a table instead of walking guests there
- Forgetting to tell the server they have a new table
- Showing frustration with difficult or demanding guests
:::

:::takeaway
- Greet every guest within 15 seconds — no exceptions
- Walk guests to their table, never point
- Rotate sections evenly and communicate with servers
- Give honest wait times — underpromise and overdeliver
- The farewell matters as much as the greeting
- You are the first and last face of Ditch — own that responsibility
:::
$content$,
    12
  )
  returning id into _ignored_id;

  -- ---------------------------------------------------------------------------
  -- support-staff / support-busser-barback
  -- ---------------------------------------------------------------------------
  insert into public.training_lessons (course_id, slug, title, position, content, estimated_minutes)
  values (
    c_support,
    'support-busser-barback',
    'Busser & Barback',
    20,
$content$*Support · Required*

:::callout tip Why this matters
Bussers and barbacks are the engine behind every great shift. Without you, servers get overwhelmed, bartenders run out of supplies, and guests wait too long for a clean table.
:::

## Roles & Responsibilities

### Busser

#### The 6-Step Table Reset

Speed and thoroughness are equally important. A table should be fully reset and guest-ready within 3 minutes of the party leaving.

:::steps
1. **Clear the Table** — Remove all plates, glasses, silverware, trash, and debris. Use a bus tub — do not carry armfuls of dishes across the dining room.
2. **Wipe Down the Table** — Use a clean, damp cloth with sanitizer to wipe the entire surface of the table, including edges and undersides where guests touch.
3. **Wipe Down the Seats** — Check and wipe all chairs or booth seats. Remove crumbs, spills, and any debris. Check the floor under the table.
4. **Reset the Table Setting** — Place clean silverware, napkins, and any table-top items (salt, pepper, candle, table number) back in their proper position.
5. **Check the Floor** — Sweep or spot-clean the floor under and around the table. Pick up any fallen food, napkins, or debris.
6. **Signal the Host** — Let the host know the table is clean and ready to seat. A fast reset means faster turns and more revenue.
:::

#### Additional Busser Duties

:::checklist
- [ ] Pre-bus tables during service — clear finished plates and empty glasses
- [ ] Refill water glasses throughout the dining room without being asked
- [ ] Keep the server station stocked with clean plates, glasses, and silverware
- [ ] Empty bus tubs regularly — never let them overflow
- [ ] Assist food runners when needed — deliver bread, condiments, or refills
- [ ] Monitor restrooms for cleanliness and supplies every 30 minutes
:::

### Barback

#### Barback Responsibilities

The barback keeps the bartender stocked and the bar area clean so the bartender can focus on making drinks and serving guests. Anticipate needs before the bartender has to ask.

**Core Barback Duties**

:::checklist
- [ ] Keep ice bins full at all times — check every 15-20 minutes
- [ ] Restock liquor, beer, and wine as bottles empty — know par levels
- [ ] Wash and restock glassware continuously — the bar should never run out of clean glasses
- [ ] Cut and prep garnishes: limes, lemons, oranges, jalapeños, mint, and other cocktail garnishes
- [ ] Restock juices, mixers, syrups, and sodas before they run out
- [ ] Empty trash and recycling behind the bar regularly
- [ ] Keep the bar top, well, and floor clean throughout the shift
- [ ] Run drinks to tables when the bartender is backed up
- [ ] Stock and clean the beer cooler and wine storage
- [ ] Break down and deep-clean the bar at close
:::

:::callout warn Ice Scoop Protocol
NEVER use a glass to scoop ice. If a glass breaks in the ice bin, the entire bin must be emptied, cleaned, and refilled. Always use the designated plastic or metal ice scoop. Store the scoop outside the ice bin on a clean surface — never leave it buried in the ice.
:::

:::takeaway
- Bussers: reset tables within 3 minutes — clear, wipe, reset, sweep, signal
- Barbacks: anticipate needs — restock before the bartender asks
- Never use a glass to scoop ice — always use the designated scoop
- Pre-bus tables during service to keep the dining room clean
- Full hands in, full hands out — every single trip
- Your hustle directly impacts table turns, bar speed, and team success
:::
$content$,
    12
  )
  returning id into _ignored_id;

  -- ---------------------------------------------------------------------------
  -- support-staff / support-runner-expo
  -- ---------------------------------------------------------------------------
  insert into public.training_lessons (course_id, slug, title, position, content, estimated_minutes)
  values (
    c_support,
    'support-runner-expo',
    'Food Runner & Expo',
    30,
$content$*Support · Required*

:::callout tip Why this matters
The food runner and expo are the bridge between the kitchen and the guest. If this link breaks, the entire dining experience suffers — no matter how good the food or the server.
:::

## Roles & Responsibilities

### Food Runner

#### What a Food Runner Does

The food runner delivers food from the kitchen window to the guest's table. Speed, accuracy, and professionalism are everything. You are the last person to touch the food before the guest sees it.

**Food Runner Responsibilities**

:::checklist
- [ ] Deliver food to the correct table and correct seat — no auctioning
- [ ] Use pivot points and seat numbers on every ticket
- [ ] Carry plates safely — two hands, thumb off the food
- [ ] Announce each dish as you place it: "Here's your Baja Fish Tacos"
- [ ] Check that all items for the table are complete before walking away
- [ ] Ask if the guest needs anything else: refills, condiments, extra napkins
- [ ] Communicate with the server about the table's status
:::

### Expo

#### What an Expo Does

The expo is the quality control checkpoint between the kitchen and the dining room. Every plate passes through your hands. You verify accuracy, presentation, and completeness before it leaves the window.

**Expo Responsibilities**

:::checklist
- [ ] Read tickets carefully — match every plate to the order
- [ ] Verify plate presentation matches Ditch standards
- [ ] Check for correct garnishes, sauces, and sides
- [ ] Ensure plates are clean — wipe rims, remove splashes
- [ ] Coordinate timing so all dishes for a table come out together
- [ ] Communicate with the kitchen about timing, refires, and modifications
- [ ] Call out table numbers for runners to deliver
- [ ] Track open tickets and flag delays before they become problems
:::

## The 4 Golden Rules

1. Right food, right guest, right time — verify before you deliver
2. Hot food hot, cold food cold — urgency matters in the window
3. Never auction food — if you don't know the seat, ask the expo or check the ticket
4. Full hands in, full hands out — bring dirty plates back every trip

## Quality Check Before Delivery

**5-Point Quality Check**

:::checklist
- [ ] Correct dish for the correct seat number on the ticket
- [ ] All modifications and allergy notes are followed
- [ ] Presentation is clean — no drips, smudges, or missing garnishes
- [ ] Temperature is correct — hot plates should be hot to the touch
- [ ] All items for the table are ready to go out together
:::

:::callout note Timing & Staging
Food dies in the window. Hot food should be delivered within 30 seconds of hitting the pass. If a plate is sitting, call for a runner immediately. Coordinate with the kitchen to stagger courses and deliver apps before entrees. Timing is what separates a good meal from a great one.
:::

:::takeaway
- The expo is the last line of quality control — nothing leaves without approval
- Food runners deliver with accuracy and speed — no auctioning, ever
- Follow the 4 golden rules on every single delivery
- Run the 5-point quality check before every plate leaves the window
- Hot food dies in the window — deliver within 30 seconds of hitting the pass
- Full hands in, full hands out — every trip
:::
$content$,
    12
  )
  returning id into _ignored_id;

  -- ---------------------------------------------------------------------------
  -- safety-sanitation / safety-food
  -- ---------------------------------------------------------------------------
  insert into public.training_lessons (course_id, slug, title, position, content, estimated_minutes)
  values (
    c_safety,
    'safety-food',
    'Food Safety Fundamentals',
    10,
$content$*Safety · Required*

:::callout tip Why this matters
Foodborne illness can hospitalize guests, shut down the restaurant, and end careers. Every team member is responsible for food safety — no exceptions.
:::

## The 3 Types of Food Hazards

### Biological — *Most Common*

Bacteria, viruses, parasites, and fungi that contaminate food. These are the leading cause of foodborne illness.

- Salmonella, E. coli, Norovirus, Listeria
- Prevented by proper cooking temps, handwashing, and storage

### Chemical — *Dangerous*

Cleaning products, sanitizers, pesticides, or other chemicals that contaminate food through improper storage or use.

- Never store chemicals near or above food
- Always label spray bottles and chemical containers

### Physical — *Foreign Objects*

Hair, glass, metal, plastic, bandages, or any foreign object that ends up in food.

- Wear hair nets and beard guards in the kitchen
- Use blue bandages so they are visible if they fall off

:::callout warn The Danger Zone: 41F - 141F
Bacteria multiply rapidly between 41 and 141 degrees Fahrenheit. Food must not remain in this temperature range for more than 4 hours total. Keep cold food below 41F and hot food above 141F at all times.
:::

## Proper Handwashing — The 6 Steps

:::steps
1. **Wet Hands** — Use warm running water (at least 100F) to wet your hands and forearms.
2. **Apply Soap** — Apply enough soap to create a good lather covering hands and forearms.
3. **Scrub for 20 Seconds** — Scrub hands, between fingers, under nails, and forearms for at least 20 seconds. Sing "Happy Birthday" twice for the right timing.
4. **Rinse Thoroughly** — Rinse all soap from hands and forearms under warm running water.
5. **Dry with Paper Towel** — Dry hands with a single-use paper towel. Never use an apron or shared cloth towel.
6. **Use Paper Towel to Turn Off Faucet** — Use the paper towel to turn off the faucet and open the door so you don't recontaminate your hands.
:::

## When to Wash Your Hands

**Wash Your Hands Every Time You...**

:::checklist
- [ ] Arrive at work and before starting any food prep
- [ ] Switch between raw and ready-to-eat foods
- [ ] Touch your face, hair, or body
- [ ] Use the restroom
- [ ] Handle trash, chemicals, or dirty dishes
- [ ] Sneeze, cough, or blow your nose
- [ ] Handle raw meat, poultry, or seafood
- [ ] Eat, drink, or smoke during a break
- [ ] Touch your phone or any personal items
:::

## The 4 Causes of Unsafe Food

### 1. Time-Temperature Abuse

Food left in the danger zone (41-141F) for too long. This is the most common cause of foodborne illness in restaurants.

- Never leave food sitting out at room temperature
- Use thermometers to verify cooking and holding temps
- Cool hot food quickly: 135F to 70F within 2 hours, then 70F to 41F within 4 hours

### 2. Cross-Contamination

Transfer of harmful bacteria from one food (usually raw) to another through direct contact, shared surfaces, or dirty hands.

- Use separate cutting boards for raw meat and ready-to-eat foods
- Store raw proteins below ready-to-eat foods in the walk-in
- Change gloves between tasks and between handling different proteins

### 3. Poor Personal Hygiene

Employees who do not wash hands properly, work while sick, or fail to follow hygiene standards put every guest at risk.

- Wash hands using the 6-step method every time required
- Do not work if you have vomiting, diarrhea, or jaundice
- Wear clean uniforms and keep nails short and clean

### 4. Contaminated Equipment & Surfaces

Dirty equipment, cutting boards, counters, and utensils spread bacteria to food. Clean and sanitize are two different steps.

- Clean first (remove visible dirt), then sanitize (kill bacteria)
- Sanitize prep surfaces every 4 hours during continuous use
- Test sanitizer concentration with test strips regularly

:::quickref remember Critical Food Safety Rules
- The danger zone is 41F to 141F — keep food out of this range
- Wash hands for 20 seconds minimum, every time
- When in doubt, throw it out — never serve questionable food
- Report illness to your manager before starting your shift
- Clean and sanitize are two separate steps — you need both
:::

:::takeaway
- Three hazard types: biological, chemical, physical
- The danger zone is 41-141F — food cannot stay in this range for more than 4 hours
- Follow the 6-step handwashing procedure every time
- The 4 causes of unsafe food: time-temp abuse, cross-contamination, poor hygiene, dirty equipment
- When in doubt, throw it out — never risk a guest's health
:::
$content$,
    15
  )
  returning id into _ignored_id;

  -- ---------------------------------------------------------------------------
  -- safety-sanitation / safety-storage
  -- ---------------------------------------------------------------------------
  insert into public.training_lessons (course_id, slug, title, position, content, estimated_minutes)
  values (
    c_safety,
    'safety-storage',
    'Receiving & Storage',
    20,
$content$*Safety · Required*

:::callout tip Why this matters
Food safety starts at the back door. If you accept or store food incorrectly, no amount of cooking or prep can fix it. Get it right from the start.
:::

## Receiving Deliveries

Every delivery must be inspected before it is accepted. If something is wrong, reject it immediately — do not accept product that does not meet standards.

**Receiving Inspection Checklist**

:::checklist
- [ ] Check delivery temperature: cold items must be at or below 41F
- [ ] Frozen items must be solidly frozen with no signs of thawing or refreezing
- [ ] Inspect packaging for damage, tears, dents, or leaks
- [ ] Verify quantities match the invoice and purchase order
- [ ] Check expiration and use-by dates on all items
- [ ] Look for signs of pest activity on boxes or packaging
- [ ] Reject any cans that are dented, bulging, or rusted
- [ ] Store deliveries within 15 minutes — do not leave product on the dock
:::

:::callout warn FIFO — First In, First Out
Always rotate stock so that older product is used first. When putting away deliveries, place new product behind existing product. Label everything with the date received. FIFO prevents waste and ensures guests always get the freshest product.
:::

## Shelf Life Reference

| Item | Refrigerated Shelf Life | Storage Notes |
| --- | --- | --- |
| Raw chicken | 1-2 days | Bottom shelf, below all other items |
| Raw ground beef | 1-2 days | Below ready-to-eat foods |
| Raw steak | 3-5 days | Below ready-to-eat foods |
| Raw fish/seafood | 1-2 days | On ice or bottom shelf |
| Prepped guacamole | 1 day | Covered, plastic wrap touching surface |
| Prepped pico de gallo | 2 days | Covered, labeled with date |
| Cut lettuce/greens | 3 days | Covered, away from raw proteins |
| Cooked rice | 3 days | Covered, cooled properly before storing |
| Opened sauces | 5-7 days | Covered, labeled with open date |
| Dairy (milk, cream) | Use by date | Store at 38-41F |

## Storage Order in the Walk-In

Store items in the correct order on shelves to prevent cross-contamination. The rule is simple: ready-to-eat on top, raw proteins on the bottom, organized by cooking temperature.

**Top to Bottom Storage Order**

1. TOP SHELF: Ready-to-eat foods (prepped items, desserts, produce to be served raw)
2. SECOND SHELF: Fruits, vegetables, and items that will be cooked
3. THIRD SHELF: Whole cuts of raw beef and pork (cook to 145F)
4. FOURTH SHELF: Raw ground meats (cook to 155F)
5. BOTTOM SHELF: Raw poultry (cook to 165F) — always the lowest shelf

:::callout warn Freezer Pulls
Never thaw food at room temperature. There are only three safe methods to thaw frozen product: in the refrigerator (plan ahead — this takes 24-48 hours), under cold running water (70F or below), or as part of the cooking process. Thaw in the fridge whenever possible to maintain the cold chain.
:::

## Labeling Standards

Every item that is prepped, opened, or transferred to a new container must be labeled with the item name, the date prepared or opened, and the use-by date. No label means the item gets thrown out — no exceptions.

:::takeaway
- Inspect every delivery — reject anything that doesn't meet standards
- FIFO: First In, First Out — rotate all stock, every time
- Store raw proteins below ready-to-eat foods, ordered by cooking temp
- Never thaw food at room temperature — use the fridge, cold water, or cook from frozen
- Label everything with item name, date, and use-by date
- Store deliveries within 15 minutes of receiving
:::
$content$,
    12
  )
  returning id into _ignored_id;

  -- ---------------------------------------------------------------------------
  -- menu-knowledge / menu-food
  -- ---------------------------------------------------------------------------
  insert into public.training_lessons (course_id, slug, title, position, content, estimated_minutes)
  values (
    c_menu,
    'menu-food',
    'Food Menu Knowledge',
    10,
$content$*Menu · Required*

:::callout tip Why this matters
Guests trust servers who know the menu inside and out. Your product knowledge directly impacts their experience and your check averages.
:::

## The Ditch Menu

### Starters

#### Chips & Guac — *$10*

*Signature, Shareable*

House-made guacamole with warm tortilla chips. Our best seller and the perfect table starter.

#### Chips & Queso — *$9*

*Shareable*

Creamy house-made queso with warm tortilla chips.

#### Chips & Salsa — *$8*

*Shareable*

House-roasted salsa trio with warm tortilla chips.

#### Hang 10 Combo — *$20*

*Best Value, Shareable*

Chips served with guac, queso, and salsa. The ultimate sharing platter for groups.

#### Street Corn — *$9*

*Fan Favorite*

Grilled elote with cotija cheese, chili lime crema, and Tajin.

#### Chicken Wings — *$15*

*Shareable*

Crispy wings tossed in your choice of sauce. Ask about current sauce options.

### Tacos

All tacos served on corn or flour tortillas. Priced per taco.

#### Baja Fish — *$5*

*Signature*

Beer-battered fish, chipotle crema, cabbage slaw, pico de gallo.

#### Carne Asada — *$5*

*Popular*

Grilled marinated steak, onion, cilantro, salsa verde.

#### Chicken Tinga — *$4*

Shredded chicken in smoky chipotle-tomato sauce, queso fresco, pickled onion.

#### Carnitas — *$5*

Slow-braised pork, pineapple salsa, cilantro, onion.

#### Shrimp — *$5*

*Popular*

Grilled or crispy shrimp, avocado crema, cabbage slaw, lime.

#### Veggie — *$4*

*Vegetarian*

Roasted seasonal vegetables, black beans, avocado, cotija cheese.

### Bowls

#### Burrito Bowl — *$21*

*Customizable*

Choice of protein over cilantro-lime rice, black beans, pico, cheese, crema, and guac.

- Proteins: chicken, steak (+$3), carnitas, shrimp (+$3), or veggie

#### Poké Bowl — *$23*

*Fresh*

Ahi tuna or salmon over sushi rice with mango, avocado, cucumber, edamame, and ponzu.

#### Fajita Bowl — *$24*

*Sizzling*

Grilled fajita veggies and protein over rice with cheese, guac, sour cream, and warm tortillas on the side.

#### Power Bowl — *$26*

*Healthy*

Double protein, brown rice, black beans, roasted veggies, avocado, and chimichurri.

### Platos

#### Fajitas — *$26*

*Sizzling, Shareable*

Sizzling skillet with grilled peppers and onions, served with rice, beans, guac, sour cream, and warm tortillas.

- Available in chicken, steak (+$4), shrimp (+$4), or combo (+$4)

#### Enchiladas — *$22*

Three enchiladas with choice of protein, smothered in red or green sauce, with rice and beans.

#### Quesadilla Grande — *$18*

*Shareable*

Oversized flour tortilla with melted cheese and choice of protein, served with guac, sour cream, and pico.

### Handhelds

#### Ditch Burger — *$18*

*Signature*

Double smash patty with American cheese, house sauce, pickles, lettuce, and tomato on a brioche bun. Served with fries.

#### Baja Chicken Sandwich — *$16*

Crispy or grilled chicken with chipotle mayo, avocado, lettuce, and tomato. Served with fries.

#### Burrito — *$15*

*Customizable*

Oversized flour tortilla stuffed with your choice of protein, rice, beans, cheese, and salsa.

#### Lobster Roll — *$35*

*Premium*

Butter-poached lobster on a toasted split-top roll with lemon aioli and chives. Served with fries.

#### Fish & Chips — *$20*

Beer-battered fish fillets with fries, coleslaw, and tartar sauce.

#### Chicken Tenders — *$12*

Hand-breaded chicken tenders with fries and your choice of dipping sauce.

### Dessert

#### Churros — *$8*

*Signature, Shareable*

Cinnamon-sugar churros with chocolate and caramel dipping sauces.

#### Tres Leches — *$8*

*House Made*

Classic three-milk cake topped with whipped cream and fresh berries.

#### Key Lime Pie — *$7*

Tangy key lime filling in a graham cracker crust with whipped cream.

#### Ice Cream Sundae — *$6*

Two scoops with chocolate sauce, whipped cream, and a cherry.

### Kids

For the kiddos. All kids meals come with a beverage. Fruit cup can be swapped for fries at no charge.

#### Kids Fried Chicken Tacos — *$10.85*

*Kids*

Fried chicken, corn tortillas, mixed cheese. Served with a side fruit cup and a beverage.

#### Kids Steak Tacos — *$10.85*

*Kids*

Grilled steak, corn tortillas, mixed cheese. Served with a side fruit cup and a beverage.

#### Kids Baja Fish Tacos — *$10.85*

*Kids*

Fried fish, corn tortillas, mixed cheese. Served with a side fruit cup and a beverage.

#### Kids Grilled Fish Tacos — *$10.85*

*Kids*

Grilled fish, corn tortillas, mixed cheese. Served with a side fruit cup and a beverage.

#### Kids Quesadilla — *$10.85*

*Kids, Customizable*

Corn tortillas, mixed cheese. Served with a side fruit cup and a beverage.

- Add beans +$1
- Add fried chicken +$1
- Add steak +$1

#### Fruit Cup — *$3.25*

*Kids, Side*

Fresh pineapple & watermelon cubes. Available as a kids side or standalone.

:::callout tip Combos & Specials
Always mention the Hang 10 Combo for groups — it is our highest-value starter. Check with your manager before each shift for daily specials, 86'd items, and any limited-time offers to mention at the table.
:::

:::takeaway
- Know every item, price, and description on the menu
- Starters range from $8-$20, tacos $4-$5, bowls $21-$26
- Kids meals are $10.85 and include a beverage — fruit can be swapped for fries
- Be ready to describe ingredients and make recommendations
- Know allergens and dietary options (vegetarian, gluten-free)
- Check for daily specials and 86'd items before every shift
:::
$content$,
    20
  )
  returning id into _ignored_id;

  -- ---------------------------------------------------------------------------
  -- menu-knowledge / menu-cocktails
  -- ---------------------------------------------------------------------------
  insert into public.training_lessons (course_id, slug, title, position, content, estimated_minutes)
  values (
    c_menu,
    'menu-cocktails',
    'Cocktail & Beverage Menu',
    20,
$content$*Menu · Required*

:::callout tip Why this matters
Beverage sales are a major revenue driver. Knowing the cocktail menu lets you suggest the right drink for every guest and boost your check averages.
:::

## The Drink Menu

### Specialty Margs

Our signature margaritas — always lead with these when suggesting a drink.

#### Ditch Rita — *$14*

*Signature, Best Seller*

Our house margarita — Tequila blanco, fresh lime, agave, triple sec. Served on the rocks or frozen.

#### Spicy Mango Marg — *$15*

*Popular*

Tequila blanco, fresh mango puree, lime, agave, and Tajin rim with a chili kick.

#### Skinny Marg — *$13*

*Light*

Tequila blanco, fresh lime, agave. Clean, simple, and low-calorie.

#### Cadillac Marg — *$18*

*Premium*

Reposado tequila, Grand Marnier, fresh lime, agave. Top-shelf upgrade.

#### Frozen Strawberry Marg — *$14*

*Frozen*

Tequila blanco, fresh strawberry puree, lime, agave. Blended smooth.

#### Pitcher Marg — *$29*

*Shareable, Value*

A full pitcher of our Ditch Rita. Serves 3-4 guests. Perfect for groups.

#### Mezcal Marg — *$16*

*Smoky*

Mezcal, lime, agave, triple sec. Smoky and bold for adventurous drinkers.

#### Seasonal Marg — *$15*

*Limited Time*

Rotating seasonal flavor — ask your manager for this week's special.

### House Cocktails

#### Ditch Paloma — *$13*

*Refreshing*

Tequila blanco, fresh grapefruit, lime, soda water, and a salt rim.

#### Spicy Ranch Water — *$12*

*Popular*

Tequila blanco, lime, Topo Chico, and a jalapeño kick.

#### Ditch Mule — *$13*

*Classic Twist*

Tequila blanco, ginger beer, lime, served in a copper mug.

#### Tequila Sunrise — *$12*

Tequila blanco, orange juice, and grenadine. A colorful classic.

#### Michelada — *$12*

*Bold*

Mexican beer with tomato-lime mix, hot sauce, Worcestershire, and a Tajin rim.

### Rum

#### Island Rum Punch — *$12*

*Tropical*

Rum blend, pineapple, orange, coconut cream, and grenadine. Tropical and smooth.

#### Mojito — *$12*

*Classic*

White rum, fresh mint, lime, sugar, and soda water.

#### Dark & Stormy — *$12*

Dark rum, ginger beer, and fresh lime.

#### Coconut Mojito — *$12*

*Tropical*

Coconut rum, fresh mint, lime, coconut cream, and soda water.

:::callout warn Allergen Alert: Island Rum Punch
The Island Rum Punch CONTAINS COCONUT. Always ask guests about nut and coconut allergies before recommending this drink. If a guest has an allergy, suggest the Mojito or Dark & Stormy instead.
:::

### Zero Proof

Non-alcoholic options for designated drivers, non-drinkers, or anyone who wants a special drink without the alcohol.

#### Virgin Ditch Rita — *$6*

*Alcohol-Free*

All the flavor of our signature Ditch Rita without the tequila. Fresh lime, agave, and triple sec substitute.

#### Virgin Mango Marg — *$6*

*Alcohol-Free*

Fresh mango puree, lime, agave, and Tajin rim. Sweet and refreshing.

#### Agua Fresca — *$6*

*House Made*

Rotating seasonal fruit water — ask about today's flavor.

#### Jarritos — *$6*

*Mexican Soda*

Assorted flavors of authentic Mexican soda. Ask for available flavors.

### Beer

#### Draft Beers — *$7*

*Rotating*

Rotating selection of local and craft beers on tap. Ask your bartender for the current lineup.

#### Modelo Especial — *$6*

*Mexican Lager*

Crisp, clean Mexican lager. Our most popular beer.

#### Pacifico — *$6*

*Mexican Lager*

Light, refreshing pilsner-style lager from Mazatlan.

#### Dos Equis — *$6*

*Mexican Lager*

Available in Lager or Ambar. A smooth, easy-drinking classic.

#### Corona — *$6*

*Mexican Lager*

Light, crisp, and always served with a lime wedge.

#### Craft/IPA — *$7*

*Rotating*

Rotating selection of craft and IPA options. Check the beer board.

### Wine

#### House White — *$12 / $46*

*Glass / Bottle*

Crisp, light white wine — changes seasonally. Ask about the current selection.

#### House Red — *$12 / $46*

*Glass / Bottle*

Medium-bodied red wine — changes seasonally. Ask about the current selection.

#### House Rose — *$12 / $46*

*Glass / Bottle*

Dry, refreshing rose — perfect for warm weather. Ask about the current selection.

#### Sparkling — *$12 / $46*

*Glass / Bottle*

Brut sparkling wine. Great for celebrations or as a cocktail base.

:::takeaway
- Specialty Margs are $12-$29 — lead with these when suggesting drinks
- Always mention the Pitcher Marg for groups of 3+
- Zero Proof options start at $6 — always offer them to non-drinkers
- Island Rum Punch contains coconut — always check for allergies
- Know the rotating selections (drafts, craft, seasonal marg, wines)
- Beer ranges $6-$7, wine $12 glass / $46 bottle
:::
$content$,
    15
  )
  returning id into _ignored_id;

  -- ---------------------------------------------------------------------------
  -- opening-closing / opening-duties
  -- ---------------------------------------------------------------------------
  insert into public.training_lessons (course_id, slug, title, position, content, estimated_minutes)
  values (
    c_open_close,
    'opening-duties',
    'Opening Duties',
    10,
$content$*Operations · Required*

:::callout tip Why this matters
A disorganized open means a chaotic service. Every task on this list exists because skipping it creates a problem later. Own your opening.
:::

**Opening Checklist — Complete Every Item Before Service**

:::checklist
- [ ] Clock in on time and in full, clean uniform — check your appearance in the mirror
- [ ] Check the pre-shift notes and daily specials board — know what's 86'd, what's featured, and any VIP reservations
- [ ] Set up your station: stock plates, silverware, napkins, glassware, and condiments to par levels
- [ ] Wipe down and sanitize all tables, chairs, booths, and high-touch surfaces in your section
- [ ] Check that all table settings are complete: menus, salt/pepper, candles, and table numbers
- [ ] Restock the server station: to-go containers, straws, ramekins, extra silverware, and cleaning supplies
- [ ] Verify POS system is operational — log in, check your section assignment, and confirm menu items are up to date
- [ ] Fill ice bins at the server station and bar — do not start service with empty bins
- [ ] Do a walkthrough of your section: check lighting, music volume, floor cleanliness, and restroom status
- [ ] Attend the pre-shift meeting — get updates on specials, goals, reservations, and anything the team needs to know
:::

:::takeaway
- Complete every item on the opening checklist — no shortcuts
- Attend the pre-shift meeting — it sets you up for success
- Know the specials, 86'd items, and VIP reservations before your first table
- A well-stocked station prevents mid-service scrambles
- Your section should be guest-ready before the doors open
:::
$content$,
    8
  )
  returning id into _ignored_id;

  -- ---------------------------------------------------------------------------
  -- opening-closing / closing-duties
  -- ---------------------------------------------------------------------------
  insert into public.training_lessons (course_id, slug, title, position, content, estimated_minutes)
  values (
    c_open_close,
    'closing-duties',
    'Closing Duties',
    20,
$content$*Operations · Required*

:::callout tip Why this matters
The closing crew sets up the opening crew for success. Cutting corners at close means a rough morning for your teammates. Take pride in your close.
:::

**End-of-Shift Closing Checklist**

:::checklist
- [ ] Close out all open checks — verify every table is settled before you cash out
- [ ] Wipe down and sanitize all tables, chairs, booths, and high-touch surfaces in your section
- [ ] Restock your station to opening par levels: silverware, napkins, plates, glassware, condiments, and to-go supplies
- [ ] Break down, clean, and sanitize the server station — counters, bins, and all surfaces
- [ ] Sweep and spot-mop your section, including under tables and booths
:::

## During-Shift Maintenance

Closing is not just the last 30 minutes of your shift. These tasks should happen throughout service to prevent a massive end-of-night cleanup.

**Ongoing During Service**

:::checklist
- [ ] Pre-bus tables continuously — never let plates or glasses pile up
- [ ] Wipe down and reset tables immediately after each party leaves
- [ ] Restock supplies as they run low — do not wait until close
- [ ] Keep the server station organized and clean throughout the shift
- [ ] Check restrooms every 30-60 minutes for cleanliness and supplies
:::

:::takeaway
- Close out all checks before cashing out — no open tabs
- Restock to par levels so the morning crew is set up for success
- Clean as you go during service — it makes closing faster
- Sweep and mop your section, including under tables
- A great close is a gift to the opening team — and to yourself on your next open
:::
$content$,
    8
  )
  returning id into _ignored_id;

  -- ---------------------------------------------------------------------------
  -- alcohol-awareness / alcohol-awareness
  -- ---------------------------------------------------------------------------
  insert into public.training_lessons (course_id, slug, title, position, content, estimated_minutes)
  values (
    c_alcohol,
    'alcohol-awareness',
    'Alcohol Awareness & Responsible Service',
    10,
$content$*Safety · Required*

:::callout tip Why this matters
Serving alcohol irresponsibly can lead to DUIs, injuries, lawsuits, loss of our liquor license, and criminal charges against you personally. This is not optional training.
:::

:::callout warn Legal Consequences
Serving alcohol to a minor or an intoxicated person is a criminal offense. You, personally, can be fined, arrested, and held liable for any harm caused. The restaurant can lose its liquor license and face lawsuits. Take this seriously — your name is on every drink you serve.
:::

## Checking IDs

Card every guest who appears to be under 30 years old. When in doubt, card. A guest will never be offended by being asked for ID — but the consequences of not asking are severe.

**5 Accepted Forms of ID**

:::checklist
- [ ] Valid state-issued driver's license
- [ ] Valid state-issued identification card
- [ ] Valid U.S. passport or passport card
- [ ] Valid U.S. military ID
- [ ] Valid foreign passport with photo
:::

:::callout warn ID Verification
Check the photo, the birth date, and the expiration date on every ID. If the ID is expired, you cannot accept it. If the photo does not match the person, do not serve them. If you suspect a fake ID, get a manager immediately — do not confront the guest yourself.
:::

## Signs of Intoxication

**Watch for These 6 Warning Signs**

:::checklist
- [ ] Slurred or loud speech
- [ ] Glassy, bloodshot, or unfocused eyes
- [ ] Impaired coordination — stumbling, swaying, or difficulty walking
- [ ] Aggressive, argumentative, or overly emotional behavior
- [ ] Ordering drinks rapidly or drinking very quickly
- [ ] Loss of inhibition — inappropriate comments or behavior
:::

## How to Cut a Guest Off — 6 Steps

Cutting someone off is never easy, but it is your legal and moral responsibility. Stay calm, be firm, and be compassionate. Use this 6-step process:

:::steps
1. **Stop Serving Alcohol** — Do not serve another alcoholic beverage. Switch to water or a non-alcoholic option without making a scene.
2. **Notify Your Manager** — Inform your manager immediately. They will come to the table and support you. Never handle a cutoff alone.
3. **Be Polite but Firm** — Speak to the guest privately if possible. Use calm, non-confrontational language. "I want to make sure you get home safely tonight — I'm going to switch you to water". "I care about your safety, and I can't serve any more alcohol right now".
4. **Offer Food and Water** — Suggest food and plenty of water to help the guest sober up before leaving.
5. **Arrange Safe Transportation** — Offer to call a cab, Uber, or Lyft. Never let an intoxicated guest drive. If they insist on driving, call 911. "Can I call you a ride? We want to make sure you get home safe".
6. **Document the Incident** — Write down what happened: the time, what was consumed, what you observed, and what actions were taken. Give this to your manager.
:::

:::callout warn Personal Liability
Under dram shop laws, you can be held personally liable for injuries or damages caused by an intoxicated guest you served. This includes DUI accidents, assaults, and other incidents that occur after the guest leaves. Responsible service protects everyone — including you.
:::

:::quickref escalate When to Get a Manager Immediately
- A guest shows clear signs of intoxication
- You suspect a fake or invalid ID
- A guest becomes aggressive when you stop serving
- An underage person is attempting to order alcohol
- A guest insists on driving while intoxicated
- Any situation where you feel unsafe or unsure
:::

:::takeaway
- Card every guest who appears under 30 — no exceptions
- Only 5 forms of ID are accepted — expired IDs are not valid
- Know the 6 signs of intoxication and watch for them constantly
- Follow the 6-step cutoff procedure — never handle it alone
- You are personally liable for every drink you serve
- When in doubt, get a manager — this is never optional
:::
$content$,
    15
  )
  returning id into _ignored_id;

end;
$$;
