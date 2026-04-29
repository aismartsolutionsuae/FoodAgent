-- FoodAgent: performance indexes

create index if not exists idx_users_telegram_id
  on users(telegram_id);

create index if not exists idx_subscriptions_user_id
  on subscriptions(user_id);

create index if not exists idx_subscriptions_status
  on subscriptions(status);

create index if not exists idx_price_cache_expires_at
  on price_cache(expires_at);

create index if not exists idx_search_history_user_id
  on search_history(user_id, created_at desc);
