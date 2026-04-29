-- FoodAgent: onboarding v2 — buttons, goals, address modes, profile edit
-- Run AFTER 001_initial_schema.sql

-- ─── users: add edit_mode flag ────────────────────────────────────────────────
alter table users
  add column if not exists edit_mode boolean not null default false;

-- Update onboarding_step to include new steps
-- Drop old constraint first, then recreate
alter table users
  drop constraint if exists users_onboarding_step_check;

alter table users
  add constraint users_onboarding_step_check
    check (onboarding_step in (
      'language', 'name', 'cuisine', 'stop_list',
      'address_mode', 'address', 'goal', 'sweet_pref', 'complete'
    ));

-- ─── preferences: new fields ──────────────────────────────────────────────────
alter table preferences
  add column if not exists goal text
    check (goal in ('diet', 'variety', 'balance')),
  add column if not exists sweet_pref text
    check (sweet_pref in ('loves', 'avoids', 'neutral')),
  add column if not exists address_mode text not null default 'saved'
    check (address_mode in ('saved', 'each_time'));
