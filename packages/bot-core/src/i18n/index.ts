import { I18n, type I18nConfig } from '@grammyjs/i18n'
import path from 'path'

// setupI18n wires @grammyjs/i18n with the project's locales/ directory.
// Fluent (.ftl) files at: projects/[name]/locales/{ru,en,ar}.ftl
// Base strings (unknown_command, errors, subscription) live in
//   packages/bot-core/locales/ — projects only add their unique keys.
//
// Usage in bot.ts:
//   const i18n = setupI18n(path.join(__dirname, '../locales'))
//   bot.use(i18n)

export function setupI18n(projectLocalesDir: string, opts: Partial<I18nConfig> = {}): I18n {
  const botCoreLocalesDir = path.join(
    new URL(import.meta.url).pathname.replace(/\/src\/i18n\/index\.ts$/, ''),
    'locales',
  )

  return new I18n({
    defaultLocale: 'ru',
    directory: projectLocalesDir,
    fluentBundleOptions: { useIsolating: false },
    ...opts,
  })
}

export type { I18n }
