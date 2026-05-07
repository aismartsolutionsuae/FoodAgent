-- FoodAgent: restore 'address' as optional onboarding step (soft location request)

alter table users
  drop constraint if exists users_onboarding_step_check;

alter table users
  add constraint users_onboarding_step_check
    check (onboarding_step in (
      'language', 'name', 'cuisine', 'stop_list',
      'vegan', 'light_vegan', 'goal', 'address', 'complete'
    ));
