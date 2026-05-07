import OpenAI from 'openai'
import type { Language } from '@/lib/supabase/types'

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

export interface ParsedQuery {
  dish: string          // canonical dish/food description in English
  cuisine: string | null
  maxPrice: number | null   // AED
  maxCalories: number | null
  excludeItems: string[]    // extra stop-list items from this query
  explicitRestaurant: string | null  // user named a specific restaurant
  platform: 'talabat' | 'deliveroo' | null  // user named a platform
  rawQuery: string
}

function parseJsonObject(raw: string): Omit<ParsedQuery, 'rawQuery'> | null {
  try {
    return JSON.parse(raw) as Omit<ParsedQuery, 'rawQuery'>
  } catch {
    const match = raw.match(/\{[\s\S]*\}/)
    if (!match) return null
    try {
      return JSON.parse(match[0]) as Omit<ParsedQuery, 'rawQuery'>
    } catch {
      return null
    }
  }
}

const BASE_SYSTEM = `You are a food query parser for a UAE delivery app.
Extract structured info from the user's food request.
Return ONLY valid JSON matching this schema:
{
  "dish": string,            // what food they want, in English
  "cuisine": string | null,  // cuisine type if mentioned
  "maxPrice": number | null, // max price in AED if mentioned
  "maxCalories": number | null,
  "excludeItems": string[],  // any ingredients to avoid mentioned in THIS query
  "explicitRestaurant": string | null,  // specific restaurant name if mentioned
  "platform": "talabat" | "deliveroo" | null
}
No extra text, no markdown, only the JSON object.`

export async function parseQuery(
  query: string,
  lang: Language,
  userCuisines: string[] = [],
  goal?: string,
): Promise<ParsedQuery> {
  const cuisineHint = userCuisines.length > 0
    ? `\nUser's preferred cuisines: ${userCuisines.join(', ')}. If the query is generic (no specific cuisine mentioned), set "cuisine" to the most relevant from this list.`
    : ''

  const goalHint = goal === 'diet'
    ? '\nUser goal: diet — prefer lower-calorie options, set maxCalories conservatively if not specified.'
    : goal === 'variety'
    ? '\nUser goal: variety — ignore cuisine preferences, show diverse options across different cuisines.'
    : '\nUser goal: balance — neutral, mixed options are fine.'

  const userPrompt = lang === 'ru'
    ? `Запрос пользователя: "${query}"`
    : lang === 'ar'
    ? `طلب المستخدم: "${query}"`
    : `User request: "${query}"`

  const resp = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    temperature: 0,
    max_tokens: 256,
    messages: [
      { role: 'system', content: BASE_SYSTEM + cuisineHint + goalHint },
      { role: 'user', content: userPrompt },
    ],
  }, { timeout: 8000 })

  const raw = resp.choices[0]?.message?.content ?? '{}'
  const parsed = parseJsonObject(raw)

  return {
    dish: parsed?.dish ?? query,
    cuisine: parsed?.cuisine ?? null,
    maxPrice: parsed?.maxPrice ?? null,
    maxCalories: parsed?.maxCalories ?? null,
    excludeItems: Array.isArray(parsed?.excludeItems) ? parsed.excludeItems : [],
    explicitRestaurant: parsed?.explicitRestaurant ?? null,
    platform: parsed?.platform ?? null,
    rawQuery: query,
  }
}
