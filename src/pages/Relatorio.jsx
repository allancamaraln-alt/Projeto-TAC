import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { formatOS, formatBRL, formatDate } from '../lib/format'
import StatusBadge from '../components/StatusBadge'
import { useAuth } from '../hooks/useAuth'

const PERIODOS = [
  { label: 'Esta semana', value: 'semana' },
  { label: 'Este mês', value: 'mes' },
  { label: 'Últimos 3 meses', value: 'trimestre' },
  { label: 'Tudo', value: 'tudo' },
]

function getInicio(periodo) {
  const now = new Date()
  if (periodo === 'semana') {
    const d = new Date(now)
    d.setDate(d.getDate() - 7)
    return d.toISOString()
  }
  if (periodo === 'mes') {
    return new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
  }
  if (periodo === 'trimestre') {
    const d = new Date(now)
    d.setMonth(d.getMonth() - 3)
    return d.toISOString()
  }
  return null // tudo
}

export default function Relatorio() {
  const navigate = useNavigate()
  const { hasFaturamento, hasRelatorioAvancado } = useAuth()
  const [periodo, setPeriodo] = useState('mes')
  const [ordens, setOrdens] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      setLoading(true)
      let query = supabase
        .from('ordens_servico')
        .select('*, clientes(nome)')
        .order('created_at', { ascending: false })

      const inicio = getInicio(periodo)
      if (inicio) query = query.gte('created_at', inicio)

      const timeout = new Promise(resolve => setTimeout(() => resolve({ data: [] }), 5000))
      const { data } = await Promise.race([query, timeout])
      setOrdens(data ?? [])
      setLoading(false)
    }
    load()
  }, [periodo])

  const concluidas = ordens.filter(os => os.status === 'concluido')
  const totalFaturado = concluidas.reduce((acc, os) => acc + Number(os.valor), 0)
  const totalOrcamentos = ordens.filter(os => os.status === 'orcamento').length
  const totalEmAndamento = ordens.filter(os => os.status === 'em_andamento').length

  const ticketMedio = concluidas.length > 0 ? totalFaturado / concluidas.length : 0

  const topClientes = Object.entries(
    concluidas.reduce((acc, os) => {
      const nome = os.clientes?.nome ?? 'Desconhecido'
      acc[nome] = (acc[nome] ?? 0) + Number(os.valor)
      return acc
    }, {})
  )
    .map(([nome, total]) => ({ nome, total }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 5)

  if (!hasFaturamento) {
    return (
      <div className="page-container">
        <div className="bg-white px-4 pt-12 pb-4 border-b border-gray-100 flex items-center gap-3 sticky top-0 z-10">
          <button onClick={() => navigate(-1)} className="w-9 h-9 flex items-center justify-center rounded-full active:bg-gray-100">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <h1 className="text-xl font-bold text-gray-800">Relatório</h1>
        </div>
        <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
          <div className="w-16 h-16 bg-sky-50 rounded-2xl flex items-center justify-center mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-8 h-8 text-sky-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <h2 className="text-lg font-bold text-gray-800 mb-2">Recurso do plano Plus ou superior</h2>
          <p className="text-sm text-gray-500 max-w-xs leading-relaxed mb-6">
            O relatório de faturamento está disponível nos planos <strong>Técnico Plus</strong>, <strong>Profissional</strong> e <strong>Anual</strong>.
          </p>
          <p className="text-xs text-gray-400">
            Para fazer upgrade, aguarde a renovação do seu plano e escolha um plano superior.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="page-container">
      {/* Header */}
      <div className="bg-white px-4 pt-12 pb-4 border-b border-gray-100 flex items-center gap-3 sticky top-0 z-10">
        <button onClick={() => navigate(-1)} className="w-9 h-9 flex items-center justify-center rounded-full active:bg-gray-100">
          <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <h1 className="text-xl font-bold text-gray-800">Relatório</h1>
      </div>

      <div className="px-4 pt-4 space-y-4">
        {/* Seletor de período */}
        <div className="flex gap-2 overflow-x-auto pb-1">
          {PERIODOS.map(p => (
            <button
              key={p.value}
              onClick={() => setPeriodo(p.value)}
              className={`flex-shrink-0 text-sm px-3 py-2 rounded-full font-medium transition-colors ${
                periodo === p.value
                  ? 'ac-bg ac-text-tx'
                  : 'bg-gray-100 text-gray-600'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => <div key={i} className="card h-20 animate-pulse bg-gray-100" />)}
          </div>
        ) : (
          <>
            {/* Card principal — total faturado */}
            <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-2xl p-5 text-white shadow-md">
              <p className="text-green-100 text-sm font-medium">Total faturado</p>
              <p className="text-4xl font-bold mt-1">{formatBRL(totalFaturado)}</p>
              <p className="text-green-100 text-sm mt-2">
                {concluidas.length} OS concluída{concluidas.length !== 1 ? 's' : ''}
              </p>
            </div>

            {/* Métricas secundárias */}
            <div className="grid grid-cols-3 gap-3">
              <MetricCard
                label="Ticket médio"
                value={formatBRL(ticketMedio)}
                bg="ac-bg-lt"
                text="ac-text"
              />
              <MetricCard
                label="Em aberto"
                value={totalOrcamentos}
                bg="bg-yellow-50"
                text="text-yellow-600"
              />
              <MetricCard
                label="Em andamento"
                value={totalEmAndamento}
                bg="bg-purple-50"
                text="text-purple-600"
              />
            </div>

            {/* Lista de OS concluídas */}
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide pt-1">
              OS concluídas no período
            </h2>

            {concluidas.length === 0 ? (
              <div className="card text-center text-gray-400 py-8">
                <p className="text-3xl mb-2">📊</p>
                <p>Nenhuma OS concluída neste período.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {concluidas.map(os => (
                  <button
                    key={os.id}
                    onClick={() => navigate(`/ordens/${os.id}`)}
                    className="card w-full text-left active:bg-gray-50 transition-colors"
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <span className="text-xs text-gray-400 font-mono">{formatOS(os.numero)}</span>
                        <p className="font-semibold text-gray-800">{os.clientes?.nome}</p>
                        <p className="text-sm text-gray-500">{os.tipo_servico}</p>
                      </div>
                      <div className="text-right flex-shrink-0 ml-2">
                        <p className="font-bold text-green-600">{formatBRL(os.valor)}</p>
                        <p className="text-xs text-gray-400 mt-1">{formatDate(os.created_at)}</p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}

            {/* Todas as OS do período */}
            {ordens.length > concluidas.length && (
              <>
                <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide pt-1">
                  Outras OS no período
                </h2>
                <div className="space-y-3">
                  {ordens
                    .filter(os => os.status !== 'concluido')
                    .map(os => (
                      <button
                        key={os.id}
                        onClick={() => navigate(`/ordens/${os.id}`)}
                        className="card w-full text-left active:bg-gray-50 transition-colors"
                      >
                        <div className="flex justify-between items-start">
                          <div>
                            <span className="text-xs text-gray-400 font-mono">{formatOS(os.numero)}</span>
                            <p className="font-semibold text-gray-800">{os.clientes?.nome}</p>
                            <p className="text-sm text-gray-500">{os.tipo_servico}</p>
                          </div>
                          <div className="text-right flex-shrink-0 ml-2">
                            <StatusBadge status={os.status} />
                            <p className="text-sm font-bold text-gray-600 mt-1">{formatBRL(os.valor)}</p>
                          </div>
                        </div>
                      </button>
                    ))}
                </div>
              </>
            )}

            {/* Ranking de clientes — apenas plano Anual */}
            {hasRelatorioAvancado ? (
              topClientes.length > 0 && (
                <>
                  <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide pt-1">
                    Top clientes no período
                  </h2>
                  <div className="space-y-2 pb-4">
                    {topClientes.map(({ nome, total }, i) => (
                      <div key={nome} className="card flex items-center gap-3">
                        <span className="w-7 h-7 rounded-full ac-bg-lt flex items-center justify-center flex-shrink-0">
                          <span className="text-xs font-bold ac-text">{i + 1}</span>
                        </span>
                        <p className="flex-1 font-medium text-gray-800 truncate">{nome}</p>
                        <p className="font-bold text-green-600 flex-shrink-0">{formatBRL(total)}</p>
                      </div>
                    ))}
                  </div>
                </>
              )
            ) : (
              <div className="card text-center py-5 border-dashed border-gray-200 mb-4">
                <p className="text-sm font-semibold text-gray-600 mb-1">Top clientes</p>
                <p className="text-xs text-gray-400">
                  Ranking de clientes disponível no plano <strong>Anual</strong>.
                </p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

function MetricCard({ label, value, bg, text }) {
  return (
    <div className={`${bg} rounded-2xl p-3 text-center`}>
      <p className={`text-base font-bold ${text} leading-tight`}>{value}</p>
      <p className={`text-xs ${text} opacity-80 mt-0.5`}>{label}</p>
    </div>
  )
}
