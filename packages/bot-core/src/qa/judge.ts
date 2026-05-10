import { ask } from '../ai'
import type { JudgeResult } from './types'

// Оценивает качество ответа бота по критериям: точность, тон, полнота.
// Использует gpt-4o-mini — классификация, не творчество.
export async function judge(
  userMessage: string,
  botReply: string,
  criteria: string,
): Promise<JudgeResult> {
  const prompt = [
    `You are a QA evaluator for a Telegram bot.`,
    `User message: "${userMessage}"`,
    `Bot reply: "${botReply}"`,
    `Evaluation criteria: ${criteria}`,
    ``,
    `Rate the reply on a scale of 0–10 and explain briefly.`,
    `Reply in JSON: { "score": number, "passed": boolean, "reasoning": string, "suggestions": string[] }`,
  ].join('\n')

  const raw = await ask(prompt, { model: 'gpt-4o-mini' })

  try {
    return JSON.parse(raw) as JudgeResult
  } catch {
    return { score: 0, passed: false, reasoning: raw, suggestions: [] }
  }
}
