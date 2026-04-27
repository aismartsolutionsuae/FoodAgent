import { getSupabaseAdminClient } from "@/lib/supabase-admin";

/**
 * Одна запись лида на email: при повторном входе через OAuth не дублируем строки.
 */
export async function upsertRegistrationLead(email: string, source: string) {
  const normalized = email.trim().toLowerCase();
  if (!normalized) {
    return;
  }

  const supabase = getSupabaseAdminClient();

  const { data: existing } = await supabase
    .from("leads")
    .select("id")
    .eq("email", normalized)
    .maybeSingle();

  if (existing) {
    return;
  }

  const { error } = await supabase.from("leads").insert({
    email: normalized,
    request_summary: source,
  });

  if (error) {
    console.error("upsertRegistrationLead:", error);
  }
}
