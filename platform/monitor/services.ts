// Единый реестр проектов и сервисов портфолио.
// Используется admin-bot, dashboard и monitor.

export type ProjectStatus = 'active' | 'dev' | 'frozen' | 'archived'

export interface InfraCost {
  label: string
  perMonthUsd: number
}

export interface ProjectConfig {
  id: string                    // project_id в portfolio_events и prompts
  name: string                  // человекочитаемое название
  status: ProjectStatus
  services: MonitoredService[]
  // Ориентировочные расходы на инфраструктуру — всегда помечать как ~
  infraCosts?: InfraCost[]
}

export interface MonitoredService {
  name: string
  healthUrl: string
  railwayServiceId?: string
  betterStackMonitorId?: string
}

export const projects: ProjectConfig[] = [
  {
    id: 'food-agent',
    name: 'Food Agent 🍔',
    status: 'frozen',
    services: [
      {
        name: 'food-agent (Vercel)',
        healthUrl: process.env.FOOD_AGENT_URL
          ? `${process.env.FOOD_AGENT_URL}/api/health`
          : 'http://localhost:3000/api/health',
      },
      {
        name: 'food-agent-worker (Railway)',
        healthUrl: process.env.SCRAPER_WORKER_URL
          ? `${process.env.SCRAPER_WORKER_URL}/health`
          : 'http://localhost:3001/health',
        railwayServiceId: process.env.RAILWAY_WORKER_SERVICE_ID,
      },
    ],
    infraCosts: [
      { label: 'Vercel Pro',         perMonthUsd: 20 },
      { label: 'Railway (worker)',    perMonthUsd: 5  },
      { label: 'Supabase (shared)',   perMonthUsd: 25 },
    ],
  },
]

// Плоский список сервисов — для /status
export const services: MonitoredService[] = projects.flatMap((p) => p.services)
