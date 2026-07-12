import { useEffect, useState } from 'react'
import { useAuth } from '../../hooks/useAuth'
import { fetchDashboardStats, getGreeting, formatCompact } from '../../lib/ai/dashboardStats'

function StatChip({ icon, label, value, loading }) {
  return (
    <div className="flex-1 min-w-0 bg-white rounded-2xl p-3 border border-gray-100 shadow-sm">
      {loading ? (
        <div className="h-5 w-10 bg-gray-100 rounded-md animate-pulse mb-1.5" />
      ) : (
        <p className="text-[15px] font-bold text-gray-900 leading-none tabular-nums truncate">{value}</p>
      )}
      <p className="text-[11px] text-gray-400 mt-1.5 leading-tight flex items-center gap-1">
        <span className="text-xs">{icon}</span>{label}
      </p>
    </div>
  )
}

// Saudação + estatísticas ao vivo + insight proativo — extraído da
// antiga SmartEmptyState em AIAssistant.jsx. Reutilizado tanto por
// ChatHome.jsx (tela cheia) quanto pelo modal do AIAssistant.
export default function GreetingHero({ firstName }) {
  const { user } = useAuth()
  const [stats, setStats] = useState(null)
  const [loadingStats, setLoadingStats] = useState(true)

  useEffect(() => {
    if (!user?.id) return
    setLoadingStats(true)
    fetchDashboardStats(user.id)
      .then(setStats)
      .catch(() => setStats(null))
      .finally(() => setLoadingStats(false))
  }, [user?.id])

  const greeting = getGreeting()
  const now = new Date()
  const dayName = now.toLocaleDateString('pt-BR', { weekday: 'long' })
  const dateLabel = `${dayName.charAt(0).toUpperCase()}${dayName.slice(1)}, ${now.toLocaleDateString('pt-BR', { day: 'numeric', month: 'long' })}`

  let insight = null
  if (stats && !loadingStats) {
    if (stats.osHoje > 0) {
      insight = {
        icon: '📅',
        text: stats.osHoje === 1 ? '1 OS agendada para hoje' : `${stats.osHoje} OS agendadas para hoje`,
        isAccent: true,
      }
    } else if (stats.pendentes > 0) {
      insight = {
        icon: '💳',
        text: `${formatCompact(stats.aReceber)} a receber — ${stats.pendentes} OS pendente${stats.pendentes !== 1 ? 's' : ''}`,
        isAccent: false,
      }
    }
  }

  return (
    <div className="relative">
      {/* Orbe decorativo — mesma linguagem visual do gradiente do header */}
      <div
        className="absolute -top-8 -right-10 w-40 h-40 rounded-full pointer-events-none"
        style={{ background: 'rgb(var(--ac) / 0.10)', filter: 'blur(28px)' }}
      />

      <div className="relative mb-4 animate-fade-up">
        <h2 className="text-[24px] font-bold text-gray-900 leading-tight tracking-tight">
          {greeting}{firstName ? `, ${firstName}` : ''} <span className="inline-block">👋</span>
        </h2>
        <p className="text-sm text-gray-400 mt-1">{dateLabel}</p>
      </div>

      <div className="relative flex gap-2 mb-4 animate-fade-up" style={{ animationDelay: '60ms' }}>
        <StatChip icon="📅" label="OS hoje" value={String(stats?.osHoje ?? 0)} loading={loadingStats} />
        <StatChip icon="💳" label="A receber" value={stats ? formatCompact(stats.aReceber) : '—'} loading={loadingStats} />
        <StatChip icon="📈" label="No mês" value={stats ? formatCompact(stats.receitaMes) : '—'} loading={loadingStats} />
      </div>

      {insight && (
        <div
          className="relative flex items-center gap-2.5 rounded-2xl px-3.5 py-2.5 mb-4 border animate-fade-up"
          style={{
            animationDelay: '120ms',
            ...(insight.isAccent ? {
              backgroundColor: 'rgb(var(--ac) / 0.07)',
              borderColor: 'rgb(var(--ac) / 0.2)',
            } : {
              backgroundColor: '#fffbeb',
              borderColor: '#fde68a',
            }),
          }}
        >
          <span className="text-sm">{insight.icon}</span>
          <p
            className="text-sm font-medium leading-snug"
            style={{ color: insight.isAccent ? 'rgb(var(--ac-dk))' : '#92400e' }}
          >
            {insight.text}
          </p>
        </div>
      )}
    </div>
  )
}
