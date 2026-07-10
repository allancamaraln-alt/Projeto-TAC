import { useState, useEffect, useMemo } from 'react'
import { useNavigate, Navigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { useToast } from '../hooks/useToast'
import { fetchAnalyticsSummary } from '../lib/analytics'
import { formatBRL } from '../lib/format'
import StatCard from '../components/admin/StatCard'
import FilterBar, { periodoParaDatas } from '../components/admin/FilterBar'
import DataTable from '../components/admin/DataTable'
import CategoryBarList from '../components/admin/CategoryBarList'
import RevenueTrendChart from '../components/admin/RevenueTrendChart'
import ExportButtons from '../components/admin/ExportButtons'
import { ORIGEM_COLORS, DISPOSITIVO_COLORS, NAVEGADOR_COLORS } from '../lib/chartPalette'

export default function AdminAnalytics() {
  const navigate = useNavigate()
  const { isAdmin } = useAuth()
  const { toast } = useToast()

  const [dados, setDados] = useState(null)
  const [loading, setLoading] = useState(true)

  const [periodo, setPeriodo] = useState('30d')
  const [campanha, setCampanha] = useState(null)
  const [origem, setOrigem] = useState(null)
  const [plano, setPlano] = useState(null)

  useEffect(() => {
    carregar()
  }, [periodo, campanha, origem, plano])

  async function carregar() {
    setLoading(true)
    try {
      const { desde, ate } = periodoParaDatas(periodo)
      const data = await fetchAnalyticsSummary({ desde, ate, campanha, origem, plano })
      setDados(data)
    } catch (e) {
      toast(e.message || 'Erro ao carregar analytics', 'error')
    } finally {
      setLoading(false)
    }
  }

  const campanhasDisponiveis = useMemo(
    () => [...new Set((dados?.campaigns ?? []).map((c) => c.utm_campaign).filter(Boolean))],
    [dados]
  )

  if (!isAdmin) return <Navigate to="/" />

  return (
    <div className="page-container">
      <div className="bg-white px-4 pt-12 pb-4 border-b border-gray-100 flex items-center gap-3 sticky top-0 z-10">
        <button onClick={() => navigate(-1)} className="w-9 h-9 flex items-center justify-center rounded-full active:bg-gray-100">
          <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <div className="flex-1">
          <h1 className="text-lg font-bold text-gray-800">Analytics</h1>
          <p className="text-xs text-gray-400">Receita, campanhas, origem e falhas de rastreamento</p>
        </div>
        <button onClick={() => navigate('/admin/tracking-debug')} className="text-xs px-3 py-1.5 rounded-lg border border-gray-200 text-gray-600 font-semibold">
          Tracking Debug →
        </button>
      </div>

      <div className="px-4 pt-4 pb-24 space-y-4">
        <FilterBar
          periodo={periodo} onPeriodoChange={setPeriodo}
          campanha={campanha} onCampanhaChange={setCampanha} campanhasDisponiveis={campanhasDisponiveis}
          origem={origem} onOrigemChange={setOrigem}
          plano={plano} onPlanoChange={setPlano}
        />

        {loading && (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => <div key={i} className="card h-20 animate-pulse bg-gray-100" />)}
          </div>
        )}

        {!loading && dados && (
          <>
            <div>
              <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Receita</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <StatCard label="Hoje" value={formatBRL(dados.revenue.today.receita)} sublabel={`${dados.revenue.today.compras} compras`} />
                <StatCard label="7 dias" value={formatBRL(dados.revenue.week.receita)} sublabel={`${dados.revenue.week.compras} compras`} />
                <StatCard label="Este mês" value={formatBRL(dados.revenue.month.receita)} sublabel={`${dados.revenue.month.compras} compras`} />
                <StatCard label="Total" value={formatBRL(dados.revenue.total.receita)} sublabel={`${dados.revenue.total.compras} compras`} />
              </div>
              {dados.revenue.filtered && (
                <p className="text-xs text-gray-400 mt-2">
                  Com os filtros aplicados: <span className="font-semibold text-gray-600">{formatBRL(dados.revenue.filtered.receita)}</span> em {dados.revenue.filtered.compras} compras
                </p>
              )}
            </div>

            <RevenueTrendChart data={dados.timeseries} />

            <div>
              <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Assinaturas</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <StatCard label="Novas assinaturas" value={dados.subscriptions.novas_assinaturas} sublabel="no período filtrado" />
                <StatCard label="Assinaturas ativas" value={dados.subscriptions.assinaturas_ativas} sublabel="agora" />
                <StatCard label="Cancelamentos" value={dados.subscriptions.cancelamentos} sublabel="no período filtrado" />
                <StatCard
                  label="Conversão da Landing"
                  value={dados.landing.taxa_conversao != null ? `${dados.landing.taxa_conversao}%` : '—'}
                  sublabel={`${dados.landing.cadastros} cadastros / ${dados.landing.visitas} visitas`}
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Campanhas</h2>
                <ExportButtons rows={dados.campaigns} filename="campanhas" />
              </div>
              <DataTable
                columns={[
                  { key: 'utm_campaign', label: 'Campanha' },
                  { key: 'utm_source', label: 'Origem' },
                  { key: 'utm_medium', label: 'Mídia' },
                  { key: 'compras', label: 'Compras' },
                  { key: 'receita', label: 'Receita', render: (r) => formatBRL(r.receita) },
                  { key: 'ticket_medio', label: 'Ticket médio', render: (r) => formatBRL(r.ticket_medio) },
                  { key: 'conversao', label: '% conversão', render: (r) => (r.conversao != null ? `${r.conversao}%` : '—') },
                ]}
                rows={dados.campaigns}
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Anúncios</h2>
                <ExportButtons rows={dados.ads} filename="anuncios" />
              </div>
              <DataTable
                columns={[
                  { key: 'utm_content', label: 'utm_content' },
                  { key: 'utm_term', label: 'utm_term' },
                  { key: 'compras', label: 'Compras' },
                  { key: 'receita', label: 'Receita', render: (r) => formatBRL(r.receita) },
                ]}
                rows={dados.ads}
              />
            </div>

            <div>
              <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Origem</h2>
              <CategoryBarList data={dados.origin} colorMap={ORIGEM_COLORS} labelKey="origem" valueKey="compras" formatValue={(d) => `${d.compras} · ${formatBRL(d.receita)}`} />
            </div>

            <div>
              <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Dispositivos</h2>
              <CategoryBarList data={dados.devices} colorMap={DISPOSITIVO_COLORS} labelKey="dispositivo" valueKey="compras" formatValue={(d) => `${d.compras} · ${formatBRL(d.receita)}`} />
            </div>

            <div>
              <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Navegadores</h2>
              <CategoryBarList data={dados.browsers} colorMap={NAVEGADOR_COLORS} labelKey="navegador" valueKey="compras" formatValue={(d) => `${d.compras} · ${formatBRL(d.receita)}`} />
            </div>
          </>
        )}
      </div>
    </div>
  )
}
