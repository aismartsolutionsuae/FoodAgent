import { createClient } from '@supabase/supabase-js'

// ── Primitive types ────────────────────────────────────────────────────────────

export type Language = 'ru' | 'en' | 'ar'

// Omnichannel identity channels — see DECISIONS.md 2026-05-15.
export type Channel = 'telegram' | 'web' | 'whatsapp'

export type SubscriptionStatus = 'trial' | 'active' | 'expired' | 'cancelled'

// ── Shared DB row types ────────────────────────────────────────────────────────
// Mirror the shared schema in packages/database/migrations/000_shared_bot_core.sql.
// Product-specific row types live in projects/[name]/, NOT here.

// users — channel-agnostic person record, one row per (person, project_id).
export interface DbUser {
  id: string
  project_id: string
  language: Language
  created_at: string
}

// user_identities — a person's reachable channels. project_id denormalized
// from users for the UNIQUE(channel, channel_user_id, project_id) constraint.
export interface DbUserIdentity {
  id: string
  user_id: string
  project_id: string
  channel: Channel
  channel_user_id: string
  created_at: string
}

// NOTE (flagged 2026-05-15): the `subscriptions` table is referenced
// generically by bot-core (transport, payments) but currently has NO shared
// migration — it was only created by food-agent's deleted migration. Either a
// shared `subscriptions` migration must be added (subscriptions are shared
// billing infra) or this type moves product-specific. Decision pending in
// Волна 2 / database audit. Type kept so bot-core still typechecks.
export interface DbSubscription {
  id: string
  user_id: string
  trial_started_at: string
  trial_expires_at: string
  status: SubscriptionStatus
  ls_subscription_id: string | null
  ls_customer_id: string | null
  current_period_end: string | null
}

// ── Supabase client factory ────────────────────────────────────────────────────
// Server-only: uses SERVICE_ROLE key, bypasses RLS. Never import in client code.

export function createSupabaseClient() {
  const url = process.env.SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set')
  return createClient(url, key)
}

// Singleton for packages that don't need per-request isolation
export const supabase = createClient(
  process.env.SUPABASE_URL ?? '',
  process.env.SUPABASE_SERVICE_ROLE_KEY ?? '',
)
