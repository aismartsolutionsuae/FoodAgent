export const MODEL_ID = "gpt-5.4";

/** Модель для извлечения контактов перед вебхуком (дешевле основного чата) */
export const CONTACT_EXTRACTION_MODEL_ID = "gpt-4o-mini";

export const SYSTEM_PROMPT =
  "Ты эксперт по бизнесу и законам в ОАЭ. Помогай пользователям быстро и четко. Ответы выдавай сжато и структурированно. Минимизируй количество общего и разговорного текста, выдавай только фактическую информацию.";

/** Подзаголовок на главной (лендинг) */
export const HOME_PAGE_TAGLINE = "Получи визу в ОАЭ за 5 минут";

/** Заголовок и подзаголовок страницы чата */
export const HOME_PAGE_TITLE = "AI Visa Assistant";
export const CHAT_PAGE_TITLE = "AI Visa Assistant";
export const CHAT_PAGE_SUBTITLE =
  "Задайте вопрос по бизнесу и законам в ОАЭ.";

/** Подпись блока с примерами вопросов */
export const SUGGESTED_QUESTIONS_LABEL = "Примеры вопросов";

export const SUGGESTED_QUESTIONS = [
  "Как получить Золотую визу?",
  "Как открыть счет в банке Дубая?",
] as const;
