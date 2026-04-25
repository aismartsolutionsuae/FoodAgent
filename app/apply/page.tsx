export default function ApplyPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-6 py-10">
      <section className="w-full max-w-2xl rounded-2xl bg-white p-8 shadow-sm sm:p-10">
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">
          Заявка на визу в ОАЭ
        </h1>
        <p className="mt-3 text-slate-600">
          Оставьте контакты, и AI Visa Assistant поможет оформить визу.
        </p>

        <form className="mt-8 space-y-4">
          <input
            type="text"
            name="name"
            placeholder="Ваше имя"
            className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none transition focus:border-blue-500"
          />
          <input
            type="tel"
            name="phone"
            placeholder="Телефон"
            className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none transition focus:border-blue-500"
          />
          <button
            type="submit"
            className="inline-flex w-full items-center justify-center rounded-xl bg-blue-600 px-6 py-4 text-lg font-semibold text-white transition hover:bg-blue-700"
          >
            Отправить заявку
          </button>
        </form>
      </section>
    </main>
  );
}
