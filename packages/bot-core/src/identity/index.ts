import { supabase, type DbUser, type Channel } from '@portfolio/database'

// resolveUser — omnichannel get-or-create. Looks up a user by their channel
// identity within a project; creates the user + identity if absent. Used by
// every channel adapter (Telegram now; web/whatsapp later) so identity logic
// lives in one place. See DECISIONS.md 2026-05-15.
//
// Concurrency: user_identities has UNIQUE(channel, channel_user_id,
// project_id). If two messages from a brand-new user race, the second
// identity insert fails the constraint; we drop our orphan user row and
// re-resolve to the winner.
export async function resolveUser(
  channel: Channel,
  channelUserId: string,
  projectId: string,
): Promise<DbUser> {
  const findIdentity = async () =>
    supabase
      .from('user_identities')
      .select('user_id')
      .eq('channel', channel)
      .eq('channel_user_id', channelUserId)
      .eq('project_id', projectId)
      .maybeSingle()

  const fetchUser = async (id: string) =>
    supabase.from('users').select('*').eq('id', id).single()

  const { data: identity } = await findIdentity()
  if (identity?.user_id) {
    const { data: user } = await fetchUser(identity.user_id)
    if (user) return user as DbUser
  }

  const { data: created, error: userErr } = await supabase
    .from('users')
    .insert({ project_id: projectId })
    .select('*')
    .single()
  if (userErr || !created) {
    throw new Error(`resolveUser: failed to create user: ${userErr?.message ?? 'unknown'}`)
  }

  const { error: idErr } = await supabase.from('user_identities').insert({
    user_id: created.id,
    project_id: projectId,
    channel,
    channel_user_id: channelUserId,
  })

  if (idErr) {
    // Lost the race — another request created the identity first.
    await supabase.from('users').delete().eq('id', created.id)
    const { data: winner } = await findIdentity()
    if (!winner?.user_id) {
      throw new Error(`resolveUser: identity insert failed and no winner found: ${idErr.message}`)
    }
    const { data: user } = await fetchUser(winner.user_id)
    if (!user) throw new Error('resolveUser: winner user row missing')
    return user as DbUser
  }

  return created as DbUser
}
