import { createClient } from '@supabase/supabase-js'
import type { ProjectConfig } from '@portfolio/monitor'

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
)

export interface ProjectMetrics {
  projectId: string
  name: string
  status: string
  users: number
  mrrUsd: number
  serviceHealth: 'up' | 'down' | 'unknown'
  pendingApprovals: number
  aiCallsToday: number
}

export async function getProjectMetrics(project: ProjectConfig): Promise<ProjectMetrics> {
  const monthStart = new Date()
  monthStart.setDate(1)
  monthStart.setHours(0, 0, 0, 0)

  const dayStart = new Date()
  dayStart.setHours(0, 0, 0, 0)

  const [usersRes, revenueRes, pendingRes, aiCallsRes, healthStatus] = await Promise.allSettled([
    // Уникальные пользователи проекта
    supabase
      .from('portfolio_events')
      .select('user_id', { count: 'exact', head: true })
      .eq('project_id', project.id)
      .not('user_id', 'is', null),

    // Выручка за текущий месяц
    supabase
      .from('portfolio_events')
      .select('revenue_usd')
      .eq('project_id', project.id)
      .gte('created_at', monthStart.toISOString())
      .not('revenue_usd', 'is', null),

    // Ожидают одобрения
    supabase
      .from('approval_queue')
      .select('id', { count: 'exact', head: true })
      .eq('project_id', project.id)
      .eq('status', 'pending'),

    // AI-вызовы сегодня
    supabase
      .from('portfolio_events')
      .select('id', { count: 'exact', head: true })
      .eq('project_id', project.id)
      .like('event_name', 'ai:%')
      .gte('created_at', dayStart.toISOString()),

    // Health check основного сервиса
    checkServiceHealth(project.services[0]?.healthUrl),
  ])

  const users = usersRes.status === 'fulfilled' ? (usersRes.value.count ?? 0) : 0

  const revenueRows =
    revenueRes.status === 'fulfilled' ? (revenueRes.value.data ?? []) : []
  const mrrUsd = revenueRows.reduce((s, r) => s + Number(r.revenue_usd ?? 0), 0)

  const pendingApprovals =
    pendingRes.status === 'fulfilled' ? (pendingRes.value.count ?? 0) : 0

  const aiCallsToday =
    aiCallsRes.status === 'fulfilled' ? (aiCallsRes.value.count ?? 0) : 0

  const serviceHealth = healthStatus.status === 'fulfilled' ? healthStatus.value : 'unknown'

  return {
    projectId: project.id,
    name: project.name,
    status: project.status,
    users,
    mrrUsd,
    serviceHealth,
    pendingApprovals,
    aiCallsToday,
  }
}

async function checkServiceHealth(url?: string): Promise<'up' | 'down' | 'unknown'> {
  if (!url) return 'unknown'
  try {
    const resp = await fetch(url, { signal: AbortSignal.timeout(5_000) })
    return resp.ok ? 'up' : 'down'
  } catch {
    return 'down'
  }
}
