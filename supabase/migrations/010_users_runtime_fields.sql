alter table users
  add column if not exists edit_mode boolean not null default false,
  add column if not exists last_query text;
