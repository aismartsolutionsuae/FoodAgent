import { supabase } from '@portfolio/database'
import { ask } from '../ai/index'
import { sendEmail } from '../email/index'
import { notifyAdminBot } from '../admin-bot/notify'
import type {
  ContentType,
  ContentRequest,
  ContentDraft,
  GenerateContentParams,
  SocialPostPayload,
  EmailPayload,
  ApprovalPayload,
} from './types'

export type { ContentType, ContentRequest, ContentDraft, GenerateContentParams, SocialPostPayload, EmailPayload, AdCreativePayload, SeoPagePayload, ApprovalPayload } from './types'

// ── generateContent ───────────────────────────────────────────────────────────

export async function generateContent(params: GenerateContentParams): Promise<string> {
  return ask(params.promptName, params.variables ?? {}, {
    projectId: params.projectId,
  })
}

// ── queueForApproval ──────────────────────────────────────────────────────────
// Кладёт черновик в approval_queue и уведомляет admin-bot.

export async function queueForApproval(
  projectId: string,
  agentType: 'marketing' | 'support' | 'experiments' | 'qa',
  actionType: string,
  payload: ApprovalPayload,
  options: {
    expiresHours?: number
    notifyTitle?: string
    notifyBody?: string
    context?: Record<string, unknown>
  } = {},
): Promise<string> {
  const expiresAt = new Date(Date.now() + (options.expiresHours ?? 24) * 3_600_000).toISOString()

  const { data } = await supabase
    .from('approval_queue')
    .insert({
      project_id: projectId,
      agent_type: agentType,
      action_type: actionType,
      payload,
      context: options.context ?? null,
      status: 'pending',
      expires_at: expiresAt,
    })
    .select('id')
    .single()

  const approvalId = data?.id as string ?? ''

  if (options.notifyTitle) {
    await notifyAdminBot({
      type: 'approval_request',
      agentType,
      severity: 'normal',
      title: options.notifyTitle,
      body: options.notifyBody ?? '',
      approvalId,
    })
  }

  return approvalId
}

// ── publishSocialPost ─────────────────────────────────────────────────────────
// Telegram — прямой Bot API. Остальные — через Buffer (когда BUFFER_ACCESS_TOKEN задан).

async function publishSocialPost(payload: SocialPostPayload): Promise<void> {
  if (payload.platform === 'telegram_post') {
    const channelId = (payload as unknown as { channelId: string }).channelId
    const botToken = (payload as unknown as { botToken: string }).botToken
    if (!channelId || !botToken) throw new Error('telegram_post требует channelId и botToken в payload')

    const resp = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: channelId, text: payload.text, parse_mode: 'HTML' }),
    })
    if (!resp.ok) throw new Error(`Telegram publish failed: ${await resp.text()}`)
    return
  }

  // Buffer для остальных платформ
  const bufferToken = process.env.BUFFER_ACCESS_TOKEN
  if (!bufferToken) {
    throw new Error(
      `Публикация в ${payload.platform} требует BUFFER_ACCESS_TOKEN. ` +
      `Опубликуй вручную:\n\n${payload.text}`,
    )
  }

  if (!payload.bufferProfileId) throw new Error(`bufferProfileId не задан для ${payload.platform}`)

  const resp = await fetch('https://api.bufferapp.com/1/updates/create.json', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${bufferToken}` },
    body: JSON.stringify({ profile_ids: [payload.bufferProfileId], text: payload.text }),
  })
  if (!resp.ok) throw new Error(`Buffer publish failed: ${await resp.text()}`)
}

// ── publishEmailCampaign ──────────────────────────────────────────────────────

async function publishEmailCampaign(payload: EmailPayload): Promise<void> {
  let query = supabase.from('users').select('id, email:telegram_id')

  if (payload.audience === 'trial' || payload.audience === 'paid') {
    const { data: subs } = await supabase
      .from('subscriptions')
      .select('user_id')
      .eq('status', payload.audience === 'trial' ? 'trial' : 'active')

    const userIds = (subs ?? []).map((s) => s.user_id)
    if (!userIds.length) return
    query = query.in('id', userIds)
  }

  const { data: users } = await query.limit(500)
  if (!users?.length) return

  const from = process.env.MARKETING_FROM_EMAIL ?? 'noreply@portfolio.app'
  await Promise.allSettled(
    users
      .filter((u): u is typeof u & { email: string } => typeof u.email === 'string')
      .map((u) =>
        sendEmail({ to: u.email, subject: payload.subject, template: '__raw__', variables: { __html__: payload.html }, from }),
      ),
  )
}

// ── dispatchApproved ─────────────────────────────────────────────────────────
// Вызывается из admin-bot после апрува. Публикует контент по action_type.

export async function dispatchApproved(
  actionType: string,
  payload: ApprovalPayload,
): Promise<void> {
  const socialTypes: ContentType[] = [
    'tweet', 'linkedin_post', 'instagram_post', 'telegram_post', 'reddit_reply', 'tiktok_script',
  ]

  if (socialTypes.includes(actionType as ContentType)) {
    await publishSocialPost(payload as SocialPostPayload)
    return
  }

  if (actionType === 'email_welcome' || actionType === 'email_reengagement' || actionType === 'email_drip') {
    await publishEmailCampaign(payload as EmailPayload)
    return
  }

  // seo_page, ad_creative — ручная публикация через PR / Ads Manager
  // admin-bot покажет payload основателю для ручного действия
}
