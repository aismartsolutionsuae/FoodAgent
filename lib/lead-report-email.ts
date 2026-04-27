import { Resend } from "resend";

function getResendClient() {
  const resendApiKey = process.env.RESEND_API_KEY;

  if (!resendApiKey) {
    throw new Error("RESEND_API_KEY не задан в переменных окружения.");
  }

  return new Resend(resendApiKey);
}

function buildReportText(requestSummary: string) {
  return [
    "Спасибо за ваш запрос!",
    "",
    "Краткий отчет по вашему запросу:",
    `- Исходный запрос: ${requestSummary}`,
    "- Следующий шаг: наш специалист уточнит детали и подберет оптимальный маршрут оформления.",
    "- Ориентир по срокам: первичная консультация обычно занимает 10-15 минут.",
    "",
    "С уважением,",
    "AI Visa Assistant",
  ].join("\n");
}

function buildReportHtml(requestSummary: string) {
  return `
    <div style="font-family: Arial, sans-serif; color: #0f172a; line-height: 1.5;">
      <h2 style="margin: 0 0 12px;">Спасибо за ваш запрос!</h2>
      <p style="margin: 0 0 12px;">Краткий отчет по вашему запросу:</p>
      <ul style="margin: 0 0 16px; padding-left: 20px;">
        <li><strong>Исходный запрос:</strong> ${requestSummary}</li>
        <li>Следующий шаг: наш специалист уточнит детали и подберет оптимальный маршрут оформления.</li>
        <li>Ориентир по срокам: первичная консультация обычно занимает 10-15 минут.</li>
      </ul>
      <p style="margin: 0;">С уважением,<br/>AI Visa Assistant</p>
    </div>
  `;
}

export async function sendLeadReportEmail(options: {
  toEmail: string;
  requestSummary: string;
}) {
  const resend = getResendClient();
  const fromEmail = process.env.REPORT_FROM_EMAIL ?? "onboarding@resend.dev";

  const { error } = await resend.emails.send({
    from: fromEmail,
    to: options.toEmail,
    subject: "Ваш краткий отчет по запросу",
    text: buildReportText(options.requestSummary),
    html: buildReportHtml(options.requestSummary),
  });

  if (error) {
    throw new Error(error.message);
  }
}
