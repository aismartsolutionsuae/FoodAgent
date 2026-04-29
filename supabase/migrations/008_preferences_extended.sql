-- FoodAgent: extend preferences with restaurant lists, platforms, rating threshold

alter table preferences
  add column if not exists preferred_restaurants text[] not null default '{}',
  add column if not exists restaurant_stop_list  text[] not null default '{}',
  add column if not exists active_platforms      text[] not null default '{"talabat","deliveroo"}',
  add column if not exists min_rating            numeric not null default 4.0;
