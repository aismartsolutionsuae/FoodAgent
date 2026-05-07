-- FoodAgent: remove sweet_pref from onboarding steps (moved to stop-list)
-- sweet_pref column in preferences kept for backward compat but no longer used in flow.

alter table users
  drop constraint if exists users_onboarding_step_check;

alter table users
  add constraint users_onboarding_step_check
    check (onboarding_step in (
      'language', 'name', 'cuisine', 'stop_list',
      'vegan', 'light_vegan',
      'goal', 'complete'
    ));

-- Migrate users stuck on sweet_pref step to complete
update users
  set onboarding_step = 'complete'
  where onboarding_step = 'sweet_pref';
