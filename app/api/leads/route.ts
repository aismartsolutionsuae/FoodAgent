import { getSupabaseAdminClient } from "@/lib/supabase-admin";
import { sendLeadReportEmail } from "@/lib/lead-report-email";
import { upsertRegistrationLead } from "@/lib/register-lead";

type LeadRequestBody = {
  email?: string;
  requestSummary?: string;
  /** Сохранение только email при регистрации/входе (без письма-отчёта) */
  registration?: boolean;
};

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as LeadRequestBody;
    const email = body.email?.trim() ?? "";
    const isRegistration = body.registration === true;
    const requestSummary = isRegistration
      ? (body.requestSummary?.trim() || "Регистрация / вход по email")
      : (body.requestSummary?.trim() ?? "");

    if (!email || !isValidEmail(email)) {
      return Response.json(
        { error: "Укажите корректный email." },
        { status: 400 }
      );
    }

    if (!isRegistration && !requestSummary) {
      return Response.json(
        { error: "Добавьте краткое описание запроса." },
        { status: 400 }
      );
    }

    if (isRegistration) {
      await upsertRegistrationLead(email, requestSummary);
    } else {
      const supabase = getSupabaseAdminClient();
      const { error } = await supabase.from("leads").insert({
        email,
        request_summary: requestSummary,
      });

      if (error) {
        console.error("Leads insert error:", error);
        return Response.json(
          { error: "Не удалось сохранить заявку." },
          { status: 500 }
        );
      }
    }

    if (!isRegistration) {
      try {
        await sendLeadReportEmail({ toEmail: email, requestSummary });
      } catch (emailError) {
        console.error("Lead report email error:", emailError);
        return Response.json(
          { error: "Заявка сохранена, но отправка письма не удалась." },
          { status: 502 }
        );
      }
    }

    return Response.json({ ok: true });
  } catch (error) {
    console.error("Leads route error:", error);
    return Response.json({ error: "Некорректный запрос." }, { status: 400 });
  }
}
