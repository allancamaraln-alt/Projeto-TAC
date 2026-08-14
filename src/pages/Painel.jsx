import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import { formatBRL, resumoPagamento } from '../lib/format'
import StatusBadge from '../components/StatusBadge'
import CobrancaPendenteCard from '../components/CobrancaPendenteCard'

function diasParaData(dataIso) {
  const hoje = new Date()
  hoje.setHours(0, 0, 0, 0)
  const [y, m, d] = dataIso.split('-').map(Number)
  return Math.round((new Date(y, m - 1, d) - hoje) / 86400000)
}

// Antigo Dashboard (estatísticas da semana, revisões preventivas, OS
// recentes) — a Home ("/") agora é o chat em ChatHome.jsx; este painel
// fica acessível a partir do ícone no topo da Home.
export default function Painel() {
  const { profile } = useAuth()
  const navigate = useNavigate()
  const [stats, setStats] = useState({ orcamento: 0, aprovado: 0, em_andamento: 0, concluido: 0 })
  const [recentes, setRecentes] = useState([])
  const [lembretes, setLembretes] = useState([])
  const [cobrancasHoje, setCobrancasHoje] = useState([])
  const [mostrarCobrancas, setMostrarCobrancas] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const inicioSemana = new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0]
      const em30dias = new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0]
      const hoje = new Date().toISOString().split('T')[0]

      const [{ data: todas }, { data: ultimas }, { data: avisos }, { data: cobrancas }] = await Promise.all([
        supabase.from('ordens_servico').select('status').gte('created_at', `${inicioSemana}T00:00:00`),
        supabase.from('ordens_servico')
          .select('*, clientes(nome)')
          .order('created_at', { ascending: false })
          .limit(5),
        supabase.from('lembretes_manutencao')
          .select('*, clientes(nome, telefone)')
          .eq('status', 'pendente')
          .lte('data_prevista', em30dias)
          .order('data_prevista', { ascending: true })
          .limit(3),
        supabase.from('ordens_servico')
          .select('*, clientes(nome, telefone)')
          .eq('status', 'concluido')
          .eq('data_pagamento_pendente', hoje),
      ])

      const contagem = { orcamento: 0, aprovado: 0, em_andamento: 0, concluido: 0 }
      todas?.forEach(os => { if (contagem[os.status] !== undefined) contagem[os.status]++ })

      setStats(contagem)
      setRecentes(ultimas ?? [])
      setLembretes(avisos ?? [])
      setCobrancasHoje(cobrancas ?? [])
      setLoading(false)
    }
    load()
  }, [])

  const totalCobrancasHoje = cobrancasHoje.reduce((soma, os) => soma + resumoPagamento(os).saldo, 0)

  // Trava o scroll de fundo enquanto a lista de cobranças do dia está aberta
  useEffect(() => {
    if (mostrarCobrancas) document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [mostrarCobrancas])

  function removerCobrancaResolvida(osId) {
    setCobrancasHoje(prev => prev.filter(os => os.id !== osId))
  }

  const saudacao = () => {
    const h = new Date().getHours()
    if (h < 12) return 'Bom dia'
    if (h < 18) return 'Boa tarde'
    return 'Boa noite'
  }

  return (
    <div className="page-container">
      {/* Header com gradiente */}
      <div className="relative overflow-hidden px-4 pt-12 pb-8" style={{background: 'linear-gradient(135deg, rgb(var(--ac)) 0%, rgb(var(--ac-dk)) 100%)'}}>
        <div className="absolute -top-8 -right-8 w-40 h-40 rounded-full bg-white opacity-5" />
        <div className="absolute bottom-0 left-0 w-24 h-24 rounded-full bg-white opacity-5" />
        <div className="relative flex items-center gap-3">
          {profile?.avatar_url ? (
            <img
              src={profile.avatar_url}
              alt="Avatar"
              className="w-12 h-12 rounded-full object-cover border-2 border-white/40 flex-shrink-0"
            />
          ) : (
            <div className="w-12 h-12 rounded-full bg-white/20 border-2 border-white/30 flex items-center justify-center flex-shrink-0">
              <span className="text-lg font-extrabold text-white">
                {(profile?.nome || 'T').charAt(0).toUpperCase()}
              </span>
            </div>
          )}
          <div>
            <p className="ac-text-sf text-sm font-medium">{saudacao()},</p>
            <h1 className="text-white text-2xl font-extrabold mt-0.5">{profile?.nome || 'Técnico'} 👋</h1>
            {profile?.empresa && <p className="ac-text-sf text-sm mt-1">{profile.empresa}</p>}
          </div>
        </div>
      </div>

      <div className="px-4 -mt-5 animate-fade-up">
        {/* A receber hoje */}
        {cobrancasHoje.length > 0 && (
          <button
            onClick={() => setMostrarCobrancas(true)}
            className="w-full bg-amber-50 border border-amber-200 rounded-2xl p-4 mb-5 flex items-center gap-3 active:scale-[0.98] transition-all shadow-sm"
          >
            <div className="w-11 h-11 bg-amber-400 rounded-xl flex items-center justify-center flex-shrink-0 shadow-md shadow-amber-200">
              <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V6m0 10v2m9-8a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="flex-1 text-left min-w-0">
              <p className="text-xs font-bold text-amber-600 uppercase tracking-wide">A receber hoje</p>
              <p className="text-xl font-extrabold text-amber-700">{formatBRL(totalCobrancasHoje)}</p>
            </div>
            <div className="text-right flex-shrink-0">
              <p className="text-xs text-amber-600 font-semibold">{cobrancasHoje.length} pendente{cobrancasHoje.length !== 1 ? 's' : ''}</p>
              <svg className="w-4 h-4 text-amber-400 ml-auto mt-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </button>
        )}

        {/* Botões de ação principais */}
        <div className="grid grid-cols-2 gap-3 mb-5">
          <button
            onClick={() => navigate('/ordens/nova')}
            className="bg-white rounded-2xl shadow-md p-4 flex flex-col items-start gap-2 ac-active transition-colors border border-gray-100"
          >
            <div className="w-10 h-10 ac-bg rounded-xl flex items-center justify-center ac-shadow">
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
            <StatCard label="Aprovados" value={stats.aprovado} color="ac" onClick={() => navigate('/ordens?status=aprovado')} />
            <StatCard label="Em andamento" value={stats.em_andamento} color="violet" onClick={() => navigate('/ordens?status=em_andamento')} />
            <StatCard label="Concluídos" value={stats.concluido} color="emerald" onClick={() => navigate('/ordens?status=concluido')} />
          </div>
        )}

        {/* Lembretes preventivos */}
        {lembretes.length > 0 && (
          <div className="mb-5">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-xs font-bold text-orange-400 uppercase tracking-widest">Revisões preventivas</h2>
              <button onClick={() => navigate('/lembretes')} className="text-xs text-orange-400 font-semibold">
                Ver todos →
              </button>
            </div>
            <div className="space-y-2">
              {lembretes.map(l => {
                const dias = diasParaData(l.data_prevista)
                const atrasado = dias < 0
                return (
                  <button
                    key={l.id}
                    onClick={() => navigate('/lembretes')}
                    className={`w-full text-left rounded-2xl px-4 py-3 border flex items-center gap-3 active:scale-95 transition-all ${
                      atrasado ? 'bg-red-50 border-red-100' : 'bg-orange-50 border-orange-100'
                    }`}
                  >
                    <svg className={`w-5 h-5 flex-shrink-0 ${atrasado ? 'text-red-400' : 'text-orange-400'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                    </svg>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-gray-800 text-sm truncate">{l.clientes?.nome}</p>
                      <p className="text-xs text-gray-400">{l.tipo_servico}</p>
                    </div>
                    <p className={`text-xs font-bold flex-shrink-0 ${atrasado ? 'text-red-500' : 'text-orange-500'}`}>
                      {atrasado ? `${Math.abs(dias)}d atraso` : dias === 0 ? 'Hoje' : `em ${dias}d`}
                    </p>
                  </button>
                )
              })}
            </div>
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

      {/* Bottom sheet: cobranças do dia */}
      {mostrarCobrancas && (
        <div
          className="fixed inset-0 z-[110] bg-black/50 flex items-end"
          onClick={e => { if (e.target === e.currentTarget) setMostrarCobrancas(false) }}
        >
          <div className="bg-white w-full rounded-t-3xl px-5 pt-6 pb-8 space-y-3 max-h-[85vh] overflow-y-auto">
            <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto -mt-1 mb-1" />

            <div className="flex items-center justify-between mb-2">
              <div>
                <h2 className="text-lg font-bold text-gray-800">A receber hoje</h2>
                <p className="text-sm text-gray-400">{formatBRL(totalCobrancasHoje)} em {cobrancasHoje.length} OS</p>
              </div>
              <button
                onClick={() => setMostrarCobrancas(false)}
                className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 active:bg-gray-200"
              >
                <svg className="w-4 h-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {cobrancasHoje.length === 0 ? (
              <p className="text-center text-gray-400 py-8">Tudo certo por aqui! 🎉</p>
            ) : (
              <div className="space-y-3">
                {cobrancasHoje.map(os => (
                  <CobrancaPendenteCard key={os.id} os={os} onAtualizado={removerCobrancaResolvida} />
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

const colorMap = {
  amber:   { bg: 'bg-amber-50',   text: 'text-amber-500',  border: 'border-amber-100' },
  violet:  { bg: 'bg-violet-50',  text: 'text-violet-500', border: 'border-violet-100' },
  emerald: { bg: 'bg-emerald-50', text: 'text-emerald-500',border: 'border-emerald-100' },
}

function StatCard({ label, value, color, onClick }) {
  if (color === 'ac') {
    return (
      <button onClick={onClick} className="ac-bg-lt ac-border-lt border rounded-2xl p-4 text-left active:scale-95 transition-all duration-150 w-full">
        <p className="text-4xl font-extrabold tabular-nums ac-text">{value}</p>
        <p className="text-sm font-semibold mt-1 ac-text opacity-80">{label}</p>
      </button>
    )
  }
  const c = colorMap[color]
  return (
    <button onClick={onClick} className={`${c.bg} border ${c.border} rounded-2xl p-4 text-left active:scale-95 transition-all duration-150 w-full`}>
      <p className={`text-4xl font-extrabold tabular-nums ${c.text}`}>{value}</p>
      <p className={`text-sm font-semibold mt-1 ${c.text} opacity-80`}>{label}</p>
    </button>
  )
}
