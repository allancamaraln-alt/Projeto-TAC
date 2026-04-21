import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import { formatBRL } from '../lib/format'
import StatusBadge from '../components/StatusBadge'

export default function Dashboard() {
  const { profile } = useAuth()
  const navigate = useNavigate()
  const [stats, setStats] = useState({ orcamento: 0, aprovado: 0, em_andamento: 0, concluido: 0 })
  const [recentes, setRecentes] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const hoje = new Date().toISOString().split('T')[0]
      const inicioSemana = new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0]

      const [{ data: todas }, { data: ultimas }] = await Promise.all([
        supabase.from('ordens_servico').select('status').gte('created_at', `${inicioSemana}T00:00:00`),
        supabase.from('ordens_servico')
          .select('*, clientes(nome)')
          .order('created_at', { ascending: false })
          .limit(5)
      ])

      const contagem = { orcamento: 0, aprovado: 0, em_andamento: 0, concluido: 0 }
      todas?.forEach(os => { if (contagem[os.status] !== undefined) contagem[os.status]++ })

      setStats(contagem)
      setRecentes(ultimas ?? [])
      setLoading(false)
    }
    load()
  }, [])

  const saudacao = () => {
    const h = new Date().getHours()
    if (h < 12) return 'Bom dia'
    if (h < 18) return 'Boa tarde'
    return 'Boa noite'
  }

  return (
    <div className="page-container">
      {/* Header */}
      <div className="bg-blue-600 text-white px-4 pt-12 pb-6">
        <p className="text-blue-200 text-sm">{saudacao()},</p>
        <h1 className="text-xl font-bold">{profile?.nome || 'Técnico'} 👋</h1>
        {profile?.empresa && <p className="text-blue-200 text-sm mt-0.5">{profile.empresa}</p>}
      </div>

      <div className="px-4 -mt-4">
        {/* Nova OS button */}
        <button
          onClick={() => navigate('/ordens/nova')}
          className="w-full bg-white rounded-2xl shadow-md border border-blue-100 p-4 flex items-center gap-3 mb-4 active:bg-blue-50 transition-colors"
        >
          <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center flex-shrink-0">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
          </div>
          <div className="text-left">
            <p className="font-bold text-gray-800">Nova Ordem de Serviço</p>
            <p className="text-gray-500 text-sm">Criar orçamento ou OS</p>
          </div>
        </button>

        {/* Relatório */}
        <button
          onClick={() => navigate('/relatorio')}
          className="w-full bg-white rounded-2xl shadow-md border border-green-100 p-4 flex items-center gap-3 mb-4 active:bg-green-50 transition-colors"
        >
          <div className="w-12 h-12 bg-green-500 rounded-xl flex items-center justify-center flex-shrink-0">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </div>
          <div className="text-left">
            <p className="font-bold text-gray-800">Relatório de Faturamento</p>
            <p className="text-gray-500 text-sm">Ver receitas por período</p>
          </div>
        </button>

        {/* Stats — esta semana */}
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-2">Esta semana</h2>
        {loading ? (
          <div className="grid grid-cols-2 gap-3 mb-4">
            {[1,2,3,4].map(i => <div key={i} className="card h-20 animate-pulse bg-gray-100" />)}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 mb-4">
            <StatCard label="Orçamentos" value={stats.orcamento} color="yellow" onClick={() => navigate('/ordens?status=orcamento')} />
            <StatCard label="Aprovados" value={stats.aprovado} color="blue" onClick={() => navigate('/ordens?status=aprovado')} />
            <StatCard label="Em andamento" value={stats.em_andamento} color="purple" onClick={() => navigate('/ordens?status=em_andamento')} />
            <StatCard label="Concluídos" value={stats.concluido} color="green" onClick={() => navigate('/ordens?status=concluido')} />
          </div>
        )}

        {/* Recentes */}
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-2">Recentes</h2>
        {recentes.length === 0 && !loading && (
          <div className="card text-center text-gray-400 py-8">
            <p className="text-3xl mb-2">📋</p>
            <p>Nenhuma OS ainda.</p>
            <p className="text-sm">Crie sua primeira ordem de serviço!</p>
          </div>
        )}
        <div className="space-y-3">
          {recentes.map(os => (
            <button
              key={os.id}
              onClick={() => navigate(`/ordens/${os.id}`)}
              className="card w-full text-left active:bg-gray-50 transition-colors"
            >
              <div className="flex justify-between items-start">
                <div>
                  <p className="font-semibold text-gray-800">{os.clientes?.nome}</p>
                  <p className="text-sm text-gray-500">{os.tipo_servico}</p>
                </div>
                <div className="text-right">
                  <StatusBadge status={os.status} />
                  <p className="text-sm font-semibold text-gray-700 mt-1">
                    {formatBRL(os.valor)}
                  </p>
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

function StatCard({ label, value, color, onClick }) {
  const colors = {
    yellow: 'bg-yellow-50 text-yellow-600',
    blue: 'bg-blue-50 text-blue-600',
    purple: 'bg-purple-50 text-purple-600',
    green: 'bg-green-50 text-green-600',
  }
  return (
    <button onClick={onClick} className={`rounded-2xl p-4 text-left ${colors[color]} active:opacity-80 transition-opacity`}>
      <p className="text-3xl font-bold">{value}</p>
      <p className="text-sm font-medium mt-0.5">{label}</p>
    </button>
  )
}
