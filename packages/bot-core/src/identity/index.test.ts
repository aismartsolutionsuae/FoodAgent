import { describe, it, expect, vi, beforeEach } from 'vitest'

// Scripted Supabase mock. resolveUser issues, in order, some of:
//   user_identities.select().eq().eq().eq().maybeSingle()   → findIdentity
//   users.select('*').eq('id',_).single()                   → fetchUser
//   users.insert({...}).select('*').single()                → userInsert
//   user_identities.insert({...})                           → identityInsert
//   users.delete().eq('id',_)                               → userDelete
const calls: string[] = []
let identityResults: Array<{ data: { user_id: string } | null }>
let userSelectResults: Array<{ data: { id: string } | null }>
let userInsertResult: { data: { id: string } | null; error: { message: string } | null }
let identityInsertResult: { error: { message: string } | null }

const fromMock = vi.fn((table: string) => {
  if (table === 'user_identities') {
    return {
      select: () => ({
        eq: () => ({ eq: () => ({ eq: () => ({
          maybeSingle: () => { calls.push('findIdentity'); return Promise.resolve(identityResults.shift()!) },
        }) }) }),
      }),
      insert: () => { calls.push('identityInsert'); return Promise.resolve(identityInsertResult) },
    }
  }
  // users
  return {
    select: () => ({ eq: () => ({ single: () => { calls.push('userSelect'); return Promise.resolve(userSelectResults.shift()!) } }) }),
    insert: () => ({ select: () => ({ single: () => { calls.push('userInsert'); return Promise.resolve(userInsertResult) } }) }),
    delete: () => ({ eq: () => { calls.push('userDelete'); return Promise.resolve({}) } }),
  }
})
vi.mock('@portfolio/database', () => ({ supabase: { from: (...a: unknown[]) => fromMock(...(a as [string])) } }))

import { resolveUser } from './index'

beforeEach(() => {
  fromMock.mockClear()
  calls.length = 0
  identityResults = []
  userSelectResults = []
  userInsertResult = { data: null, error: null }
  identityInsertResult = { error: null }
})

describe('resolveUser', () => {
  it('returns the existing user when the identity already exists (no insert)', async () => {
    identityResults = [{ data: { user_id: 'u9' } }]
    userSelectResults = [{ data: { id: 'u9' } }]
    const u = await resolveUser('telegram', 'tg-1', 'proj-1')
    expect(u.id).toBe('u9')
    expect(calls).toEqual(['findIdentity', 'userSelect'])
  })

  it('creates user + identity when none exists', async () => {
    identityResults = [{ data: null }]
    userInsertResult = { data: { id: 'u1' }, error: null }
    identityInsertResult = { error: null }
    const u = await resolveUser('telegram', 'tg-2', 'proj-1')
    expect(u.id).toBe('u1')
    expect(calls).toEqual(['findIdentity', 'userInsert', 'identityInsert'])
  })

  it('on identity UNIQUE violation: deletes orphan user and re-resolves to the winner', async () => {
    identityResults = [{ data: null }, { data: { user_id: 'u2' } }]
    userInsertResult = { data: { id: 'u1' }, error: null }
    identityInsertResult = { error: { message: 'duplicate key value violates unique constraint' } }
    userSelectResults = [{ data: { id: 'u2' } }]
    const u = await resolveUser('telegram', 'tg-3', 'proj-1')
    expect(u.id).toBe('u2')
    expect(calls).toEqual(['findIdentity', 'userInsert', 'identityInsert', 'userDelete', 'findIdentity', 'userSelect'])
  })
})
