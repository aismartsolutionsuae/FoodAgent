import type { NextConfig } from 'next'

const config: NextConfig = {
  serverExternalPackages: ['grammy'],
  transpilePackages: ['@portfolio/bot-core', '@portfolio/database'],
}

export default config
