import { convertToModelMessages, streamText, UIMessage } from "ai";
import { createOpenAI } from "@ai-sdk/openai";
import { waitUntil } from "@vercel/functions";

import { extractContactForWebhook } from "@/lib/chat-contact-extraction";
import {
  getLastUserMessageId,
  getLastUserTextFromMessages,
} from "@/lib/chat-messages";
import { MODEL_ID, SYSTEM_PROMPT } from "@/lib/chat-config";
import { sendToWebhook } from "@/lib/webhook";

/** Продлевает время на фон (вебхук + LLM) на Vercel вместе со стримингом. */
export const maxDuration = 60;

type ChatRequestBody = {
  messages?: UIMessage[];
};

async function runMakeWebhookPipeline(
  openAiApiKey: string,
  lastUserText: string,
  lastUserId: string | undefined
) {
  const extracted = await extractContactForWebhook(
    openAiApiKey,
    lastUserText
  );

  if (!extracted.shouldNotify) {
    return;
  }

  await sendToWebhook({
    email: extracted.email,
    name: extracted.name,
    question: extracted.questionSummary,
    telegram: extracted.telegram,
    userMessageId: lastUserId ?? null,
  });
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as ChatRequestBody;

    if (!Array.isArray(body.messages)) {
      return Response.json(
        { error: "Поле messages обязательно и должно быть массивом." },
        { status: 400 }
      );
    }

    // Fallback for files saved with BOM where env key can become "\uFEFFOPENAI_API_KEY".
    const openAiApiKey =
      process.env.OPENAI_API_KEY ?? process.env["\uFEFFOPENAI_API_KEY"];

    if (!openAiApiKey) {
      return Response.json(
        { error: "Серверная ошибка конфигурации API ключа." },
        { status: 500 }
      );
    }

    const modelMessages = await convertToModelMessages(body.messages);
    const openai = createOpenAI({ apiKey: openAiApiKey });

    const lastUserText = getLastUserTextFromMessages(body.messages);
    const lastUserId = getLastUserMessageId(body.messages);

    if (lastUserText) {
      const work = (async () => {
        try {
          await runMakeWebhookPipeline(
            openAiApiKey,
            lastUserText,
            lastUserId
          );
        } catch (webhookError) {
          console.error("Chat webhook pipeline error:", webhookError);
        }
      })();
      // На Vercel дожидаемся фоновой работы, иначе функция часто гасит до fetch к Make.
      waitUntil(work);
    }

    const result = streamText({
      model: openai(MODEL_ID),
      system: SYSTEM_PROMPT,
      messages: modelMessages,
    });

    return result.toUIMessageStreamResponse();
  } catch (error) {
    console.error("Chat route error:", error);

    const isDev = process.env.NODE_ENV !== "production";
    const message =
      error instanceof Error
        ? error.message
        : "Не удалось обработать запрос к AI модели.";

    return Response.json(
      { error: isDev ? message : "Не удалось обработать запрос к AI модели." },
      { status: 500 }
    );
  }
}
