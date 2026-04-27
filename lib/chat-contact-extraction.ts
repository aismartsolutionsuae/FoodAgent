import { createOpenAI } from "@ai-sdk/openai";
import { generateObject } from "ai";
import { z } from "zod";

import { CONTACT_EXTRACTION_MODEL_ID } from "@/lib/chat-config";

const contactSchema = z.object({
  shouldNotify: z
    .boolean()
    .describe(
      "true, если нужно уведомить: найден email или Telegram, или пользователь явно просит связаться"
    ),
  email: z
    .string()
    .nullable()
    .describe("Email из текста, иначе null"),
  telegram: z
    .string()
    .nullable()
    .describe("Ник Telegram в формате @username, иначе null"),
  name: z
    .string()
    .nullable()
    .describe("Имя, если пользователь представился, иначе null"),
  questionSummary: z
    .string()
    .describe("Краткая суть вопроса пользователя, 1–3 предложения на русском"),
});

export type ContactExtraction = z.infer<typeof contactSchema>;

export async function extractContactForWebhook(
  openAiApiKey: string,
  userText: string
): Promise<ContactExtraction> {
  const openai = createOpenAI({ apiKey: openAiApiKey });

  const { object } = await generateObject({
    model: openai(CONTACT_EXTRACTION_MODEL_ID),
    schema: contactSchema,
    system: `Ты анализируешь сообщения пользователя чат-бота (визы и бизнес в ОАЭ).
Реши, нужно ли уведомить менеджера (shouldNotify = true), если выполняется хотя бы одно:
- в тексте явно указан email;
- есть контакт в Telegram: @username, ссылка t.me/..., «в телеграм @...», ник в телеграм;
- пользователь явно просит связаться: перезвоните, перезвонить, написать, связаться, оставьте контакт, свяжитесь, callback, ответьте в личку, хочу консультацию по телефону и т.п.

Если shouldNotify = false, поля email, telegram, name могут быть null, questionSummary — кратко перескажи смысл сообщения.

Имя извлекай только если явно: «меня зовут …», «я — …», «Иван, …» в начале и т.п., иначе null.`,
    prompt: `Сообщение пользователя:
"""
${userText}
"""`,
  });

  return object;
}
