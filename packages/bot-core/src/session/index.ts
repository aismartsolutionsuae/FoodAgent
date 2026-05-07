import type { StorageAdapter } from 'grammy'
import { supabase } from '@portfolio/database'

// Base session shape — extend per project:
//   interface MySession extends SessionData { step?: 'foo' | 'bar' }
export interface SessionData {
  // Extended by individual projects
  [key: string]: unknown
}

// Supabase storage adapter for @grammyjs/session.
// Stores JSON blobs in the `bot_sessions` table (key TEXT PRIMARY KEY, value JSONB).
export function createSupabaseSessionStorage<T extends SessionData>(): StorageAdapter<T> {
  return {
    async read(key: string): Promise<T | undefined> {
      const { data } = await supabase
        .from('bot_sessions')
        .select('value')
        .eq('key', key)
        .maybeSingle()
      return (data?.value as T) ?? undefined
    },
    async write(key: string, value: T): Promise<void> {
      await supabase
        .from('bot_sessions')
        .upsert({ key, value }, { onConflict: 'key' })
    },
    async delete(key: string): Promise<void> {
      await supabase.from('bot_sessions').delete().eq('key', key)
    },
  }
}
