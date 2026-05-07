-- FoodAgent: add vegan/diet-type step to onboarding and preferences

-- ─── preferences: add vegan_type column ──────────────────────────────────────
alter table preferences
  add column if not exists vegan_type text
    check (vegan_type in ('none', 'strict', 'light'));

-- ─── users: update onboarding_step constraint ─────────────────────────────────
alter table users
  drop constraint if exists users_onboarding_step_check;

alter table users
  add constraint users_onboarding_step_check
    check (onboarding_step in (
      'language', 'name', 'cuisine', 'stop_list',
      'vegan', 'light_vegan',
      'goal', 'sweet_pref', 'complete'
    ));
