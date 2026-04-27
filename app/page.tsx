import Link from "next/link";
import { HOME_PAGE_TITLE, HOME_PAGE_TAGLINE } from "@/lib/chat-config";

export default function Home() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-6">
      <section className="w-full max-w-2xl rounded-2xl bg-white p-10 text-center shadow-sm">
        <h1 className="text-4xl font-bold tracking-tight text-slate-900">
          {HOME_PAGE_TITLE}
        </h1>
        <p className="mt-4 text-xl text-slate-600">{HOME_PAGE_TAGLINE}</p>
        <div className="mt-10 flex flex-col gap-3 sm:flex-row sm:justify-center">
          <Link
            href="/login"
            className="inline-flex w-full items-center justify-center rounded-xl bg-blue-600 px-8 py-5 text-xl font-semibold text-white transition hover:bg-blue-700 sm:w-auto"
          >
            Войти или зарегистрироваться
          </Link>
          <Link
            href="/apply"
            className="inline-flex w-full items-center justify-center rounded-xl border border-slate-300 px-8 py-5 text-xl font-semibold text-slate-900 transition hover:border-slate-900 sm:w-auto"
          >
            Оставить заявку
          </Link>
        </div>
      </section>
    </main>
  );
}
