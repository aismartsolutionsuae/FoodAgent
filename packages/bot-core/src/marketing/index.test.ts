import { describe, it, expect, vi, beforeEach } from 'vitest'

const fromMock = vi.fn()
vi.mock('@portfolio/database', () => ({ supabase: { from: (...a: unknown[]) => fromMock(...a) } }))
vi.mock('../ai/index', () => ({ ask: vi.fn() }))
vi.mock('../admin-bot/notify', () => ({ notifyAdminBot: vi.fn() }))
const sendEmailMock = vi.fn()
vi.mock('../email/index', () => ({ sendEmail: (...a: unknown[]) => sendEmailMock(...a) }))

import { dispatchApproved } from './index'

describe('publishEmailCampaign via dispatchApproved', () => {
  beforeEach(() => { fromMock.mockReset(); sendEmailMock.mockReset() })

  it('throws an actionable error for trial/paid audience (no billing table yet)', async () => {
    await expect(
      dispatchApproved('email_welcome', {
        audience: 'trial', subject: 'S', html: '<p>x</p>',
      } as never),
    ).rejects.toThrow(/billing model not selected/i)
  })

  it('sends to all users resolved from user_identities email channel', async () => {
    fromMock.mockReturnValue({
      select: () => ({ eq: () => ({ limit: () => Promise.resolve({
        data: [{ channel_user_id: 'a@x.com' }, { channel_user_id: 'b@x.com' }],
      }) }) }),
    })
    await dispatchApproved('email_welcome', {
      audience: 'all', subject: 'Hi', html: '<p>hi</p>',
    } as never)
    expect(sendEmailMock).toHaveBeenCalledTimes(2)
    expect(sendEmailMock.mock.calls[0][0]).toMatchObject({ to: 'a@x.com', subject: 'Hi' })
  })
})
