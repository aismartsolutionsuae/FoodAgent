import OpenAI from 'openai'
import type { RankedDish } from '@/lib/supabase/types'

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

export interface KbjuResult {
  calories: number
  protein: number
  fat: number
  carbs: number
}

const SYSTEM = `You are a nutrition estimator for UAE restaurant dishes.
Given a dish name and restaurant, return estimated macros per serving.
Return ONLY valid JSON:
{"calories":number,"protein":number,"fat":number,"carbs":number}
No markdown, no explanation. Use realistic UAE portion sizes.`

// Estimates KBJU for the top dish only (to save API cost)
export async function estimateKbju(dish: RankedDish): Promise<KbjuResult | null> {
  try {
    const resp = await openai.chat.completions.create({
      model: 'gpt-4o',
      temperature: 0,
      max_tokens: 64,
      messages: [
        { role: 'system', content: SYSTEM },
        { role: 'user', content: `Dish: "${dish.name}" at "${dish.restaurant}"` },
      ],
    }, { timeout: 6000 })

    const raw = resp.choices[0]?.message?.content ?? '{}'
    return JSON.parse(raw) as KbjuResult
  } catch {
    return null
  }
}
