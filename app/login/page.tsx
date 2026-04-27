"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { createBrowserSupabaseClient } from "@/lib/supabase/browser-client";

type Mode = "signin" | "signup";

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState<
    "idle" | "password" | "reset" | "done"
  >("idle");
  const [message, setMessage] = useState("");
  const [isError, setIsError] = useState(false);

  function authRedirectUrl() {
    return `${window.location.origin}/auth/callback?next=/chat`;
  }

  async function savePasswordRegistrationLead(emailNorm: string) {
    const res = await fetch("/api/leads", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: emailNorm,
        registration: true,
        requestSummary: "Регистрация (email и пароль)",
      }),
    });
    if (!res.ok) {
      const j = (await res.json()) as { error?: string };
      throw new Error(j.error ?? "Не удалось сохранить данные регистрации.");
    }
  }

  async function handlePasswordSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmedEmail = email.trim().toLowerCase();
    if (!trimmedEmail || !password || (busy !== "idle" && busy !== "done"))
      return;

    setMessage("");
    setIsError(false);
    setBusy("password");

    try {
      const supabase = createBrowserSupabaseClient();

      if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({
          email: trimmedEmail,
          password,
          options: {
            emailRedirectTo: authRedirectUrl(),
          },
        });

        if (error) {
          throw new Error(error.message);
        }

        await savePasswordRegistrationLead(trimmedEmail);

        if (data.session) {
          setBusy("done");
          router.push("/chat");
          router.refresh();
          return;
        }

        setBusy("idle");
        setIsError(false);
        setMessage(
          "Аккаунт создан. Если включено подтверждение email в Supabase — проверьте почту и перейдите по ссылке."
        );
        return;
      }

      const { error } = await supabase.auth.signInWithPassword({
        email: trimmedEmail,
        password,
      });

      if (error) {
        throw new Error(error.message);
      }

      setBusy("done");
      router.push("/chat");
      router.refresh();
    } catch (err) {
      setBusy("idle");
      setIsError(true);
      setMessage(
        err instanceof Error ? err.message : "Ошибка входа. Попробуйте снова."
      );
    }
  }

  async function handleForgotPassword() {
    const trimmed = email.trim().toLowerCase();
    if (!trimmed) {
      setIsError(true);
      setMessage("Сначала введите email в поле выше.");
      return;
    }
    setBusy("reset");
    setMessage("");
    setIsError(false);
    try {
      const supabase = createBrowserSupabaseClient();
      const { error } = await supabase.auth.resetPasswordForEmail(trimmed, {
        redirectTo: authRedirectUrl(),
      });
      if (error) {
        throw new Error(error.message);
      }
      setBusy("idle");
      setMessage(
        "Если адрес есть в системе, мы отправили письмо со ссылкой для сброса пароля."
      );
      setIsError(false);
    } catch (err) {
      setBusy("idle");
      setIsError(true);
      setMessage(
        err instanceof Error ? err.message : "Не удалось отправить письмо."
      );
    }
  }

  const formDisabled =
    busy === "password" || busy === "reset" || busy === "done";

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-6 py-12">
      <section className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
          Вход в аккаунт
        </h1>
        <p className="mt-2 text-sm text-slate-600">
          Вход и регистрация по email и паролю. При регистрации email сохраняется
          в базе лидов.
        </p>

        <div className="mt-6 flex rounded-xl border border-slate-200 p-1">
          <button
            type="button"
            onClick={() => {
              setMode("signin");
              setMessage("");
            }}
            className={`flex-1 rounded-lg py-2 text-sm font-semibold transition ${
              mode === "signin"
                ? "bg-slate-900 text-white"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Вход
          </button>
          <button
            type="button"
            onClick={() => {
              setMode("signup");
              setMessage("");
            }}
            className={`flex-1 rounded-lg py-2 text-sm font-semibold transition ${
              mode === "signup"
                ? "bg-slate-900 text-white"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Регистрация
          </button>
        </div>

        <form onSubmit={handlePasswordSubmit} className="mt-5 space-y-4">
          <input
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email"
            className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-slate-900"
          />
          <input
            type="password"
            autoComplete={
              mode === "signup" ? "new-password" : "current-password"
            }
            required
            minLength={mode === "signup" ? 8 : undefined}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Пароль (не менее 8 символов при регистрации)"
            className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-slate-900"
          />

          <button
            type="submit"
            disabled={formDisabled}
            className="w-full rounded-xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {busy === "password"
              ? "Секунду…"
              : mode === "signup"
                ? "Создать аккаунт"
                : "Войти"}
          </button>
        </form>

        {mode === "signin" ? (
          <div className="mt-3 text-center">
            <button
              type="button"
              disabled={busy === "reset"}
              onClick={handleForgotPassword}
              className="text-sm text-slate-600 underline hover:text-slate-900 disabled:opacity-60"
            >
              {busy === "reset" ? "Отправка…" : "Забыли пароль?"}
            </button>
          </div>
        ) : null}

        {message ? (
          <p
            className={`mt-4 text-sm ${
              isError ? "text-red-600" : "text-emerald-700"
            }`}
          >
            {message}
          </p>
        ) : null}

        <p className="mt-8 text-center text-sm text-slate-500">
          <Link href="/" className="text-slate-900 underline">
            На главную
          </Link>
        </p>

        <p className="mt-4 text-center text-xs text-slate-400">
          В Supabase включите провайдер Email и добавьте redirect URL в URL
          Configuration (например /auth/callback).
        </p>
      </section>
    </main>
  );
}
