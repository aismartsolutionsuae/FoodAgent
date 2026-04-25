"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { useChat } from "@ai-sdk/react";
import {
  CHAT_PAGE_SUBTITLE,
  CHAT_PAGE_TITLE,
  SUGGESTED_QUESTIONS,
  SUGGESTED_QUESTIONS_LABEL,
} from "@/lib/chat-config";

export default function ChatPage() {
  const { messages, sendMessage, status, error } = useChat();
  const [mounted, setMounted] = useState(false);
  const [input, setInput] = useState("");
  const endOfMessagesRef = useRef<HTMLLIElement | null>(null);

  const isBusy = status === "submitted" || status === "streaming";

  const chatItems = useMemo(() => {
    return messages.map((message) => {
      const text = message.parts
        .filter((part) => part.type === "text")
        .map((part) => part.text)
        .join("");

      return {
        id: message.id,
        role: message.role,
        text,
      };
    });
  }, [messages]);

  useEffect(() => {
    endOfMessagesRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [chatItems, status]);

  useEffect(() => {
    setMounted(true);
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const value = input.trim();
    if (!value || isBusy) return;

    setInput("");
    await sendMessage({ text: value });
  }

  if (!mounted) {
    return (
      <main className="flex min-h-screen justify-center bg-white px-4 py-10 sm:py-14">
        <section className="flex w-full max-w-3xl flex-col rounded-3xl border border-slate-100 bg-white p-7 sm:p-10">
          <h1 className="text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">
            {CHAT_PAGE_TITLE}
          </h1>
          <p className="mt-3 text-base text-slate-600 sm:text-lg">
            {CHAT_PAGE_SUBTITLE}
          </p>
        </section>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen justify-center bg-white px-4 py-10 sm:py-14">
      <section className="flex w-full max-w-3xl flex-col rounded-3xl border border-slate-100 bg-white p-7 sm:p-10">
        <h1 className="text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">
          {CHAT_PAGE_TITLE}
        </h1>
        <p className="mt-3 text-base text-slate-600 sm:text-lg">
          {CHAT_PAGE_SUBTITLE}
        </p>

        <div className="mt-8 rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-amber-600">
            {SUGGESTED_QUESTIONS_LABEL}
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {SUGGESTED_QUESTIONS.map((question) => (
              <button
                key={question}
                type="button"
                onClick={() => setInput(question)}
                className="rounded-full border border-slate-300 px-4 py-2 text-sm text-slate-800 transition hover:border-slate-900 hover:text-slate-900"
              >
                {question}
              </button>
            ))}
          </div>
        </div>

        <ul className="mt-8 min-h-80 max-h-[28rem] space-y-4 overflow-y-auto rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
          {chatItems.length === 0 ? (
            <li className="text-slate-500">
              Диалог появится здесь после вашего первого вопроса.
            </li>
          ) : (
            chatItems.map((item) => (
              <li
                key={item.id}
                className={`max-w-[90%] rounded-xl px-4 py-3 text-sm leading-relaxed sm:text-base ${
                  item.role === "user"
                    ? "ml-auto bg-slate-900 text-white"
                    : "mr-auto border border-amber-300 bg-amber-50 text-slate-900"
                }`}
              >
                {item.text}
              </li>
            ))
          )}
          <li ref={endOfMessagesRef} />
        </ul>

        {error ? (
          <p className="mt-3 text-sm text-red-600">
            Ошибка: не удалось получить ответ от AI.
          </p>
        ) : null}

        <form onSubmit={handleSubmit} className="mt-8 flex gap-3">
          <input
            value={input}
            onChange={(event) => setInput(event.target.value)}
            placeholder="Введите ваш вопрос..."
            className="flex-1 rounded-xl border border-slate-300 px-4 py-3 outline-none transition focus:border-slate-900"
          />
          <button
            type="submit"
            disabled={isBusy}
            className="rounded-xl bg-slate-900 px-6 py-3 font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isBusy ? "Отправка..." : "Отправить"}
          </button>
        </form>
      </section>
    </main>
  );
}
