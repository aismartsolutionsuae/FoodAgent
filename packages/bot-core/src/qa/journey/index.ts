import type { Persona, JourneyStep, JourneyResult, StepResult } from '../types'

export async function simulateUserJourney(
  persona: Persona,
  steps: JourneyStep[],
  handler: (message: string, persona: Persona) => Promise<string>,
): Promise<JourneyResult> {
  const start = Date.now()
  const results: StepResult[] = []

  for (const step of steps) {
    const reply = await handler(step.message, persona)
    let passed = true
    let failReason: string | undefined

    if (step.expectedContains?.length) {
      const matched = step.expectedContains.some((s) =>
        reply.toLowerCase().includes(s.toLowerCase()),
      )
      if (!matched) {
        passed = false
        failReason = `Expected one of [${step.expectedContains.join(', ')}] in reply`
      }
    }

    if (passed && step.expectedNotContains?.length) {
      const blocked = step.expectedNotContains.find((s) =>
        reply.toLowerCase().includes(s.toLowerCase()),
      )
      if (blocked) {
        passed = false
        failReason = `Reply must NOT contain "${blocked}"`
      }
    }

    results.push({ message: step.message, reply, passed, failReason })
    if (!passed) break
  }

  return {
    persona: persona.name,
    steps: results,
    passed: results.every((s) => s.passed),
    durationMs: Date.now() - start,
  }
}

export async function runJourneyForAll(
  personas: Persona[],
  steps: JourneyStep[],
  handler: (message: string, persona: Persona) => Promise<string>,
): Promise<JourneyResult[]> {
  return Promise.all(personas.map((p) => simulateUserJourney(p, steps, handler)))
}

export function formatJourneyReport(results: JourneyResult[]): string {
  const lines: string[] = []
  for (const r of results) {
    const icon = r.passed ? '✅' : '❌'
    lines.push(`${icon} ${r.persona} (${r.durationMs}ms)`)
    if (!r.passed) {
      const failed = r.steps.find((s) => !s.passed)
      if (failed) lines.push(`   └─ "${failed.message}" → ${failed.failReason}`)
    }
  }
  const total = results.length
  const passed = results.filter((r) => r.passed).length
  lines.push(`\n${passed}/${total} персон прошли journey`)
  return lines.join('\n')
}
