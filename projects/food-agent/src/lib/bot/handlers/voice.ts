import type { BotContext } from '../context'
import OpenAI from 'openai'
import { i18n } from '../i18n'
import { handleFoodSearch } from './search'

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

// Telegram sends voice messages as OGG/Opus files.
// Node.js 20+ has File available globally — no need for openai/uploads toFile.
export async function handleVoiceMessage(ctx: BotContext) {
  if (!ctx.dbUser || !ctx.message?.voice) return

  const s = i18n(ctx.dbUser.language)
  const lang = ctx.dbUser.language

  const processingMsg = await ctx.reply('🎤...')

  try {
    const telegramFile = await ctx.getFile()

    if (!telegramFile.file_path) {
      throw new Error('Telegram did not return a file_path')
    }

    const fileUrl = `https://api.telegram.org/file/bot${process.env.TELEGRAM_BOT_TOKEN}/${telegramFile.file_path}`

    const res = await fetch(fileUrl)
    if (!res.ok) {
      throw new Error(`Failed to download voice file: ${res.status}`)
    }

    const buffer = Buffer.from(await res.arrayBuffer())

    // Node.js 20+ File global — works without any imports
    const audioFile = new File([buffer], 'voice.ogg', { type: 'audio/ogg' })

    const whisperLang = lang === 'ar' ? 'ar' : lang === 'en' ? 'en' : 'ru'
    const transcription = await openai.audio.transcriptions.create({
      file: audioFile,
      model: 'whisper-1',
      language: whisperLang,
    })

    const text = transcription.text.trim()

    await ctx.api.deleteMessage(ctx.chat!.id, processingMsg.message_id).catch(() => {})

    if (!text) {
      await ctx.reply('🎤 Не удалось распознать речь. Попробуйте ещё раз или напишите текстом.')
      return
    }

    await ctx.reply(s.voice_received(text), { parse_mode: 'Markdown' })
    await handleFoodSearch(ctx, text)
  } catch (err) {
    await ctx.api.deleteMessage(ctx.chat!.id, processingMsg.message_id).catch(() => {})

    const detail = err instanceof Error ? err.message : String(err)
    console.error('[voice]', detail)

    await ctx.reply(
      `❌ Ошибка при обработке голосового сообщения.\n_${detail}_`,
      { parse_mode: 'Markdown' },
    )
  }
}
