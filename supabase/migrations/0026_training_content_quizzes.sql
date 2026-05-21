-- SWELL — Quizzes for the 17 TrainOS-ported lessons.
-- Each lesson gets one quiz with 4 questions (mix of multiple_choice,
-- true_false, short_answer). Safety/alcohol lessons require a higher passing
-- score and limit retries; the rest are unlimited retries at 75%.

do $$
declare
  _lesson_id uuid;
  _quiz_id   uuid;
  _q_id      uuid;
begin
  -- Idempotency guard: brand-purpose is the first quiz inserted below.
  if exists (
    select 1
    from public.training_quizzes q
    join public.training_lessons l on l.id = q.lesson_id
    where l.slug = 'brand-purpose'
  ) then
    return;
  end if;

  -- =========================================================================
  -- brand-purpose — Core Values & Brand Purpose
  -- =========================================================================
  select id into _lesson_id from public.training_lessons where slug = 'brand-purpose';
  if _lesson_id is not null then
    insert into public.training_quizzes (lesson_id, title, passing_score, retry_limit)
    values (_lesson_id, $q$Core Values & Brand Purpose · Knowledge Check$q$, 75, 0)
    returning id into _quiz_id;

    insert into public.training_quiz_questions (quiz_id, position, kind, prompt, explanation)
    values (
      _quiz_id, 10, 'multiple_choice',
      $q$How many core values does Ditch hold as "forever, non-negotiable"?$q$,
      $q$There are 7 core values, and they are described as forever and non-negotiable.$q$
    )
    returning id into _q_id;
    insert into public.training_quiz_options (question_id, label, is_correct, position) values
      (_q_id, '5', false, 10),
      (_q_id, '7', true,  20),
      (_q_id, '10', false, 30),
      (_q_id, '3', false, 40);

    insert into public.training_quiz_questions (quiz_id, position, kind, prompt, explanation)
    values (
      _quiz_id, 20, 'multiple_choice',
      $q$Which statement best captures the Ditch mission?$q$,
      $q$Growth is the outcome — the experience is the mission. Purpose does not change with size, location, or trends.$q$
    )
    returning id into _q_id;
    insert into public.training_quiz_options (question_id, label, is_correct, position) values
      (_q_id, 'Profit is the mission, experience is a tool',         false, 10),
      (_q_id, 'Growth is the outcome — the experience is the mission', true,  20),
      (_q_id, 'Scale at all costs',                                  false, 30),
      (_q_id, 'Trends drive the brand',                              false, 40);

    insert into public.training_quiz_questions (quiz_id, position, kind, prompt, explanation)
    values (
      _quiz_id, 30, 'true_false',
      $q$Ditch tolerates "energy vampires" as long as they hit their numbers.$q$,
      $q$Energy is contagious — we don't tolerate energy vampires. The room reflects the people running it.$q$
    )
    returning id into _q_id;
    insert into public.training_quiz_options (question_id, label, is_correct, position) values
      (_q_id, 'True',  false, 10),
      (_q_id, 'False', true,  20);

    insert into public.training_quiz_questions (quiz_id, position, kind, prompt, explanation, correct_text)
    values (
      _quiz_id, 40, 'short_answer',
      $q$Finish the phrase: "We act like ______, not renters."$q$,
      $q$Acting like owners — taking ownership of the room and the experience — is part of internal culture.$q$,
      'owners|owner'
    );
  end if;

  -- =========================================================================
  -- brand-etiquette — Brand Etiquette & Language
  -- =========================================================================
  select id into _lesson_id from public.training_lessons where slug = 'brand-etiquette';
  if _lesson_id is not null then
    insert into public.training_quizzes (lesson_id, title, passing_score, retry_limit)
    values (_lesson_id, $q$Brand Etiquette & Language · Knowledge Check$q$, 75, 0)
    returning id into _quiz_id;

    insert into public.training_quiz_questions (quiz_id, position, kind, prompt, explanation)
    values (
      _quiz_id, 10, 'multiple_choice',
      $q$A guest thanks you. What's the Ditch-approved reply?$q$,
      $q$"No problem" is a forbidden phrase — use "My pleasure" or "Absolutely" instead.$q$
    )
    returning id into _q_id;
    insert into public.training_quiz_options (question_id, label, is_correct, position) values
      (_q_id, '"No problem"',  false, 10),
      (_q_id, '"My pleasure"', true,  20),
      (_q_id, '"You bet"',     false, 30),
      (_q_id, '"It''s fine"',   false, 40);

    insert into public.training_quiz_questions (quiz_id, position, kind, prompt, explanation)
    values (
      _quiz_id, 20, 'multiple_choice',
      $q$The 15/5 Rule says you should...$q$,
      $q$At 15 feet, make eye contact and smile. At 5 feet, verbally greet the guest.$q$
    )
    returning id into _q_id;
    insert into public.training_quiz_options (question_id, label, is_correct, position) values
      (_q_id, 'Greet at 15 feet, smile at 5 feet',                  false, 10),
      (_q_id, 'Eye contact and smile at 15 feet, verbal greeting at 5 feet', true, 20),
      (_q_id, 'Greet every guest within 15 minutes',                false, 30),
      (_q_id, 'Spend 5 minutes per table every 15 minutes',         false, 40);

    insert into public.training_quiz_questions (quiz_id, position, kind, prompt, explanation)
    values (
      _quiz_id, 30, 'true_false',
      $q$"You guys" is acceptable when addressing a group of guests.$q$,
      $q$"You guys" is on the forbidden list — use "folks", "everyone", or "you all".$q$
    )
    returning id into _q_id;
    insert into public.training_quiz_options (question_id, label, is_correct, position) values
      (_q_id, 'True',  false, 10),
      (_q_id, 'False', true,  20);

    insert into public.training_quiz_questions (quiz_id, position, kind, prompt, explanation, correct_text)
    values (
      _quiz_id, 40, 'short_answer',
      $q$Food is served from the right; beverages are served and cleared from the ______.$q$,
      $q$Serve and clear food from the right; beverages are served and cleared from the left.$q$,
      'left'
    );
  end if;

  -- =========================================================================
  -- brand-unhappy — Handling Unhappy Guests
  -- =========================================================================
  select id into _lesson_id from public.training_lessons where slug = 'brand-unhappy';
  if _lesson_id is not null then
    insert into public.training_quizzes (lesson_id, title, passing_score, retry_limit)
    values (_lesson_id, $q$Handling Unhappy Guests · Knowledge Check$q$, 75, 0)
    returning id into _quiz_id;

    insert into public.training_quiz_questions (quiz_id, position, kind, prompt, explanation)
    values (
      _quiz_id, 10, 'multiple_choice',
      $q$What is the correct order of the 4-step recovery process?$q$,
      $q$The 4 steps in order are Listen, Apologize, Fix It, Follow Up.$q$
    )
    returning id into _q_id;
    insert into public.training_quiz_options (question_id, label, is_correct, position) values
      (_q_id, 'Apologize, Listen, Fix, Follow Up',  false, 10),
      (_q_id, 'Listen, Apologize, Fix, Follow Up',  true,  20),
      (_q_id, 'Fix, Apologize, Listen, Follow Up',  false, 30),
      (_q_id, 'Listen, Fix, Apologize, Follow Up',  false, 40);

    insert into public.training_quiz_questions (quiz_id, position, kind, prompt, explanation)
    values (
      _quiz_id, 20, 'multiple_choice',
      $q$On average, how many people does a dissatisfied guest tell about a bad experience?$q$,
      $q$The 11-Person Rule: a dissatisfied guest tells an average of 11 people about their bad experience.$q$
    )
    returning id into _q_id;
    insert into public.training_quiz_options (question_id, label, is_correct, position) values
      (_q_id, '3',  false, 10),
      (_q_id, '7',  false, 20),
      (_q_id, '11', true,  30),
      (_q_id, '20', false, 40);

    insert into public.training_quiz_questions (quiz_id, position, kind, prompt, explanation)
    values (
      _quiz_id, 30, 'true_false',
      $q$If the kitchen messed up an order, it's okay to tell the guest that the kitchen made the mistake.$q$,
      $q$Never blame the kitchen, bar, or another team member — own it as a team, even if it wasn't your fault.$q$
    )
    returning id into _q_id;
    insert into public.training_quiz_options (question_id, label, is_correct, position) values
      (_q_id, 'True',  false, 10),
      (_q_id, 'False', true,  20);

    insert into public.training_quiz_questions (quiz_id, position, kind, prompt, explanation, correct_text)
    values (
      _quiz_id, 40, 'short_answer',
      $q$After fixing a guest's problem, you should check back within how many minutes?$q$,
      $q$Follow Up says check back within 2 minutes to make sure the fix worked.$q$,
      '2|two'
    );
  end if;

  -- =========================================================================
  -- server-station — Station Mechanics & Service Flow
  -- =========================================================================
  select id into _lesson_id from public.training_lessons where slug = 'server-station';
  if _lesson_id is not null then
    insert into public.training_quizzes (lesson_id, title, passing_score, retry_limit)
    values (_lesson_id, $q$Station Mechanics & Service Flow · Knowledge Check$q$, 75, 0)
    returning id into _quiz_id;

    insert into public.training_quiz_questions (quiz_id, position, kind, prompt, explanation)
    values (
      _quiz_id, 10, 'multiple_choice',
      $q$"Working in loops" means...$q$,
      $q$A loop means you are always dropping off, picking up, scanning, and moving — never a single-purpose trip.$q$
    )
    returning id into _q_id;
    insert into public.training_quiz_options (question_id, label, is_correct, position) values
      (_q_id, 'Walking the same path every time so you don''t miss anything', false, 10),
      (_q_id, 'Accomplishing multiple tasks on every trip — never a single-purpose trip', true, 20),
      (_q_id, 'Only working tables in your assigned section',                false, 30),
      (_q_id, 'Tracking shifts in 8-hour loops',                             false, 40);

    insert into public.training_quiz_questions (quiz_id, position, kind, prompt, explanation)
    values (
      _quiz_id, 20, 'multiple_choice',
      $q$How should you handle plates while carrying them?$q$,
      $q$Two hands on every plate — thumb never touches the food.$q$
    )
    returning id into _q_id;
    insert into public.training_quiz_options (question_id, label, is_correct, position) values
      (_q_id, 'One hand, thumb on the rim to steady it',  false, 10),
      (_q_id, 'Two hands on every plate, thumb off the food', true, 20),
      (_q_id, 'Stack as many as you can to save trips',   false, 30),
      (_q_id, 'Whatever feels natural',                   false, 40);

    insert into public.training_quiz_questions (quiz_id, position, kind, prompt, explanation)
    values (
      _quiz_id, 30, 'true_false',
      $q$You can clear a plate as soon as one guest at the table is finished eating.$q$,
      $q$Clear only when everyone at the table is finished — never pull plates early.$q$
    )
    returning id into _q_id;
    insert into public.training_quiz_options (question_id, label, is_correct, position) values
      (_q_id, 'True',  false, 10),
      (_q_id, 'False', true,  20);

    insert into public.training_quiz_questions (quiz_id, position, kind, prompt, explanation, correct_text)
    values (
      _quiz_id, 40, 'short_answer',
      $q$Full hands in, full hands ______ — never walk empty-handed.$q$,
      $q$Full hands in, full hands out. Empty hands mean wasted steps and wasted time.$q$,
      'out'
    );
  end if;

  -- =========================================================================
  -- server-suggestive — Suggestive Selling
  -- =========================================================================
  select id into _lesson_id from public.training_lessons where slug = 'server-suggestive';
  if _lesson_id is not null then
    insert into public.training_quizzes (lesson_id, title, passing_score, retry_limit)
    values (_lesson_id, $q$Suggestive Selling · Knowledge Check$q$, 75, 0)
    returning id into _quiz_id;

    insert into public.training_quiz_questions (quiz_id, position, kind, prompt, explanation)
    values (
      _quiz_id, 10, 'multiple_choice',
      $q$When should you offer a second cocktail or refill?$q$,
      $q$Approach when the drink is about one-third full — before the glass is empty.$q$
    )
    returning id into _q_id;
    insert into public.training_quiz_options (question_id, label, is_correct, position) values
      (_q_id, 'After the glass is fully empty',                   false, 10),
      (_q_id, 'When the drink is about one-third full',           true,  20),
      (_q_id, 'Only if the guest asks',                           false, 30),
      (_q_id, 'After they''ve ordered dessert',                   false, 40);

    insert into public.training_quiz_questions (quiz_id, position, kind, prompt, explanation)
    values (
      _quiz_id, 20, 'multiple_choice',
      $q$How many natural sales opportunities does a typical table visit offer?$q$,
      $q$There are 7 sales opportunities in every table visit — chips & guac, Hang 10, specialty margs, premium upgrades, dessert, second round, and seasonals/LTOs.$q$
    )
    returning id into _q_id;
    insert into public.training_quiz_options (question_id, label, is_correct, position) values
      (_q_id, '3', false, 10),
      (_q_id, '5', false, 20),
      (_q_id, '7', true,  30),
      (_q_id, '10', false, 40);

    insert into public.training_quiz_questions (quiz_id, position, kind, prompt, explanation)
    values (
      _quiz_id, 30, 'true_false',
      $q$Asking "Do you want anything else?" counts as suggestive selling.$q$,
      $q$Suggestive selling means being specific — name the dish. Vague questions like "Do you want anything else?" are not suggestive selling.$q$
    )
    returning id into _q_id;
    insert into public.training_quiz_options (question_id, label, is_correct, position) values
      (_q_id, 'True',  false, 10),
      (_q_id, 'False', true,  20);

    insert into public.training_quiz_questions (quiz_id, position, kind, prompt, explanation, correct_text)
    values (
      _quiz_id, 40, 'short_answer',
      $q$Name the signature starter you should suggest to every table as soon as they sit down.$q$,
      $q$Chips & Guac — our signature starter and the easiest sell on the menu.$q$,
      'chips|guac'
    );
  end if;

  -- =========================================================================
  -- server-checkout — Checkout & Payment Procedures
  -- =========================================================================
  select id into _lesson_id from public.training_lessons where slug = 'server-checkout';
  if _lesson_id is not null then
    insert into public.training_quizzes (lesson_id, title, passing_score, retry_limit)
    values (_lesson_id, $q$Checkout & Payment Procedures · Knowledge Check$q$, 75, 0)
    returning id into _quiz_id;

    insert into public.training_quiz_questions (quiz_id, position, kind, prompt, explanation)
    values (
      _quiz_id, 10, 'multiple_choice',
      $q$Who can authorize a comp or void?$q$,
      $q$Only a manager can authorize comps and voids. Never comp or void an item on your own.$q$
    )
    returning id into _q_id;
    insert into public.training_quiz_options (question_id, label, is_correct, position) values
      (_q_id, 'Any server',           false, 10),
      (_q_id, 'Only a manager',       true,  20),
      (_q_id, 'The bartender',        false, 30),
      (_q_id, 'The expo',             false, 40);

    insert into public.training_quiz_questions (quiz_id, position, kind, prompt, explanation)
    values (
      _quiz_id, 20, 'multiple_choice',
      $q$Once the guest places their card or cash in the presenter, how quickly should you pick it up?$q$,
      $q$Pick up payment within 1 minute. Process within 2 minutes of receiving it.$q$
    )
    returning id into _q_id;
    insert into public.training_quiz_options (question_id, label, is_correct, position) values
      (_q_id, 'Within 1 minute',  true,  10),
      (_q_id, 'Within 5 minutes', false, 20),
      (_q_id, 'When you get a chance', false, 30),
      (_q_id, 'After their next refill', false, 40);

    insert into public.training_quiz_questions (quiz_id, position, kind, prompt, explanation)
    values (
      _quiz_id, 30, 'true_false',
      $q$It is okay to count cash at the table as long as you're discreet.$q$,
      $q$Never count money in view of guests. All cash handling must be done at the POS or in the back.$q$
    )
    returning id into _q_id;
    insert into public.training_quiz_options (question_id, label, is_correct, position) values
      (_q_id, 'True',  false, 10),
      (_q_id, 'False', true,  20);

    insert into public.training_quiz_questions (quiz_id, position, kind, prompt, explanation, correct_text)
    values (
      _quiz_id, 40, 'short_answer',
      $q$When should you ask the table about split checks?$q$,
      $q$Always ask at the beginning of the meal — setting up splits upfront saves time and prevents errors.$q$,
      'beginning|start|early|upfront'
    );
  end if;

  -- =========================================================================
  -- server-sos — Server Steps of Service
  -- =========================================================================
  select id into _lesson_id from public.training_lessons where slug = 'server-sos';
  if _lesson_id is not null then
    insert into public.training_quizzes (lesson_id, title, passing_score, retry_limit)
    values (_lesson_id, $q$Server Steps of Service · Knowledge Check$q$, 75, 0)
    returning id into _quiz_id;

    insert into public.training_quiz_questions (quiz_id, position, kind, prompt, explanation)
    values (
      _quiz_id, 10, 'multiple_choice',
      $q$How quickly must you greet a new table?$q$,
      $q$Greet the table within 1 minute — the first 60 seconds determine how the guest feels about you.$q$
    )
    returning id into _q_id;
    insert into public.training_quiz_options (question_id, label, is_correct, position) values
      (_q_id, 'Within 30 seconds', false, 10),
      (_q_id, 'Within 1 minute',   true,  20),
      (_q_id, 'Within 3 minutes',  false, 30),
      (_q_id, 'Within 5 minutes',  false, 40);

    insert into public.training_quiz_questions (quiz_id, position, kind, prompt, explanation)
    values (
      _quiz_id, 20, 'multiple_choice',
      $q$When should the two-minute check back happen?$q$,
      $q$Return within 2 minutes of entree delivery to confirm everything is correct — your last chance to catch a problem.$q$
    )
    returning id into _q_id;
    insert into public.training_quiz_options (question_id, label, is_correct, position) values
      (_q_id, 'Within 2 minutes of entree delivery', true,  10),
      (_q_id, 'When you next walk by',               false, 20),
      (_q_id, 'When the guest waves you over',       false, 30),
      (_q_id, 'After dessert',                       false, 40);

    insert into public.training_quiz_questions (quiz_id, position, kind, prompt, explanation)
    values (
      _quiz_id, 30, 'true_false',
      $q$"Who had the fish tacos?" is an acceptable way to deliver entrees.$q$,
      $q$Never auction food — use pivot points and seat numbers to deliver without asking.$q$
    )
    returning id into _q_id;
    insert into public.training_quiz_options (question_id, label, is_correct, position) values
      (_q_id, 'True',  false, 10),
      (_q_id, 'False', true,  20);

    insert into public.training_quiz_questions (quiz_id, position, kind, prompt, explanation, correct_text)
    values (
      _quiz_id, 40, 'short_answer',
      $q$How many steps are in the Server Steps of Service framework?$q$,
      $q$There are 8 Steps of Service — greet, beverage, deliver/order, starter, entree, two-minute check back, table maintenance/dessert, check & close.$q$,
      '8|eight'
    );
  end if;

  -- =========================================================================
  -- bartender-ops — Bartender Operations
  -- =========================================================================
  select id into _lesson_id from public.training_lessons where slug = 'bartender-ops';
  if _lesson_id is not null then
    insert into public.training_quizzes (lesson_id, title, passing_score, retry_limit)
    values (_lesson_id, $q$Bartender Operations · Knowledge Check$q$, 75, 0)
    returning id into _quiz_id;

    insert into public.training_quiz_questions (quiz_id, position, kind, prompt, explanation)
    values (
      _quiz_id, 10, 'multiple_choice',
      $q$How quickly must every guest at the bar be acknowledged?$q$,
      $q$Acknowledge every bar guest within 30 seconds — even if you are mid-pour.$q$
    )
    returning id into _q_id;
    insert into public.training_quiz_options (question_id, label, is_correct, position) values
      (_q_id, 'Within 15 seconds', false, 10),
      (_q_id, 'Within 30 seconds', true,  20),
      (_q_id, 'Within 1 minute',   false, 30),
      (_q_id, 'When you finish your current drink', false, 40);

    insert into public.training_quiz_questions (quiz_id, position, kind, prompt, explanation)
    values (
      _quiz_id, 20, 'multiple_choice',
      $q$What is the rule for pouring liquor at the bar?$q$,
      $q$Use a jigger on every pour — free-pouring is not allowed, no exceptions.$q$
    )
    returning id into _q_id;
    insert into public.training_quiz_options (question_id, label, is_correct, position) values
      (_q_id, 'Free-pour for speed during a rush', false, 10),
      (_q_id, 'Use a jigger on every single pour', true,  20),
      (_q_id, 'Eyeball it once you have experience', false, 30),
      (_q_id, 'Only jigger top-shelf liquors',     false, 40);

    insert into public.training_quiz_questions (quiz_id, position, kind, prompt, explanation)
    values (
      _quiz_id, 30, 'true_false',
      $q$Service bar tickets can wait until you finish with your bar guests.$q$,
      $q$Service bar tickets are just as important as bar guests. Delays at the service bar create delays on the floor.$q$
    )
    returning id into _q_id;
    insert into public.training_quiz_options (question_id, label, is_correct, position) values
      (_q_id, 'True',  false, 10),
      (_q_id, 'False', true,  20);

    insert into public.training_quiz_questions (quiz_id, position, kind, prompt, explanation, correct_text)
    values (
      _quiz_id, 40, 'short_answer',
      $q$Follow the ______ card for every cocktail — consistency over creativity.$q$,
      $q$Follow the recipe card for every drink. Consistency is what brings guests back.$q$,
      'recipe'
    );
  end if;

  -- =========================================================================
  -- support-host — Host Sequence of Service
  -- =========================================================================
  select id into _lesson_id from public.training_lessons where slug = 'support-host';
  if _lesson_id is not null then
    insert into public.training_quizzes (lesson_id, title, passing_score, retry_limit)
    values (_lesson_id, $q$Host Sequence of Service · Knowledge Check$q$, 75, 0)
    returning id into _quiz_id;

    insert into public.training_quiz_questions (quiz_id, position, kind, prompt, explanation)
    values (
      _quiz_id, 10, 'multiple_choice',
      $q$How quickly must a guest who walks in be acknowledged?$q$,
      $q$Every guest who walks through the door gets acknowledged within 15 seconds — even if you are busy.$q$
    )
    returning id into _q_id;
    insert into public.training_quiz_options (question_id, label, is_correct, position) values
      (_q_id, 'Within 5 seconds',  false, 10),
      (_q_id, 'Within 15 seconds', true,  20),
      (_q_id, 'Within 1 minute',   false, 30),
      (_q_id, 'When a host is free', false, 40);

    insert into public.training_quiz_questions (quiz_id, position, kind, prompt, explanation)
    values (
      _quiz_id, 20, 'multiple_choice',
      $q$The right approach to quoting a wait time is...$q$,
      $q$Give an honest estimate — underpromising and overdelivering is better than the reverse.$q$
    )
    returning id into _q_id;
    insert into public.training_quiz_options (question_id, label, is_correct, position) values
      (_q_id, 'Lowball the time to keep the guest', false, 10),
      (_q_id, 'Underpromise and overdeliver',       true,  20),
      (_q_id, 'Refuse to estimate',                 false, 30),
      (_q_id, 'Always say "just a few minutes"',    false, 40);

    insert into public.training_quiz_questions (quiz_id, position, kind, prompt, explanation)
    values (
      _quiz_id, 30, 'true_false',
      $q$If the dining room is crowded, it is acceptable to point a guest to their table instead of walking them.$q$,
      $q$Walk the guest to their table — never point. Pointing instead of walking is a service turnoff.$q$
    )
    returning id into _q_id;
    insert into public.training_quiz_options (question_id, label, is_correct, position) values
      (_q_id, 'True',  false, 10),
      (_q_id, 'False', true,  20);

    insert into public.training_quiz_questions (quiz_id, position, kind, prompt, explanation, correct_text)
    values (
      _quiz_id, 40, 'short_answer',
      $q$Before seating a new party in a server''s section, you should ______ with the server so they aren''t double-seated.$q$,
      $q$Check with the server before double-seating their section so they have time to greet the first table.$q$,
      'check|communicate|talk|coordinate'
    );
  end if;

  -- =========================================================================
  -- support-busser-barback — Busser & Barback
  -- =========================================================================
  select id into _lesson_id from public.training_lessons where slug = 'support-busser-barback';
  if _lesson_id is not null then
    insert into public.training_quizzes (lesson_id, title, passing_score, retry_limit)
    values (_lesson_id, $q$Busser & Barback · Knowledge Check$q$, 75, 0)
    returning id into _quiz_id;

    insert into public.training_quiz_questions (quiz_id, position, kind, prompt, explanation)
    values (
      _quiz_id, 10, 'multiple_choice',
      $q$A bussed table should be fully reset and guest-ready within how many minutes of the party leaving?$q$,
      $q$A table should be fully reset and guest-ready within 3 minutes. Speed and thoroughness are equally important.$q$
    )
    returning id into _q_id;
    insert into public.training_quiz_options (question_id, label, is_correct, position) values
      (_q_id, '1 minute',  false, 10),
      (_q_id, '3 minutes', true,  20),
      (_q_id, '5 minutes', false, 30),
      (_q_id, '10 minutes', false, 40);

    insert into public.training_quiz_questions (quiz_id, position, kind, prompt, explanation)
    values (
      _quiz_id, 20, 'multiple_choice',
      $q$How often should a barback check the ice bins?$q$,
      $q$Keep ice bins full at all times — check every 15-20 minutes.$q$
    )
    returning id into _q_id;
    insert into public.training_quiz_options (question_id, label, is_correct, position) values
      (_q_id, 'Every 15-20 minutes', true,  10),
      (_q_id, 'Once per hour',       false, 20),
      (_q_id, 'Only when asked',     false, 30),
      (_q_id, 'At the end of each shift only', false, 40);

    insert into public.training_quiz_questions (quiz_id, position, kind, prompt, explanation)
    values (
      _quiz_id, 30, 'true_false',
      $q$You can scoop ice with a clean glass in a pinch.$q$,
      $q$NEVER use a glass to scoop ice. If a glass breaks in the bin, the entire bin must be emptied, cleaned, and refilled.$q$
    )
    returning id into _q_id;
    insert into public.training_quiz_options (question_id, label, is_correct, position) values
      (_q_id, 'True',  false, 10),
      (_q_id, 'False', true,  20);

    insert into public.training_quiz_questions (quiz_id, position, kind, prompt, explanation, correct_text)
    values (
      _quiz_id, 40, 'short_answer',
      $q$Bussers should monitor the restrooms every ______ minutes for cleanliness and supplies.$q$,
      $q$Monitor restrooms for cleanliness and supplies every 30 minutes.$q$,
      '30|thirty'
    );
  end if;

  -- =========================================================================
  -- support-runner-expo — Food Runner & Expo
  -- =========================================================================
  select id into _lesson_id from public.training_lessons where slug = 'support-runner-expo';
  if _lesson_id is not null then
    insert into public.training_quizzes (lesson_id, title, passing_score, retry_limit)
    values (_lesson_id, $q$Food Runner & Expo · Knowledge Check$q$, 75, 0)
    returning id into _quiz_id;

    insert into public.training_quiz_questions (quiz_id, position, kind, prompt, explanation)
    values (
      _quiz_id, 10, 'multiple_choice',
      $q$Hot food should be delivered to the table within how long of hitting the pass?$q$,
      $q$Hot food dies in the window — deliver within 30 seconds of hitting the pass.$q$
    )
    returning id into _q_id;
    insert into public.training_quiz_options (question_id, label, is_correct, position) values
      (_q_id, '30 seconds', true,  10),
      (_q_id, '2 minutes',  false, 20),
      (_q_id, '5 minutes',  false, 30),
      (_q_id, 'Whenever a runner is free', false, 40);

    insert into public.training_quiz_questions (quiz_id, position, kind, prompt, explanation)
    values (
      _quiz_id, 20, 'multiple_choice',
      $q$Who is described as the "last line of quality control" before food leaves the kitchen?$q$,
      $q$The expo is the quality control checkpoint between the kitchen and the dining room — nothing leaves without approval.$q$
    )
    returning id into _q_id;
    insert into public.training_quiz_options (question_id, label, is_correct, position) values
      (_q_id, 'The food runner', false, 10),
      (_q_id, 'The expo',        true,  20),
      (_q_id, 'The line cook',   false, 30),
      (_q_id, 'The server',      false, 40);

    insert into public.training_quiz_questions (quiz_id, position, kind, prompt, explanation)
    values (
      _quiz_id, 30, 'true_false',
      $q$Auctioning food at the table is acceptable when the runner doesn''t know the seat numbers.$q$,
      $q$Never auction food — if you don't know the seat, ask the expo or check the ticket.$q$
    )
    returning id into _q_id;
    insert into public.training_quiz_options (question_id, label, is_correct, position) values
      (_q_id, 'True',  false, 10),
      (_q_id, 'False', true,  20);

    insert into public.training_quiz_questions (quiz_id, position, kind, prompt, explanation, correct_text)
    values (
      _quiz_id, 40, 'short_answer',
      $q$How many points are on the expo''s pre-delivery quality check?$q$,
      $q$The 5-Point Quality Check covers correct dish/seat, modifications/allergies, presentation, temperature, and table-complete timing.$q$,
      '5|five'
    );
  end if;

  -- =========================================================================
  -- safety-food — Food Safety Fundamentals (safety-grade: 80%, 3 retries)
  -- =========================================================================
  select id into _lesson_id from public.training_lessons where slug = 'safety-food';
  if _lesson_id is not null then
    insert into public.training_quizzes (lesson_id, title, passing_score, retry_limit)
    values (_lesson_id, $q$Food Safety Fundamentals · Knowledge Check$q$, 80, 3)
    returning id into _quiz_id;

    insert into public.training_quiz_questions (quiz_id, position, kind, prompt, explanation)
    values (
      _quiz_id, 10, 'multiple_choice',
      $q$What is the temperature danger zone for food?$q$,
      $q$Bacteria multiply rapidly between 41F and 141F. Food must not stay in this range for more than 4 hours total.$q$
    )
    returning id into _q_id;
    insert into public.training_quiz_options (question_id, label, is_correct, position) values
      (_q_id, '32F – 100F',  false, 10),
      (_q_id, '41F – 141F',  true,  20),
      (_q_id, '50F – 165F',  false, 30),
      (_q_id, '70F – 200F',  false, 40);

    insert into public.training_quiz_questions (quiz_id, position, kind, prompt, explanation)
    values (
      _quiz_id, 20, 'multiple_choice',
      $q$How long should you scrub your hands during the 6-step handwashing procedure?$q$,
      $q$Scrub hands, between fingers, under nails, and forearms for at least 20 seconds — sing "Happy Birthday" twice.$q$
    )
    returning id into _q_id;
    insert into public.training_quiz_options (question_id, label, is_correct, position) values
      (_q_id, '5 seconds',  false, 10),
      (_q_id, '10 seconds', false, 20),
      (_q_id, '20 seconds', true,  30),
      (_q_id, '60 seconds', false, 40);

    insert into public.training_quiz_questions (quiz_id, position, kind, prompt, explanation)
    values (
      _quiz_id, 30, 'true_false',
      $q$Cleaning and sanitizing are the same step.$q$,
      $q$Clean first (remove visible dirt), then sanitize (kill bacteria). They are two separate steps and you need both.$q$
    )
    returning id into _q_id;
    insert into public.training_quiz_options (question_id, label, is_correct, position) values
      (_q_id, 'True',  false, 10),
      (_q_id, 'False', true,  20);

    insert into public.training_quiz_questions (quiz_id, position, kind, prompt, explanation, correct_text)
    values (
      _quiz_id, 40, 'short_answer',
      $q$Name one of the three types of food hazards (biological, chemical, or physical).$q$,
      $q$The three hazard types are biological, chemical, and physical.$q$,
      'biological|chemical|physical'
    );
  end if;

  -- =========================================================================
  -- safety-storage — Receiving & Storage (safety-grade: 80%, 3 retries)
  -- =========================================================================
  select id into _lesson_id from public.training_lessons where slug = 'safety-storage';
  if _lesson_id is not null then
    insert into public.training_quizzes (lesson_id, title, passing_score, retry_limit)
    values (_lesson_id, $q$Receiving & Storage · Knowledge Check$q$, 80, 3)
    returning id into _quiz_id;

    insert into public.training_quiz_questions (quiz_id, position, kind, prompt, explanation)
    values (
      _quiz_id, 10, 'multiple_choice',
      $q$What does FIFO stand for in stock rotation?$q$,
      $q$FIFO — First In, First Out. Place new product behind existing product so older stock is used first.$q$
    )
    returning id into _q_id;
    insert into public.training_quiz_options (question_id, label, is_correct, position) values
      (_q_id, 'First In, First Out',  true,  10),
      (_q_id, 'Fast In, Fast Out',    false, 20),
      (_q_id, 'Frozen In, Fresh Out', false, 30),
      (_q_id, 'Fresh Ingredients For Order', false, 40);

    insert into public.training_quiz_questions (quiz_id, position, kind, prompt, explanation)
    values (
      _quiz_id, 20, 'multiple_choice',
      $q$Which item belongs on the BOTTOM shelf of the walk-in?$q$,
      $q$Raw poultry (cook to 165F) is always the lowest shelf — store from ready-to-eat on top to highest cook-temp protein on bottom.$q$
    )
    returning id into _q_id;
    insert into public.training_quiz_options (question_id, label, is_correct, position) values
      (_q_id, 'Ready-to-eat foods',                 false, 10),
      (_q_id, 'Whole cuts of raw beef/pork',        false, 20),
      (_q_id, 'Raw poultry',                        true,  30),
      (_q_id, 'Fruits and vegetables',              false, 40);

    insert into public.training_quiz_questions (quiz_id, position, kind, prompt, explanation)
    values (
      _quiz_id, 30, 'true_false',
      $q$Thawing frozen food on the counter at room temperature is acceptable as long as it''s monitored.$q$,
      $q$Never thaw food at room temperature. Only three safe methods: in the fridge, under cold running water (70F or below), or as part of cooking.$q$
    )
    returning id into _q_id;
    insert into public.training_quiz_options (question_id, label, is_correct, position) values
      (_q_id, 'True',  false, 10),
      (_q_id, 'False', true,  20);

    insert into public.training_quiz_questions (quiz_id, position, kind, prompt, explanation, correct_text)
    values (
      _quiz_id, 40, 'short_answer',
      $q$Deliveries should be stored within how many minutes of receiving?$q$,
      $q$Store deliveries within 15 minutes — do not leave product on the dock.$q$,
      '15|fifteen'
    );
  end if;

  -- =========================================================================
  -- menu-food — Food Menu Knowledge
  -- =========================================================================
  select id into _lesson_id from public.training_lessons where slug = 'menu-food';
  if _lesson_id is not null then
    insert into public.training_quizzes (lesson_id, title, passing_score, retry_limit)
    values (_lesson_id, $q$Food Menu Knowledge · Knowledge Check$q$, 75, 0)
    returning id into _quiz_id;

    insert into public.training_quiz_questions (quiz_id, position, kind, prompt, explanation)
    values (
      _quiz_id, 10, 'multiple_choice',
      $q$How much is the Hang 10 Combo?$q$,
      $q$The Hang 10 Combo is $20 — chips with guac, queso, and salsa. It''s the best-value shareable starter.$q$
    )
    returning id into _q_id;
    insert into public.training_quiz_options (question_id, label, is_correct, position) values
      (_q_id, '$10', false, 10),
      (_q_id, '$15', false, 20),
      (_q_id, '$20', true,  30),
      (_q_id, '$26', false, 40);

    insert into public.training_quiz_questions (quiz_id, position, kind, prompt, explanation)
    values (
      _quiz_id, 20, 'multiple_choice',
      $q$All kids meals are priced at...$q$,
      $q$Kids meals are $10.85 and include a beverage. Fruit cup can be swapped for fries at no charge.$q$
    )
    returning id into _q_id;
    insert into public.training_quiz_options (question_id, label, is_correct, position) values
      (_q_id, '$8.50',  false, 10),
      (_q_id, '$9.99',  false, 20),
      (_q_id, '$10.85', true,  30),
      (_q_id, '$12.00', false, 40);

    insert into public.training_quiz_questions (quiz_id, position, kind, prompt, explanation)
    values (
      _quiz_id, 30, 'true_false',
      $q$The Lobster Roll is the most expensive handheld on the menu at $35.$q$,
      $q$The Lobster Roll is the premium handheld at $35 — butter-poached lobster on a toasted split-top roll with lemon aioli and chives.$q$
    )
    returning id into _q_id;
    insert into public.training_quiz_options (question_id, label, is_correct, position) values
      (_q_id, 'True',  true,  10),
      (_q_id, 'False', false, 20);

    insert into public.training_quiz_questions (quiz_id, position, kind, prompt, explanation, correct_text)
    values (
      _quiz_id, 40, 'short_answer',
      $q$Name the signature dessert that is also marked as shareable on the menu.$q$,
      $q$Churros — cinnamon-sugar churros with chocolate and caramel dipping sauces, our signature shareable dessert.$q$,
      'churros|churro'
    );
  end if;

  -- =========================================================================
  -- menu-cocktails — Cocktail & Beverage Menu
  -- =========================================================================
  select id into _lesson_id from public.training_lessons where slug = 'menu-cocktails';
  if _lesson_id is not null then
    insert into public.training_quizzes (lesson_id, title, passing_score, retry_limit)
    values (_lesson_id, $q$Cocktail & Beverage Menu · Knowledge Check$q$, 75, 0)
    returning id into _quiz_id;

    insert into public.training_quiz_questions (quiz_id, position, kind, prompt, explanation)
    values (
      _quiz_id, 10, 'multiple_choice',
      $q$Which cocktail contains coconut and requires an allergy check before recommending?$q$,
      $q$The Island Rum Punch CONTAINS COCONUT. Always ask about nut and coconut allergies before recommending it.$q$
    )
    returning id into _q_id;
    insert into public.training_quiz_options (question_id, label, is_correct, position) values
      (_q_id, 'Ditch Rita',         false, 10),
      (_q_id, 'Spicy Mango Marg',   false, 20),
      (_q_id, 'Island Rum Punch',   true,  30),
      (_q_id, 'Ditch Mule',         false, 40);

    insert into public.training_quiz_questions (quiz_id, position, kind, prompt, explanation)
    values (
      _quiz_id, 20, 'multiple_choice',
      $q$How much is the Pitcher Marg, and how many guests does it serve?$q$,
      $q$The Pitcher Marg is $29 and serves 3-4 guests — perfect for groups.$q$
    )
    returning id into _q_id;
    insert into public.training_quiz_options (question_id, label, is_correct, position) values
      (_q_id, '$20, serves 2',   false, 10),
      (_q_id, '$29, serves 3-4', true,  20),
      (_q_id, '$40, serves 5-6', false, 30),
      (_q_id, '$14, serves 1',   false, 40);

    insert into public.training_quiz_questions (quiz_id, position, kind, prompt, explanation)
    values (
      _quiz_id, 30, 'true_false',
      $q$Zero-proof cocktails should only be offered if the guest specifically asks for non-alcoholic options.$q$,
      $q$Zero Proof options start at $6 — always offer them to non-drinkers, designated drivers, or anyone who wants a special drink without alcohol.$q$
    )
    returning id into _q_id;
    insert into public.training_quiz_options (question_id, label, is_correct, position) values
      (_q_id, 'True',  false, 10),
      (_q_id, 'False', true,  20);

    insert into public.training_quiz_questions (quiz_id, position, kind, prompt, explanation, correct_text)
    values (
      _quiz_id, 40, 'short_answer',
      $q$Name the signature, best-selling house margarita.$q$,
      $q$The Ditch Rita is our house margarita and best seller — tequila blanco, fresh lime, agave, triple sec.$q$,
      'ditch rita|ditch-rita|rita'
    );
  end if;

  -- =========================================================================
  -- opening-duties — Opening Duties
  -- =========================================================================
  select id into _lesson_id from public.training_lessons where slug = 'opening-duties';
  if _lesson_id is not null then
    insert into public.training_quizzes (lesson_id, title, passing_score, retry_limit)
    values (_lesson_id, $q$Opening Duties · Knowledge Check$q$, 75, 0)
    returning id into _quiz_id;

    insert into public.training_quiz_questions (quiz_id, position, kind, prompt, explanation)
    values (
      _quiz_id, 10, 'multiple_choice',
      $q$Before service, you should know all of the following EXCEPT...$q$,
      $q$The opening checklist requires knowing what's 86'd, what's featured, and any VIP reservations. Closing payroll numbers are not part of opening prep.$q$
    )
    returning id into _q_id;
    insert into public.training_quiz_options (question_id, label, is_correct, position) values
      (_q_id, '86''d items',           false, 10),
      (_q_id, 'Daily specials',        false, 20),
      (_q_id, 'VIP reservations',      false, 30),
      (_q_id, 'Yesterday''s closing payroll numbers', true, 40);

    insert into public.training_quiz_questions (quiz_id, position, kind, prompt, explanation)
    values (
      _quiz_id, 20, 'multiple_choice',
      $q$What is the first item on the opening checklist?$q$,
      $q$Clock in on time and in full, clean uniform — check your appearance in the mirror.$q$
    )
    returning id into _q_id;
    insert into public.training_quiz_options (question_id, label, is_correct, position) values
      (_q_id, 'Fill the ice bins',                       false, 10),
      (_q_id, 'Clock in on time in full, clean uniform', true,  20),
      (_q_id, 'Attend the pre-shift meeting',            false, 30),
      (_q_id, 'Wipe down all tables',                    false, 40);

    insert into public.training_quiz_questions (quiz_id, position, kind, prompt, explanation)
    values (
      _quiz_id, 30, 'true_false',
      $q$The pre-shift meeting is optional if you arrived on time and finished your station setup.$q$,
      $q$Attend the pre-shift meeting — get updates on specials, goals, reservations, and anything the team needs to know.$q$
    )
    returning id into _q_id;
    insert into public.training_quiz_options (question_id, label, is_correct, position) values
      (_q_id, 'True',  false, 10),
      (_q_id, 'False', true,  20);

    insert into public.training_quiz_questions (quiz_id, position, kind, prompt, explanation, correct_text)
    values (
      _quiz_id, 40, 'short_answer',
      $q$Stations should be stocked to ______ levels before service starts.$q$,
      $q$Stock plates, silverware, napkins, glassware, and condiments to par levels.$q$,
      'par'
    );
  end if;

  -- =========================================================================
  -- closing-duties — Closing Duties
  -- =========================================================================
  select id into _lesson_id from public.training_lessons where slug = 'closing-duties';
  if _lesson_id is not null then
    insert into public.training_quizzes (lesson_id, title, passing_score, retry_limit)
    values (_lesson_id, $q$Closing Duties · Knowledge Check$q$, 75, 0)
    returning id into _quiz_id;

    insert into public.training_quiz_questions (quiz_id, position, kind, prompt, explanation)
    values (
      _quiz_id, 10, 'multiple_choice',
      $q$Before you cash out at the end of your shift, you must...$q$,
      $q$Close out all open checks — verify every table is settled before you cash out. No open tabs.$q$
    )
    returning id into _q_id;
    insert into public.training_quiz_options (question_id, label, is_correct, position) values
      (_q_id, 'Mop the entire dining room',         false, 10),
      (_q_id, 'Close out all open checks',          true,  20),
      (_q_id, 'Count the entire bar''s till',       false, 30),
      (_q_id, 'Restock the walk-in',                false, 40);

    insert into public.training_quiz_questions (quiz_id, position, kind, prompt, explanation)
    values (
      _quiz_id, 20, 'multiple_choice',
      $q$Restrooms should be checked for cleanliness and supplies every...$q$,
      $q$Check restrooms every 30-60 minutes for cleanliness and supplies.$q$
    )
    returning id into _q_id;
    insert into public.training_quiz_options (question_id, label, is_correct, position) values
      (_q_id, '5-10 minutes',  false, 10),
      (_q_id, '30-60 minutes', true,  20),
      (_q_id, '2-3 hours',     false, 30),
      (_q_id, 'Only at close', false, 40);

    insert into public.training_quiz_questions (quiz_id, position, kind, prompt, explanation)
    values (
      _quiz_id, 30, 'true_false',
      $q$Closing is just the last 30 minutes of your shift.$q$,
      $q$Closing is not just the last 30 minutes. Pre-bus continuously, restock as supplies run low, and clean as you go.$q$
    )
    returning id into _q_id;
    insert into public.training_quiz_options (question_id, label, is_correct, position) values
      (_q_id, 'True',  false, 10),
      (_q_id, 'False', true,  20);

    insert into public.training_quiz_questions (quiz_id, position, kind, prompt, explanation, correct_text)
    values (
      _quiz_id, 40, 'short_answer',
      $q$You should restock your station to opening ______ levels before you leave.$q$,
      $q$Restock your station to opening par levels — silverware, napkins, plates, glassware, condiments, and to-go supplies.$q$,
      'par'
    );
  end if;

  -- =========================================================================
  -- alcohol-awareness — Alcohol Awareness (safety-grade: 80%, 3 retries)
  -- =========================================================================
  select id into _lesson_id from public.training_lessons where slug = 'alcohol-awareness';
  if _lesson_id is not null then
    insert into public.training_quizzes (lesson_id, title, passing_score, retry_limit)
    values (_lesson_id, $q$Alcohol Awareness & Responsible Service · Knowledge Check$q$, 80, 3)
    returning id into _quiz_id;

    insert into public.training_quiz_questions (quiz_id, position, kind, prompt, explanation)
    values (
      _quiz_id, 10, 'multiple_choice',
      $q$You should card every guest who appears to be under what age?$q$,
      $q$Card every guest who appears to be under 30. When in doubt, card.$q$
    )
    returning id into _q_id;
    insert into public.training_quiz_options (question_id, label, is_correct, position) values
      (_q_id, '21', false, 10),
      (_q_id, '25', false, 20),
      (_q_id, '30', true,  30),
      (_q_id, '40', false, 40);

    insert into public.training_quiz_questions (quiz_id, position, kind, prompt, explanation)
    values (
      _quiz_id, 20, 'multiple_choice',
      $q$Which of the following is NOT one of the 5 accepted forms of ID?$q$,
      $q$Accepted forms: state driver''s license, state ID card, U.S. passport/passport card, U.S. military ID, valid foreign passport with photo. A student ID is not accepted.$q$
    )
    returning id into _q_id;
    insert into public.training_quiz_options (question_id, label, is_correct, position) values
      (_q_id, 'Valid state-issued driver''s license', false, 10),
      (_q_id, 'Valid U.S. military ID',               false, 20),
      (_q_id, 'College student ID',                   true,  30),
      (_q_id, 'Valid U.S. passport',                  false, 40);

    insert into public.training_quiz_questions (quiz_id, position, kind, prompt, explanation)
    values (
      _quiz_id, 30, 'true_false',
      $q$Under dram shop laws, you can be held personally liable for injuries caused by an intoxicated guest you served.$q$,
      $q$Under dram shop laws, you can be held personally liable for injuries or damages caused by an intoxicated guest you served — including DUI accidents.$q$
    )
    returning id into _q_id;
    insert into public.training_quiz_options (question_id, label, is_correct, position) values
      (_q_id, 'True',  true,  10),
      (_q_id, 'False', false, 20);

    insert into public.training_quiz_questions (quiz_id, position, kind, prompt, explanation, correct_text)
    values (
      _quiz_id, 40, 'short_answer',
      $q$An intoxicated guest insists on driving home. You should call ______.$q$,
      $q$Never let an intoxicated guest drive. If they insist on driving, call 911.$q$,
      '911'
    );
  end if;

end;
$$;
