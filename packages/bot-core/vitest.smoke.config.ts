import { defineConfig } from 'vitest/config'

// Smoke harness runs ONLY via `pnpm smoke` (its own config). It is deliberately
// excluded from the default vitest config (`src/**/*.test.ts`) so the per-PR
// `pnpm test` never makes live network calls. See Wave 3 Part B spec.
export default defineConfig({
  test: {
    environment: 'node',
    include: ['scripts/smoke.test.ts'],
    testTimeout: 30_000,
  },
})
