// Стоимость моделей в USD за 1M токенов (ориентировочно, обновлять по мере изменений)
// Источники: openai.com/pricing, anthropic.com/pricing
// Последнее обновление: май 2026

interface ModelCost {
  input: number   // USD / 1M input tokens
  output: number  // USD / 1M output tokens
}

const MODEL_COSTS: Record<string, ModelCost> = {
  // ── OpenAI ──────────────────────────────────────────────────────────────────
  'gpt-4o':              { input: 2.50,  output: 10.00 },
  'gpt-4o-mini':         { input: 0.15,  output: 0.60  },
  'gpt-4.1':             { input: 2.00,  output: 8.00  },
  'gpt-4.1-mini':        { input: 0.40,  output: 1.60  },
  'gpt-5':               { input: 15.00, output: 60.00 },
  'gpt-5.4':             { input: 15.00, output: 60.00 }, // ориент.
  'o3':                  { input: 10.00, output: 40.00 },
  'o3-mini':             { input: 1.10,  output: 4.40  },
  'o4-mini':             { input: 1.10,  output: 4.40  }, // ориент.

  // ── Anthropic ────────────────────────────────────────────────────────────────
  'claude-opus-4-7':            { input: 15.00, output: 75.00 },
  'claude-sonnet-4-6':          { input: 3.00,  output: 15.00 },
  'claude-haiku-4-5-20251001':  { input: 0.25,  output: 1.25  },
  'claude-haiku-4-5':           { input: 0.25,  output: 1.25  },
}

const DEFAULT_COST: ModelCost = { input: 3.00, output: 15.00 }

// Оценка стоимости вызова по длине строк (~4 символа = 1 токен)
export function estimateCostUsd(model: string, inputText: string, outputText: string): number {
  const costs = MODEL_COSTS[model] ?? DEFAULT_COST
  const inputTokens  = Math.ceil(inputText.length  / 4)
  const outputTokens = Math.ceil(outputText.length / 4)
  return (inputTokens * costs.input + outputTokens * costs.output) / 1_000_000
}
