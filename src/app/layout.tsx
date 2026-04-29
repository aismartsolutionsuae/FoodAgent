import type { Metadata } from 'next'
import './globals.css'

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://foodagent.ae'
const TITLE = 'FoodAgent — AI Food Search for UAE'
const DESCRIPTION =
  'Find the best food in UAE in 15 seconds. Compare Talabat & Deliveroo prices, get nutrition info, search by voice. Free 30-day trial.'

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  metadataBase: new URL(SITE_URL),
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    type: 'website',
    locale: 'en_AE',
  },
  twitter: {
    card: 'summary_large_image',
    title: TITLE,
    description: DESCRIPTION,
  },
  keywords: ['food delivery UAE', 'Talabat compare', 'Deliveroo compare', 'Dubai food app', 'food agent AI'],
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru">
      <body suppressHydrationWarning>{children}</body>
    </html>
  )
}
