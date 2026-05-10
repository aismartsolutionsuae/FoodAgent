export interface Persona {
  id: string
  slug: string
  name: string
  language: 'ru' | 'en' | 'ar'
  description: string | null
  traits: {
    budget: 'low' | 'mid' | 'high'
    dietary: string[]
    tech_level: 'low' | 'mid' | 'high'
    typical_queries: string[]
    use_cases: string[]
  }
  is_active: boolean
}

export interface JourneyStep {
  message: string
  expectedContains?: string[]
  expectedNotContains?: string[]
}

export interface StepResult {
  message: string
  reply: string
  passed: boolean
  failReason?: string
}

export interface JourneyResult {
  persona: string
  steps: StepResult[]
  passed: boolean
  durationMs: number
}

export interface JudgeResult {
  score: number        // 0–10
  passed: boolean
  reasoning: string
  suggestions?: string[]
}
