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
      {/* Header com gradiente */}
      <div className="relative overflow-hidden px-4 pt-12 pb-8" style={{background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)'}}>
        <div className="absolute -top-8 -right-8 w-40 h-40 rounded-full bg-white opacity-5" />
        <div className="absolute bottom-0 left-0 w-24 h-24 rounded-full bg-white opacity-5" />
        <div className="relative">
          <p className="text-sky-200 text-sm font-medium">{saudacao()},</p>
          <h1 className="text-white text-2xl font-extrabold mt-0.5">{profile?.nome || 'Técnico'} 👋</h1>
          {profile?.empresa && <p className="text-sky-200 text-sm mt-1">{profile.empresa}</p>}
        </div>
      </div>

      <div className="px-4 -mt-5">
        {/* Botões de ação principais */}
        <div className="grid grid-cols-2 gap-3 mb-5">
          <button
            onClick={() => navigate('/ordens/nova')}
            className="bg-white rounded-2xl shadow-md p-4 flex flex-col items-start gap-2 active:bg-sky-50 transition-colors border border-gray-100"
          >
            <div className="w-10 h-10 bg-sky-500 rounded-xl flex items-center justify-center shadow-md shadow-sky-200">
              <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
            </div>
            <div>
              <p className="font-bold text-gray-800 text-sm">Nova OS</p>
              <p className="text-gray-400 text-xs">Criar orçamento</p>
            </div>
          </button>

          <button
            onClick={() => navigate('/relatorio')}
            className="bg-white rounded-2xl shadow-md p-4 flex flex-col items-start gap-2 active:bg-green-50 transition-colors border border-gray-100"
          >
            <div className="w-10 h-10 bg-emerald-500 rounded-xl flex items-center justify-center shadow-md shadow-emerald-200">
              <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <div>
              <p className="font-bold text-gray-800 text-sm">Relatório</p>
              <p className="text-gray-400 text-xs">Ver faturamento</p>
            </div>
          </button>
        </div>

        {/* Stats — esta semana */}
        <h2 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Esta semana</h2>
        {loading ? (
          <div className="grid grid-cols-2 gap-3 mb-5">
            {[1,2,3,4].map(i => <div key={i} className="h-24 animate-pulse bg-gray-100 rounded-2xl" />)}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 mb-5">
            <StatCard label="Orçamentos" value={stats.orcamento} color="amber" onClick={() => navigate('/ordens?status=orcamento')} />
            <StatCard label="Aprovados" value={stats.aprovado} color="sky" onClick={() => navigate('/ordens?status=aprovado')} />
            <StatCard label="Em andamento" value={stats.em_andamento} color="violet" onClick={() => navigate('/ordens?status=em_andamento')} />
            <StatCard label="Concluídos" value={stats.concluido} color="emerald" onClick={() => navigate('/ordens?status=concluido')} />
          </div>
        )}

        {/* Recentes */}
        <h2 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Recentes</h2>
        {recentes.length === 0 && !loading && (
          <div className="card text-center py-10">
            <p className="text-4xl mb-3">📋</p>
            <p className="font-semibold text-gray-500">Nenhuma OS ainda.</p>
            <p className="text-sm text-gray-400 mt-1">Crie sua primeira ordem de serviço!</p>
          </div>
        )}
        <div className="space-y-3">
          {recentes.map(os => (
            <button
              key={os.id}
              onClick={() => navigate(`/ordens/${os.id}`)}
              className="card w-full text-left active:bg-slate-50 transition-colors"
            >
              <div className="flex justify-between items-start">
                <div>
                  <p className="font-bold text-gray-800">{os.clientes?.nome}</p>
                  <p className="text-sm text-gray-400 mt-0.5">{os.tipo_servico}</p>
                </div>
                <div className="text-right">
                  <StatusBadge status={os.status} />
                  <p className="text-sm font-bold text-gray-700 mt-1.5">
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

const colorMap = {
  amber:   { bg: 'bg-amber-50',   text: 'text-amber-500',  border: 'border-amber-100' },
  sky:     { bg: 'bg-sky-50',     text: 'text-sky-500',    border: 'border-sky-100' },
  violet:  { bg: 'bg-violet-50',  text: 'text-violet-500', border: 'border-violet-100' },
  emerald: { bg: 'bg-emerald-50', text: 'text-emerald-500',border: 'border-emerald-100' },
}

function StatCard({ label, value, color, onClick }) {
  const c = colorMap[color]
  return (
    <button onClick={onClick} className={`${c.bg} border ${c.border} rounded-2xl p-4 text-left active:opacity-80 transition-opacity w-full`}>
      <p className={`text-4xl font-extrabold ${c.text}`}>{value}</p>
      <p className={`text-sm font-semibold mt-1 ${c.text} opacity-80`}>{label}</p>
    </button>
  )
}
