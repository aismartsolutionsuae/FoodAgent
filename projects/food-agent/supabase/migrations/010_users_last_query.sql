-- FoodAgent: store last search query per user for "Surprise me" feature
alter table users
  add column if not exists last_query text;
