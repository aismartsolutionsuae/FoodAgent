import { type Bot, InlineKeyboard } from 'grammy'
import { supabase } from '@portfolio/database'
import { dispatchApproved, type ContentType, type ApprovalPayload } from '@portfolio/bot-core/marketing'

export function registerPending(bot: Bot): void {
  bot.command('pending', async (ctx) => {
    const { data } = await supabase
      .from('approval_queue')
      .select('id, project_id, agent_type, action_type, payload, context, created_at')
      .eq('status', 'pending')
      .order('created_at', { ascending: true })
      .limit(5)

    if (!data?.length) {
      await ctx.reply('✅ Очередь пуста.')
      return
    }

    for (const item of data) {
      const preview = JSON.stringify(item.payload).slice(0, 120)
      const kb = new InlineKeyboard()
        .text('✅ Одобрить', `approve:${item.id}`)
        .text('❌ Отклонить', `reject:${item.id}`)

      await ctx.reply(
        `📋 <b>[${item.project_id}] ${item.agent_type}:${item.action_type}</b>\n<code>${preview}</code>`,
        { parse_mode: 'HTML', reply_markup: kb },
      )
    }
  })

  bot.callbackQuery(/^approve:(.+)$/, async (ctx) => {
    await ctx.answerCallbackQuery()
    const id = ctx.match[1]

    const { data: item } = await supabase
      .from('approval_queue')
      .select('action_type, payload')
      .eq('id', id)
      .single()

    await supabase
      .from('approval_queue')
      .update({ status: 'approved', resolved_at: new Date().toISOString(), resolved_by: 'founder' })
      .eq('id', id)

    await ctx.editMessageReplyMarkup({ reply_markup: new InlineKeyboard() })

    if (item?.action_type && item?.payload) {
      try {
        await dispatchApproved(item.action_type as ContentType, item.payload as ApprovalPayload)
        await ctx.reply(`✅ Одобрено и опубликовано (${id.slice(0, 8)}…)`)
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err)
        await ctx.reply(`✅ Одобрено, но публикация не удалась:\n${msg}`)
      }
    } else {
      await ctx.reply(`✅ Одобрено (${id.slice(0, 8)}…)`)
    }
  })

  bot.callbackQuery(/^reject:(.+)$/, async (ctx) => {
    await ctx.answerCallbackQuery()
    const id = ctx.match[1]

    await supabase
      .from('approval_queue')
      .update({ status: 'rejected', resolved_at: new Date().toISOString(), resolved_by: 'founder' })
      .eq('id', id)

    await ctx.editMessageReplyMarkup({ reply_markup: new InlineKeyboard() })
    await ctx.reply(`❌ Отклонено (${id.slice(0, 8)}…)`)
  })
}
