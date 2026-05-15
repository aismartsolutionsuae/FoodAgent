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

// No active products yet. food-agent removed 2026-05-15 (archived as git
// tag food-agent-archive). Add a ProjectConfig here as each product launches.
export const projects: ProjectConfig[] = []

// Плоский список сервисов — для /status
export const services: MonitoredService[] = projects.flatMap((p) => p.services)
