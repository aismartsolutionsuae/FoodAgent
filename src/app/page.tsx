import type { Metadata } from 'next'

export const metadata: Metadata = {
  alternates: { canonical: '/' },
}

const BOT_URL = process.env.NEXT_PUBLIC_BOT_URL ?? 'https://t.me/FoodAgentBot'

const PLATFORMS = ['Talabat', 'Deliveroo', 'Careem', 'Noon Food', 'InstaShop']

export default function HomePage() {
  return (
    <div className="min-h-screen bg-white text-gray-900 font-sans">

      {/* ── Nav ─────────────────────────────────────────────── */}
      <nav className="sticky top-0 z-50 bg-white/90 backdrop-blur border-b border-gray-100">
        <div className="max-w-5xl mx-auto px-6 h-16 flex items-center justify-between">
          <span className="text-xl font-bold tracking-tight">🍽️ FoodAgent</span>
          <a href={BOT_URL}
            className="bg-[#2AABEE] hover:bg-[#1a9bde] text-white text-sm font-semibold px-5 py-2 rounded-full transition-colors">
            Try Free →
          </a>
        </div>
      </nav>

      {/* ── Hero ────────────────────────────────────────────── */}
      <section className="max-w-5xl mx-auto px-6 pt-20 pb-16 text-center">
        <h1 className="text-5xl sm:text-6xl font-extrabold tracking-tight leading-tight mb-6">
          Your AI food companion<br />
          <span className="text-[#2AABEE]">in UAE</span>
        </h1>
        <p className="text-xl text-gray-500 max-w-2xl mx-auto mb-10">
          Discover what to eat, find the best price across all major delivery platforms,
          and stay on track with your diet — all in one Telegram bot, by text or voice.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <a href={BOT_URL}
            className="inline-flex items-center justify-center gap-2 bg-[#2AABEE] hover:bg-[#1a9bde] text-white font-bold px-8 py-4 rounded-2xl text-lg transition-colors shadow-lg shadow-blue-200">
            <TelegramIcon />
            Open in Telegram
          </a>
          <a href="#value"
            className="inline-flex items-center justify-center gap-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold px-8 py-4 rounded-2xl text-lg transition-colors">
            See how it works
          </a>
        </div>
        <div className="flex items-center justify-center gap-3 mt-8 text-sm text-gray-400">
          <span>Available in</span>
          <span className="flex gap-2">
            <Flag emoji="🇷🇺" label="Russian" />
            <Flag emoji="🇬🇧" label="English" />
            <Flag emoji="🇸🇦" label="Arabic" />
          </span>
        </div>
      </section>

      {/* ── Three value pillars ──────────────────────────────── */}
      <section id="value" className="bg-gray-50 border-y border-gray-100 py-16">
        <div className="max-w-5xl mx-auto px-6">
          <SectionLabel>Why FoodAgent</SectionLabel>
          <h2 className="text-3xl sm:text-4xl font-bold text-center mb-12">
            More than a price checker
          </h2>
          <div className="grid sm:grid-cols-3 gap-8">
            <ValuePillar
              emoji="🔍"
              color="blue"
              title="Discover, don't scroll"
              desc={`Don't know what you want? Tell the bot your mood.\n\n"Something light and warm, not spicy, around 30 AED" — the AI finds it across every menu so you don't have to.`}
            />
            <ValuePillar
              emoji="💰"
              color="green"
              title="Always the best price"
              desc={`The same dish can cost 15–30 AED more on one platform than another after fees.\n\nFoodAgent shows the true total — dish + delivery + service charge — across all platforms at once.`}
            />
            <ValuePillar
              emoji="🥗"
              color="orange"
              title="Eat smart, not less"
              desc={`On keto? Counting calories? Set your goal and the bot filters for it.\n\n"Chicken dish, under 500 kcal, max 10g carbs" — FoodAgent finds it and shows the full nutrition breakdown.`}
            />
          </div>
        </div>
      </section>

      {/* ── Platforms ───────────────────────────────────────── */}
      <section className="max-w-5xl mx-auto px-6 py-14 text-center">
        <SectionLabel>Platforms compared</SectionLabel>
        <div className="flex flex-wrap justify-center gap-3 mt-4">
          {PLATFORMS.map((p) => (
            <div key={p}
              className="px-5 py-2 rounded-full text-sm font-semibold border border-[#2AABEE]/30 bg-white shadow-sm text-gray-800">
              {p}
            </div>
          ))}
        </div>
      </section>

      {/* ── Features ────────────────────────────────────────── */}
      <section className="bg-gray-50 border-y border-gray-100 py-20">
        <div className="max-w-5xl mx-auto px-6">
          <SectionLabel>What FoodAgent does</SectionLabel>
          <h2 className="text-3xl sm:text-4xl font-bold text-center mb-12">One bot. Everything you need.</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            <FeatureCard emoji="🔍" title="Semantic search"
              desc="The AI understands intent: 'something with seafood, not too heavy, no sushi' — not just keywords." />
            <FeatureCard emoji="💰" title="Full price breakdown"
              desc="Dish + delivery fee + service fee, side by side across all connected platforms. No surprises at checkout." />
            <FeatureCard emoji="🥗" title="Nutrition filtering"
              desc="Set calorie limits, carb caps, or pick a diet style (keto, halal, vegan) — FoodAgent filters and shows macros." />
            <FeatureCard emoji="🎤" title="Voice search" highlight
              desc="Hold mic in Telegram, say what you want. Works in Russian, English, and Arabic. Hands-free ordering." />
            <FeatureCard emoji="🔗" title="One-tap ordering"
              desc="Direct deep links open your chosen dish straight in the delivery app. No copy-pasting, no searching." />
            <FeatureCard emoji="📊" title="Weekly insights"
              desc="Sunday report: money saved, nutrition score trends, new restaurants discovered, city areas explored." />
          </div>
        </div>
      </section>

      {/* ── Voice spotlight ─────────────────────────────────── */}
      <section className="py-16">
        <div className="max-w-4xl mx-auto px-6 flex flex-col sm:flex-row items-center gap-10">
          <div className="text-7xl shrink-0">🎤</div>
          <div>
            <span className="text-xs font-bold uppercase tracking-widest text-[#2AABEE]">Exclusive feature</span>
            <h3 className="text-3xl font-bold mt-2 mb-4">Just say it — in any language</h3>
            <p className="text-gray-600 text-lg">
              Hold the mic button in Telegram and describe what you feel like eating.
              FoodAgent understands Russian, English and Arabic voice messages
              and instantly finds the best matching dishes across all platforms.
            </p>
          </div>
        </div>
      </section>

      {/* ── How it works ────────────────────────────────────── */}
      <section id="how-it-works" className="bg-gray-50 border-y border-gray-100 py-20">
        <div className="max-w-5xl mx-auto px-6">
          <SectionLabel>Simple as 1-2-3</SectionLabel>
          <h2 className="text-3xl sm:text-4xl font-bold text-center mb-12">How it works</h2>
          <div className="grid sm:grid-cols-3 gap-8">
            <Step n="1" emoji="💬" title="Tell the bot what you want"
              desc="Type, voice-record, or describe a mood. 'Light Japanese, under 40 AED' or 'I have no idea, surprise me'." />
            <Step n="2" emoji="⚡" title="We compare in real time"
              desc="FoodAgent checks current prices, fees, ratings and nutrition info across all connected platforms." />
            <Step n="3" emoji="🛵" title="Pick and order"
              desc="Choose the best deal. One button opens it directly in the delivery app — no extra steps." />
          </div>
        </div>
      </section>

      {/* ── Pricing ─────────────────────────────────────────── */}
      <section className="py-20">
        <div className="max-w-3xl mx-auto px-6 text-center">
          <SectionLabel>Pricing</SectionLabel>
          <h2 className="text-3xl sm:text-4xl font-bold mb-4">Start free. Pay later.</h2>
          <p className="text-gray-500 text-lg mb-10">
            Enjoy full access for free. Subscribe only if you love it.
          </p>
          <div className="bg-white rounded-3xl shadow-xl border border-gray-100 p-8 max-w-sm mx-auto">
            <div className="text-4xl mb-2">🎁</div>
            <div className="text-2xl font-bold mb-1">Free trial</div>
            <div className="text-gray-400 text-sm mb-6">then $9.99 / month</div>
            <ul className="text-left space-y-2 text-sm text-gray-600 mb-8">
              {[
                'Unlimited food searches',
                'Price comparison across all platforms',
                'Nutrition & calorie filtering',
                'Voice search in RU / EN / AR',
                'Personalised taste profile',
                'Weekly savings report',
              ].map((f) => (
                <li key={f} className="flex items-center gap-2">
                  <span className="text-green-500 font-bold">✓</span> {f}
                </li>
              ))}
            </ul>
            <a href={BOT_URL}
              className="block w-full text-center bg-[#2AABEE] hover:bg-[#1a9bde] text-white font-bold py-3 rounded-xl transition-colors">
              Start free →
            </a>
          </div>
        </div>
      </section>

      {/* ── Final CTA ───────────────────────────────────────── */}
      <section className="bg-gray-50 border-t border-gray-100 py-20 text-center">
        <h2 className="text-3xl sm:text-4xl font-bold mb-4">
          Stop guessing. Start eating well. 🚀
        </h2>
        <p className="text-gray-500 text-lg mb-8">
          Join UAE residents who save money, discover great food, and stick to their diet goals.
        </p>
        <a href={BOT_URL}
          className="inline-flex items-center justify-center gap-2 bg-[#2AABEE] hover:bg-[#1a9bde] text-white font-bold px-10 py-4 rounded-2xl text-lg transition-colors shadow-lg shadow-blue-200">
          <TelegramIcon />
          Open FoodAgent in Telegram
        </a>
      </section>

      {/* ── Footer ──────────────────────────────────────────── */}
      <footer className="border-t border-gray-100 py-8">
        <div className="max-w-5xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-gray-400">
          <span>© 2025 FoodAgent. Made for UAE 🇦🇪</span>
          <div className="flex gap-6">
            <a href="/privacy" className="hover:text-gray-700 transition-colors">Privacy</a>
            <a href="/terms" className="hover:text-gray-700 transition-colors">Terms</a>
            <a href={BOT_URL} className="hover:text-gray-700 transition-colors">Telegram</a>
          </div>
        </div>
      </footer>
    </div>
  )
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function TelegramIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.894 8.221-1.97 9.28c-.145.658-.537.818-1.084.508l-3-2.21-1.447 1.394c-.16.16-.295.295-.605.295l.213-3.053 5.56-5.023c.242-.213-.054-.333-.373-.12L7.17 13.5l-2.95-.924c-.64-.203-.657-.64.136-.954l11.57-4.461c.537-.194 1.006.131.968.96z" />
    </svg>
  )
}

function Flag({ emoji, label }: { emoji: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1 bg-gray-100 rounded-full px-3 py-1">
      {emoji} {label}
    </span>
  )
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-center text-xs font-bold uppercase tracking-widest text-[#2AABEE] mb-3">
      {children}
    </p>
  )
}

function ValuePillar({ emoji, color, title, desc }: {
  emoji: string; color: 'blue' | 'green' | 'orange'; title: string; desc: string
}) {
  const colors = {
    blue:   'bg-blue-50 border-blue-100',
    green:  'bg-green-50 border-green-100',
    orange: 'bg-orange-50 border-orange-100',
  }
  return (
    <div className={`rounded-2xl p-6 border ${colors[color]}`}>
      <div className="text-4xl mb-4">{emoji}</div>
      <h3 className="font-bold text-xl mb-3">{title}</h3>
      <p className="text-gray-600 text-sm leading-relaxed whitespace-pre-line">{desc}</p>
    </div>
  )
}

function FeatureCard({ emoji, title, desc, highlight }: {
  emoji: string; title: string; desc: string; highlight?: boolean
}) {
  return (
    <div className={`rounded-2xl p-6 border transition-shadow hover:shadow-md ${
      highlight ? 'border-[#2AABEE]/40 bg-[#2AABEE]/5' : 'border-gray-100 bg-white'
    }`}>
      <div className="text-3xl mb-3">{emoji}</div>
      <h3 className="font-bold text-lg mb-2">
        {title}
        {highlight && (
          <span className="ml-2 text-xs bg-[#2AABEE] text-white rounded-full px-2 py-0.5">New</span>
        )}
      </h3>
      <p className="text-gray-500 text-sm leading-relaxed">{desc}</p>
    </div>
  )
}

function Step({ n, emoji, title, desc }: { n: string; emoji: string; title: string; desc: string }) {
  return (
    <div className="text-center">
      <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-[#2AABEE]/10 text-[#2AABEE] font-bold text-lg mb-4">
        {n}
      </div>
      <div className="text-4xl mb-3">{emoji}</div>
      <h3 className="font-bold text-lg mb-2">{title}</h3>
      <p className="text-gray-500 text-sm leading-relaxed">{desc}</p>
    </div>
  )
}
