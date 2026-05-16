import { I18n, type I18nConfig } from '@grammyjs/i18n'
import { readFileSync, existsSync } from 'fs'
import { fileURLToPath } from 'url'
import path from 'path'

// Wires @grammyjs/i18n with base (bot-core) + project locale strings.
//
// @grammyjs/i18n v1 cannot merge two locale directories — the first bundle
// registered for a locale shadows later ones. So per locale we concatenate
// base + project Fluent source and load it once. Within a single source,
// Fluent's addResource runs with allowOverrides:true, so a key redefined by
// the project (placed after base) overrides the base value; keys only in
// base remain as fallback.
//
// Base files:    packages/bot-core/locales/{ru,en,ar}.ftl
// Project files: projects/[name]/locales/{ru,en,ar}.ftl
//
// Usage in bot.ts:
//   const i18n = setupI18n(path.join(__dirname, '../locales'))
//   bot.use(i18n)

const LOCALES = ['ru', 'en', 'ar'] as const

export function setupI18n(projectLocalesDir: string, opts: Partial<I18nConfig> = {}): I18n {
  // `../../locales` from this module resolves to packages/bot-core/locales
  // whether running from src/ (tsx) or a compiled dist/ — both are one level
  // under the package root.
  const moduleDir = path.dirname(fileURLToPath(import.meta.url))
  const baseLocalesDir = path.join(moduleDir, '..', '..', 'locales')

  const i18n = new I18n({
    defaultLocale: 'ru',
    fluentBundleOptions: { useIsolating: false },
    ...opts,
  })

  for (const locale of LOCALES) {
    const baseFile = path.join(baseLocalesDir, `${locale}.ftl`)
    const projectFile = path.join(projectLocalesDir, `${locale}.ftl`)

    const parts: string[] = []
    if (existsSync(baseFile)) parts.push(readFileSync(baseFile, 'utf8'))
    if (existsSync(projectFile)) parts.push(readFileSync(projectFile, 'utf8'))
    if (parts.length === 0) continue

    // base first, project second → project keys override base.
    i18n.loadLocaleSync(locale, { source: parts.join('\n\n') })
  }

  return i18n
}

export type { I18n }
