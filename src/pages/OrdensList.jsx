import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { formatOS, formatBRL, formatDate } from '../lib/format'
import StatusBadge from '../components/StatusBadge'
import { useAuth } from '../hooks/useAuth'

const FILTROS = [
  { value: '', label: 'Todas' },
  { value: 'orcamento', label: 'Orçamento' },
  { value: 'aprovado', label: 'Aprovado' },
  { value: 'em_andamento', label: 'Andamento' },
  { value: 'concluido', label: 'Concluído' },
]

export default function OrdensList() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const { profile } = useAuth()
  const [ordens, setOrdens] = useState([])
  const [busca, setBusca] = useState('')
  const [loading, setLoading] = useState(true)

  const filtroStatus = searchParams.get('status') || ''

  useEffect(() => {
    async function load() {
      setLoading(true)
      let query = supabase
        .from('ordens_servico')
        .select('*, clientes(nome, telefone)')
        .order('created_at', { ascending: false })

      if (filtroStatus) query = query.eq('status', filtroStatus)

      const { data } = await query
      setOrdens(data ?? [])
      setLoading(false)
    }
    load()
  }, [filtroStatus])

  const buscaLower = busca.toLowerCase()
  const filtradas = ordens.filter(os =>
    os.clientes?.nome?.toLowerCase().includes(buscaLower) ||
    String(os.numero).includes(busca) ||
    formatOS(os.numero).toLowerCase().includes(buscaLower) ||
    os.tipo_servico.toLowerCase().includes(buscaLower)
  )

  return (
    <div className="page-container">
      {/* Header */}
      <div className="relative px-4 pt-12 pb-3 border-b border-gray-100 sticky top-0 z-10 overflow-hidden">
        {profile?.cover_url && (
          <>
            <div
              className="absolute inset-0 bg-cover bg-center scale-110"
              style={{ backgroundImage: `url(${profile.cover_url})`, filter: 'blur(14px)' }}
            />
            <div className="absolute inset-0 bg-white/80" />
          </>
        )}
        {!profile?.cover_url && <div className="absolute inset-0 bg-white" />}
        <div className="relative">
        <div className="flex items-center justify-between mb-3">
          <h1 className="text-xl font-bold text-gray-800">Ordens de Serviço</h1>
          <button
            onClick={() => navigate('/ordens/nova')}
            className="w-10 h-10 ac-bg rounded-full flex items-center justify-center ac-shadow"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
          </button>
        </div>

        {/* Busca */}
        <input
          type="search"
          className="input-field mb-3"
          placeholder="Buscar por cliente, OS ou serviço..."
          value={busca}
          onChange={e => setBusca(e.target.value)}
        />

        {/* Filtro de status */}
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
          {FILTROS.map(f => (
            <button
              key={f.value}
              onClick={() => setSearchParams(f.value ? { status: f.value } : {})}
              className={`flex-shrink-0 text-sm px-3 py-1.5 rounded-full font-medium transition-colors ${
                filtroStatus === f.value
                  ? 'ac-bg ac-text-tx'
                  : 'bg-gray-100 text-gray-600'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
        </div>
      </div>

      <div className="px-4 pt-3">
        {loading && (
          <div className="space-y-3">
            {[1,2,3].map(i => <div key={i} className="card h-24 animate-pulse bg-gray-100" />)}
          </div>
        )}

        {!loading && filtradas.length === 0 && (
          <div className="text-center text-gray-400 py-12">
            <p className="text-4xl mb-3">📋</p>
            <p className="font-medium">{busca || filtroStatus ? 'Nenhuma OS encontrada.' : 'Nenhuma OS cadastrada.'}</p>
            {!busca && !filtroStatus && (
              <button onClick={() => navigate('/ordens/nova')} className="mt-4 ac-text font-medium">
                + Criar primeira OS
              </button>
            )}
          </div>
        )}

        <div className="space-y-3">
          {filtradas.map(os => (
            <button
              key={os.id}
              onClick={() => navigate(`/ordens/${os.id}`)}
              className="card w-full text-left active:bg-gray-50 transition-colors"
            >
              <div className="flex justify-between items-start mb-2">
                <div>
                  <span className="text-xs text-gray-400 font-mono">{formatOS(os.numero)}</span>
                  <p className="font-semibold text-gray-800">{os.clientes?.nome}</p>
                  <p className="text-sm text-gray-500">{os.tipo_servico}</p>
                </div>
                <div className="text-right flex-shrink-0 ml-2">
                  <StatusBadge status={os.status} />
                  <p className="text-sm font-bold text-gray-700 mt-1">
                    {formatBRL(os.valor)}
                  </p>
                </div>
              </div>
              {os.data_agendamento && (
                <p className="text-xs text-gray-400">
                  📅 {formatDate(os.data_agendamento)}
                </p>
              )}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
