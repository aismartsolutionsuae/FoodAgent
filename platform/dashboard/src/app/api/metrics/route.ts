import { NextRequest, NextResponse } from 'next/server'
import { projects } from '@portfolio/monitor'
import { getProjectMetrics } from '../../../lib/metrics'

// Простая авторизация по токену — внутренний инструмент
function isAuthorized(req: NextRequest): boolean {
  const secret = process.env.DASHBOARD_SECRET
  if (!secret) return true // если не задан — открыт (только для dev)
  const token = req.headers.get('x-dashboard-token') ?? req.nextUrl.searchParams.get('token')
  return token === secret
}

export async function GET(req: NextRequest): Promise<NextResponse> {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const metrics = await Promise.all(projects.map(getProjectMetrics))
  return NextResponse.json(metrics)
}
