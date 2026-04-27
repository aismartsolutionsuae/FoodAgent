const DEFAULT_MAKE_WEBHOOK_URL =
  "https://hook.eu1.make.com/8xhqfbt604i2ogton44t5af7mzq38d1l";

export type WebhookLeadData = {
  email: string | null;
  name: string | null;
  /** Краткая суть вопроса пользователя */
  question: string;
  /** Telegram-ник, если был в сообщении */
  telegram?: string | null;
  userMessageId?: string | null;
};

/**
 * Отправляет данные лида в Make (HTTP POST, JSON).
 * URL можно переопределить через MAKE_WEBHOOK_URL.
 */
export async function sendToWebhook(data: WebhookLeadData): Promise<void> {
  const url = process.env.MAKE_WEBHOOK_URL ?? DEFAULT_MAKE_WEBHOOK_URL;

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const bodyText = await response.text().catch(() => "");
    throw new Error(
      `sendToWebhook: HTTP ${response.status} ${bodyText}`.trim()
    );
  }
}
