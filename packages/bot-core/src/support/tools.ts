import { supabase } from '@portfolio/database'
import { notifyAdminBot } from '../admin-bot/notify'
import type { SupportContext } from './types'

const FEATURE_SIGNAL_THRESHOLD = 20

// ── reportBug ─────────────────────────────────────────────────────────────────

export async function reportBug(ctx: SupportContext, summary: string): Promise<string> {
  const { data } = await supabase
    .from('support_tickets')
    .insert({
      project_id: ctx.projectId,
      user_id: ctx.userId,
      user_message: summary,
      resolution: 'escalated',
      conversation_log: ctx.messages,
    })
    .select('id')
    .single()

  const ticketId = data?.id as string | undefined

  await notifyAdminBot({
    type: 'alert',
    agentType: 'support',
    severity: 'high',
    title: `Bug report [${ctx.projectId}]`,
    body: `User: ${ctx.userId}\n${summary}\nTicket: ${ticketId ?? 'unknown'}`,
  })

  return ticketId ?? ''
}

// ── escalateToHuman ───────────────────────────────────────────────────────────

export async function escalateToHuman(ctx: SupportContext, ticketId: string): Promise<void> {
  await supabase
    .from('support_tickets')
    .update({ resolution: 'escalated', resolved_at: new Date().toISOString() })
    .eq('id', ticketId)

  const transcript = ctx.messages
    .map((m) => `[${m.role}] ${m.text}`)
    .join('\n')

  await notifyAdminBot({
    type: 'alert',
    agentType: 'support',
    severity: 'high',
    title: `🚨 Нужен человек [${ctx.projectId}]`,
    body: `User: ${ctx.userId}\n\nТранскрипт:\n${transcript.slice(0, 3000)}`,
    context: { ticketId, userId: ctx.userId, projectId: ctx.projectId },
  })
}

// ── requestRefundApproval ─────────────────────────────────────────────────────
// Refund НИКОГДА не обрабатывается автоматически.
// Всегда идёт в approval_queue на ручной approve основателя.

export async function requestRefundApproval(
  ctx: SupportContext,
  params: {
    reason: string
    subscriptionType: 'monthly' | 'annual' | 'pay_per_use'
    amountUsd: number
    orderId: string
  },
): Promise<void> {
  const { data } = await supabase
    .from('approval_queue')
    .insert({
      project_id: ctx.projectId,
      agent_type: 'support',
      action_type: 'refund_request',
      payload: {
        userId: ctx.userId,
        orderId: params.orderId,
        amountUsd: params.amountUsd,
        subscriptionType: params.subscriptionType,
        reason: params.reason,
      },
      context: { conversationLog: ctx.messages },
      status: 'pending',
      expires_at: new Date(Date.now() + 72 * 3_600_000).toISOString(),
    })
    .select('id')
    .single()

  await notifyAdminBot({
    type: 'approval_request',
    agentType: 'support',
    severity: params.amountUsd > 30 ? 'high' : 'normal',
    title: `Refund request — $${params.amountUsd} (${params.subscriptionType})`,
    body: `User: ${ctx.userId}\nOrder: ${params.orderId}\nReason: ${params.reason}`,
    approvalId: data?.id as string,
  })
}

// ── logFeatureSignal ──────────────────────────────────────────────────────────

export async function logFeatureSignal(projectId: string, topic: string): Promise<void> {
  const { data: existing } = await supabase
    .from('feature_signals')
    .select('count')
    .eq('project_id', projectId)
    .eq('topic', topic)
    .maybeSingle()

  const newCount = (existing?.count as number | null ?? 0) + 1

  if (existing) {
    await supabase
      .from('feature_signals')
      .update({ count: newCount, last_seen_at: new Date().toISOString() })
      .eq('project_id', projectId)
      .eq('topic', topic)
  } else {
    await supabase
      .from('feature_signals')
      .insert({ project_id: projectId, topic, count: 1 })
  }

  if (newCount > 0 && newCount % FEATURE_SIGNAL_THRESHOLD === 0) {
    await notifyAdminBot({
      type: 'info',
      agentType: 'support',
      severity: 'low',
      title: `Feature signal [${projectId}]`,
      body: `"${topic}" — уже ${newCount} упоминаний`,
    })
  }
}

// ── notifyOwner ───────────────────────────────────────────────────────────────
// Оставляем для backward compatibility — внутри вызывает notifyAdminBot.

export async function notifyOwner(text: string): Promise<void> {
  await notifyAdminBot({ type: 'info', agentType: 'support', severity: 'normal', title: 'Support', body: text })
}
