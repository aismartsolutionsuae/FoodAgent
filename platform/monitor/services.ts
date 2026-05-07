// Registry of all portfolio services.
// platform/monitor reads this to:
//   - register health check URLs in BetterStack
//   - auto-restart crashed Railway services via Railway API

export interface MonitoredService {
  name: string
  healthUrl: string
  railwayServiceId?: string   // set after Railway deploy
  betterStackMonitorId?: string  // set after BetterStack registration
}

export const services: MonitoredService[] = [
  {
    name: 'food-agent',
    healthUrl: process.env.FOOD_AGENT_URL
      ? `${process.env.FOOD_AGENT_URL}/api/health`
      : 'http://localhost:3000/api/health',
  },
  {
    name: 'food-agent-worker',
    healthUrl: process.env.SCRAPER_WORKER_URL
      ? `${process.env.SCRAPER_WORKER_URL}/health`
      : 'http://localhost:3001/health',
    railwayServiceId: process.env.RAILWAY_WORKER_SERVICE_ID,
  },
]
