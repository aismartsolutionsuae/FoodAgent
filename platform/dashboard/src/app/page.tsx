import { projects } from '@portfolio/monitor'
import { getProjectMetrics, type ProjectMetrics } from '../lib/metrics'

export const revalidate = 60 // обновлять каждую минуту

const STATUS_COLOR: Record<string, string> = {
  active:   '#22c55e',
  dev:      '#3b82f6',
  frozen:   '#eab308',
  archived: '#6b7280',
}

const HEALTH_ICON: Record<string, string> = {
  up:      '✅',
  down:    '❌',
  unknown: '❓',
}

function Card({ m }: { m: ProjectMetrics }) {
  const color = STATUS_COLOR[m.status] ?? '#6b7280'
  return (
    <div style={{
      background: '#1a1a1a',
      border: `1px solid #2a2a2a`,
      borderLeft: `4px solid ${color}`,
      borderRadius: 8,
      padding: '20px 24px',
      display: 'flex',
      flexDirection: 'column',
      gap: 12,
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>{m.name}</h2>
        <span style={{
          background: color + '22',
          color,
          fontSize: 11,
          fontWeight: 600,
          padding: '2px 8px',
          borderRadius: 4,
          textTransform: 'uppercase',
          letterSpacing: 1,
        }}>
          {m.status}
        </span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
        <Stat label="Сервис" value={HEALTH_ICON[m.serviceHealth]} />
        <Stat label="Пользователей" value={String(m.users)} />
        <Stat label="MRR" value={`$${m.mrrUsd.toFixed(0)}`} />
        <Stat label="AI сегодня" value={String(m.aiCallsToday)} />
      </div>

      {m.pendingApprovals > 0 && (
        <div style={{
          background: '#eab30820',
          border: '1px solid #eab30840',
          borderRadius: 6,
          padding: '6px 12px',
          fontSize: 13,
          color: '#eab308',
        }}>
          ⏳ Ожидают одобрения: {m.pendingApprovals}
        </div>
      )}
    </div>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <span style={{ fontSize: 11, color: '#6b7280', textTransform: 'uppercase', letterSpacing: 0.5 }}>
        {label}
      </span>
      <span style={{ fontSize: 20, fontWeight: 700 }}>{value}</span>
    </div>
  )
}

export default async function DashboardPage() {
  const metrics = await Promise.all(projects.map(getProjectMetrics))

  const now = new Date().toLocaleString('ru-RU', { timeZone: 'Asia/Dubai' })

  return (
    <main style={{ maxWidth: 900, margin: '0 auto', padding: '32px 16px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32 }}>
        <h1 style={{ margin: 0, fontSize: 24, fontWeight: 800 }}>📊 Portfolio</h1>
        <span style={{ fontSize: 12, color: '#6b7280' }}>Обновлено: {now} (Dubai)</span>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {metrics.map((m) => <Card key={m.projectId} m={m} />)}
      </div>

      {metrics.length === 0 && (
        <p style={{ color: '#6b7280', textAlign: 'center', marginTop: 60 }}>
          Проекты не настроены. Добавь проект в <code>platform/monitor/services.ts</code>
        </p>
      )}
    </main>
  )
}
