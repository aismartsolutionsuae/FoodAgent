-- FoodAgent: remove address_mode and address steps from onboarding
-- Address is now asked per-search, not during profile setup.

alter table users
  drop constraint if exists users_onboarding_step_check;

alter table users
  add constraint users_onboarding_step_check
    check (onboarding_step in (
      'language', 'name', 'cuisine', 'stop_list',
      'goal', 'sweet_pref', 'complete'
    ));

-- Migrate any users stuck in address steps back to goal
update users
  set onboarding_step = 'goal'
  where onboarding_step in ('address_mode', 'address');
