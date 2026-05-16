import { judge as aiJudge } from '../ai'
import type { JudgeResult } from './types'

// Evaluates bot reply quality. Prompt lives in Supabase as shared judge row
// 'qa:reply_judge' (is_judge=true, migrations/005_shared_agent_prompts.sql).
// Model gpt-4o-mini per CLAUDE.md (AI-as-judge != generator).
export async function judge(
  userMessage: string,
  botReply: string,
  criteria: string,
): Promise<JudgeResult> {
  try {
    return await aiJudge<JudgeResult>('qa:reply_judge', {
      userMessage,
      botReply,
      criteria,
    })
  } catch {
    return { score: 0, passed: false, reasoning: 'judge error', suggestions: [] }
  }
}
