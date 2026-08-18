import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import { formatBRL, resumoPagamento } from '../lib/format'
import StatusBadge from '../components/StatusBadge'
import CobrancaPendenteCard from '../components/CobrancaPendenteCard'
import { Card, CardTitle, IconTile } from '../components/ui/kit'

function diasParaData(dataIso) {
  const hoje = new Date()
  hoje.setHours(0, 0, 0, 0)
  const [y, m, d] = dataIso.split('-').map(Number)
  return Math.round((new Date(y, m - 1, d) - hoje) / 86400000)
}

const ATALHOS = [
  { id: 'nova-os', label: 'Nova OS', to: '/ordens/nova', tint: 'ac-bg text-white ac-shadow', icon: <IconPlus className="w-6 h-6" /> },
  { id: 'clientes', label: 'Clientes', to: '/clientes', tint: 'ac-bg-lt ac-text', icon: <IconUsersMini className="w-6 h-6" /> },
  { id: 'relatorio', label: 'Financeiro', to: '/relatorio', tint: 'bg-emerald-50 text-emerald-600', icon: <IconReport className="w-6 h-6" /> },
  { id: 'lembretes', label: 'Revisões', to: '/lembretes', tint: 'bg-orange-50 text-orange-600', icon: <IconBell className="w-6 h-6" /> },
]

// Antigo Dashboard (estatísticas da semana, revisões preventivas, OS
// recentes) — a Home ("/") agora é o chat em ChatHome.jsx; este painel
// fica acessível a partir do ícone no topo da Home.
export default function Painel() {
  const { profile, hasFaturamento } = useAuth()
  const navigate = useNavigate()
  const [stats, setStats] = useState({ orcamento: 0, aprovado: 0, em_andamento: 0, concluido: 0 })
  const [osHoje, setOsHoje] = useState(0)
  const [revisoesHoje, setRevisoesHoje] = useState(0)
  const [recentes, setRecentes] = useState([])
  const [lembretes, setLembretes] = useState([])
  const [cobrancasHoje, setCobrancasHoje] = useState([])
  const [concluidasRecentes, setConcluidasRecentes] = useState([])
  const [cobrancasGlobais, setCobrancasGlobais] = useState([])
  const [mostrarCobrancas, setMostrarCobrancas] = useState(false)
  const [loading, setLoading] = useState(true)
  const [valoresOcultos, setValoresOcultos] = useState(() => localStorage.getItem('climapro:valores-ocultos') === '1')
  const [periodoFin, setPeriodoFin] = useState('mes')

  function alternarValoresOcultos() {
    setValoresOcultos(v => {
      const next = !v
      localStorage.setItem('climapro:valores-ocultos', next ? '1' : '0')
      return next
    })
  }

  const exibirValor = (valor) => (valoresOcultos ? 'R$ ••••••' : formatBRL(valor))

  useEffect(() => {
    async function load() {
      const inicioSemana = new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0]
      const em30dias = new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0]
      const hoje = new Date().toISOString().split('T')[0]
      // 35 dias cobre com folga tanto "últimos 7 dias" quanto o mês corrente
      // inteiro, mesmo se hoje for dia 1º.
      const inicio35dias = new Date(Date.now() - 35 * 86400000).toISOString()

      const [{ data: todas }, { data: ultimas }, { data: avisos }, { data: cobrancas }, { count: totalHoje }, { count: revisoesHojeCount }, { data: concluidas35 }, { data: pagamentos }] = await Promise.all([
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
        supabase.from('ordens_servico')
          .select('id', { count: 'exact', head: true })
          .gte('created_at', `${hoje}T00:00:00`),
        // Revisões PREVISTAS para hoje (data_prevista = hoje), não o total de
        // pendentes nos próximos 30 dias — esse é um número separado, usado
        // só na lista "Próximas revisões" mais abaixo.
        supabase.from('lembretes_manutencao')
          .select('id', { count: 'exact', head: true })
          .eq('status', 'pendente')
          .eq('data_prevista', hoje),
        // Faturamento (dia/semana/mês) — mesma ideia do hero verde do
        // Relatório: soma valor das OS concluídas, sem olhar se já foi
        // pago. Busca os últimos 35 dias uma vez só e reparte por período
        // no cliente, pra trocar dia/semana/mês sem nova consulta.
        supabase.from('ordens_servico')
          .select('valor, created_at')
          .eq('status', 'concluido')
          .gte('created_at', inicio35dias),
        // "Cobranças em aberto": estado atual, de TODAS as OS concluídas
        // (qualquer mês) — mesmo escopo da seção "Cobranças" do Relatório
        // e do filtro /ordens?pagamento=. Uma dívida de março não some em abril.
        supabase.from('ordens_servico')
          .select('valor, pagamentos, forma_pagamento, data_pagamento_pendente')
          .eq('status', 'concluido'),
      ])

      const contagem = { orcamento: 0, aprovado: 0, em_andamento: 0, concluido: 0 }
      todas?.forEach(os => { if (contagem[os.status] !== undefined) contagem[os.status]++ })

      setStats(contagem)
      setOsHoje(totalHoje ?? 0)
      setRevisoesHoje(revisoesHojeCount ?? 0)
      setRecentes(ultimas ?? [])
      setLembretes(avisos ?? [])
      setCobrancasHoje(cobrancas ?? [])
      setConcluidasRecentes(concluidas35 ?? [])
      setCobrancasGlobais(pagamentos ?? [])
      setLoading(false)
    }
    load()
  }, [])

  const totalCobrancasHoje = cobrancasHoje.reduce((soma, os) => soma + resumoPagamento(os).saldo, 0)
  const hojeISO = new Date().toISOString().split('T')[0]

  // Faturamento por período — reparte os últimos 35 dias já buscados,
  // sem precisar de uma consulta nova a cada troca de dia/semana/mês.
  const seteDiasAtras = new Date()
  seteDiasAtras.setDate(seteDiasAtras.getDate() - 7)
  const inicioSemanaISO = seteDiasAtras.toISOString().split('T')[0]
  const inicioMesISO = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0]
  const inicioPorPeriodo = { dia: hojeISO, semana: inicioSemanaISO, mes: inicioMesISO }
  const concluidasPeriodo = concluidasRecentes.filter(os => os.created_at >= `${inicioPorPeriodo[periodoFin]}T00:00:00`)
  const faturamentoPeriodo = {
    total: concluidasPeriodo.reduce((s, os) => s + (Number(os.valor) || 0), 0),
    qtde: concluidasPeriodo.length,
  }

  // Cobranças em aberto — estado atual (qualquer mês), de todas as OS
  // concluídas com saldo pendente. "A receber" e "Em atraso" aqui são
  // mutuamente exclusivos (a receber = ainda dentro do prazo), então dá
  // pra somar os dois e bater com o total pendente do Relatório.
  const pendentesGlobais = cobrancasGlobais
    .map(os => ({ os, pag: resumoPagamento(os) }))
    .filter(r => r.pag.saldo > 0.004)
  const totalPendente = pendentesGlobais.reduce((s, r) => s + r.pag.saldo, 0)
  const totalVencido = pendentesGlobais
    .filter(r => r.os.data_pagamento_pendente && r.os.data_pagamento_pendente < hojeISO)
    .reduce((s, r) => s + r.pag.saldo, 0)
  const aReceber = totalPendente - totalVencido

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
      <div className="relative overflow-hidden px-4 pt-12 pb-11 rounded-b-[32px]" style={{background: 'linear-gradient(150deg, rgb(var(--ac)) 0%, rgb(var(--ac-dk)) 60%, rgb(var(--ac-dk)) 100%)'}}>
        <IconSnowflake className="pointer-events-none absolute -left-6 bottom-1 h-28 w-28 text-white/[0.07]" />
        <IconSnowflake className="pointer-events-none absolute -right-8 -top-8 h-36 w-36 text-white/[0.06]" />
        <div className="relative flex items-center gap-3.5">
          {profile?.avatar_url ? (
            <img
              src={profile.avatar_url}
              alt="Avatar"
              className="w-[72px] h-[72px] rounded-full object-cover border-2 border-white/40 flex-shrink-0"
            />
          ) : (
            <div className="w-[72px] h-[72px] rounded-full bg-white/20 border-2 border-white/30 flex items-center justify-center flex-shrink-0">
              <span className="text-2xl font-extrabold text-white">
                {(profile?.nome || 'T').charAt(0).toUpperCase()}
              </span>
            </div>
          )}
          <div className="min-w-0">
            <p className="ac-text-sf text-[15px] font-medium">{saudacao()},</p>
            <h1 className="text-white text-[28px] font-extrabold mt-0.5 leading-tight truncate">{profile?.nome || 'Técnico'} 👋</h1>
            {profile?.empresa && <p className="ac-text-sf text-[14px] mt-1 truncate">{profile.empresa}</p>}
          </div>
        </div>
      </div>

      <div className="px-4 -mt-6 animate-fade-up space-y-5">
        {/* Financeiro do mês */}
        {hasFaturamento && !loading && (
          <div className="relative w-full overflow-hidden rounded-[22px] border border-gray-100 bg-white p-3.5 shadow-md">
            <IconSparkline className="pointer-events-none absolute -right-4 -top-2 h-24 w-48 text-emerald-500/20" />

            <div className="relative flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <IconReport className="w-3.5 h-3.5 text-emerald-600" />
                <span className="text-[11px] font-bold uppercase tracking-widest text-emerald-600">Financeiro</span>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={alternarValoresOcultos}
                  aria-label={valoresOcultos ? 'Mostrar valores' : 'Ocultar valores'}
                  className="grid h-7 w-7 place-items-center rounded-full bg-gray-100 text-gray-500 transition active:scale-95"
                >
                  {valoresOcultos ? <IconEyeOff className="w-3.5 h-3.5" /> : <IconEye className="w-3.5 h-3.5" />}
                </button>
                <span className="grid h-7 w-7 place-items-center rounded-full bg-emerald-50 text-emerald-600">
                  <IconMoney className="w-4 h-4" />
                </span>
              </div>
            </div>

            {/* Faturamento — dia / semana / mês, "Mês" bate com o Relatório */}
            <div className="relative mt-2.5 flex items-center gap-1.5">
              {PERIODOS_FIN.map(p => (
                <button
                  key={p.value}
                  onClick={() => setPeriodoFin(p.value)}
                  className={`rounded-full px-2.5 py-1 text-[10.5px] font-semibold transition ${
                    periodoFin === p.value ? 'bg-emerald-600 text-white' : 'bg-gray-100 text-gray-500'
                  }`}
                >
                  {p.pill}
                </button>
              ))}
            </div>

            <button onClick={() => navigate('/relatorio')} className="relative mt-2 block w-full text-left">
              <p className="text-[11.5px] text-gray-400">{PERIODOS_FIN.find(p => p.value === periodoFin)?.titulo}</p>
              <p className="text-[24px] font-extrabold leading-tight tabular-nums text-gray-800">{exibirValor(faturamentoPeriodo.total)}</p>
              <p className="text-[11.5px] text-gray-400">
                {faturamentoPeriodo.qtde} OS concluída{faturamentoPeriodo.qtde !== 1 ? 's' : ''}
              </p>
            </button>

            {/* Cobranças em aberto — situação atual, de qualquer mês */}
            <div className="relative mt-3.5 border-t border-gray-100 pt-3">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400">
                Cobranças em aberto · situação atual
              </p>
              <div className="mt-2 grid grid-cols-2 gap-2">
                <FinMetric dotClassName="bg-amber-500" label="A receber" value={exibirValor(aReceber)} onClick={() => navigate('/ordens?pagamento=pendente')} />
                <FinMetric dotClassName="bg-red-500" label="Em atraso" value={exibirValor(totalVencido)} onClick={() => navigate('/ordens?pagamento=vencido')} />
              </div>
            </div>

            <div className="relative mt-3 flex justify-end">
              <button onClick={() => navigate('/relatorio')} className="flex items-center gap-0.5 text-[11px] font-semibold text-emerald-600">
                Ver relatório completo
                <IconChevronRight className="w-3 h-3" />
              </button>
            </div>
          </div>
        )}

        {/* Resumo do dia */}
        <Card className="p-4">
          <CardTitle>Resumo do dia</CardTitle>
          {loading ? (
            <div className="grid grid-cols-3 gap-2.5">
              {[1,2,3].map(i => <div key={i} className="h-[92px] animate-pulse bg-gray-100 rounded-2xl" />)}
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-2.5">
              <ResumoTile
                icon={<IconClipboardMini className="w-[18px] h-[18px]" />}
                value={String(osHoje)}
                label="OS hoje"
                color="var(--ac-fg)"
                onClick={() => navigate('/ordens')}
              />
              <ResumoTile
                icon={<IconMoney className="w-[18px] h-[18px]" />}
                value={formatBRL(totalCobrancasHoje)}
                label="A receber hoje"
                color={STAT_COLORS.emerald}
                onClick={() => setMostrarCobrancas(true)}
              />
              <ResumoTile
                icon={<IconBell className="w-[18px] h-[18px]" />}
                value={String(revisoesHoje)}
                label="Revisões hoje"
                color={STAT_COLORS.violet}
                onClick={() => navigate('/lembretes')}
              />
            </div>
          )}
        </Card>

        {/* Ações rápidas */}
        <Card className="p-4">
          <CardTitle>Ações rápidas</CardTitle>
          <div className="grid grid-cols-4 gap-2">
            {ATALHOS.map(({ id, label, to, tint, icon }) => (
              <button
                key={id}
                onClick={() => navigate(to)}
                className="flex flex-col items-center gap-2 rounded-2xl py-1 transition active:scale-[0.96]"
              >
                <span className={`grid h-[60px] w-[60px] place-items-center rounded-2xl ${tint}`}>
                  {icon}
                </span>
                <span className="text-[12.5px] font-medium text-gray-700 text-center leading-tight">{label}</span>
              </button>
            ))}
          </div>
        </Card>

        {/* Stats — esta semana */}
        <Card className="p-4">
          <CardTitle>Esta semana</CardTitle>
          {loading ? (
            <div className="grid grid-cols-4 gap-2">
              {[1,2,3,4].map(i => <div key={i} className="h-[76px] animate-pulse bg-gray-100 rounded-2xl" />)}
            </div>
          ) : (
            <div className="grid grid-cols-4 gap-2">
              <ResumoTile compact label="Orçamentos" value={String(stats.orcamento)} color={STAT_COLORS.amber} icon={<IconFolder className="w-3.5 h-3.5" />} onClick={() => navigate('/ordens?status=orcamento')} />
              <ResumoTile compact label="Aprovados" value={String(stats.aprovado)} color="var(--ac-fg)" icon={<IconCheck className="w-3.5 h-3.5" />} onClick={() => navigate('/ordens?status=aprovado')} />
              <ResumoTile compact label="Andamento" value={String(stats.em_andamento)} color={STAT_COLORS.violet} icon={<IconRefresh className="w-3.5 h-3.5" />} onClick={() => navigate('/ordens?status=em_andamento')} />
              <ResumoTile compact label="Concluídos" value={String(stats.concluido)} color={STAT_COLORS.emerald} icon={<IconCheck className="w-3.5 h-3.5" />} onClick={() => navigate('/ordens?status=concluido')} />
            </div>
          )}
        </Card>

        {/* Próximas revisões */}
        {lembretes.length > 0 && (
          <Card className="p-4">
            <CardTitle
              action={
                <button onClick={() => navigate('/lembretes')} className="text-xs ac-text font-semibold">
                  Ver todos →
                </button>
              }
            >
              Próximas revisões
            </CardTitle>
            <div className="space-y-2">
              {lembretes.map(l => {
                const dias = diasParaData(l.data_prevista)
                const atrasado = dias < 0
                return (
                  <button
                    key={l.id}
                    onClick={() => navigate('/lembretes')}
                    className={`w-full text-left rounded-[18px] px-3.5 py-3 border flex items-center gap-3 active:scale-[0.98] transition-all ${
                      atrasado ? 'bg-red-50 border-red-100' : 'bg-orange-50 border-orange-100'
                    }`}
                  >
                    <IconTile
                      size={38}
                      radius={13}
                      className={atrasado ? 'bg-red-100 text-red-500' : 'bg-orange-100 text-orange-500'}
                      icon={<IconBell className="w-[18px] h-[18px]" />}
                    />
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
          </Card>
        )}

        {/* Recentes */}
        <div>
          <h2 className="text-[13px] font-bold text-gray-400 uppercase tracking-widest mb-3 px-0.5">Recentes</h2>
          {recentes.length === 0 && !loading && (
            <Card className="text-center py-10">
              <p className="text-4xl mb-3">📋</p>
              <p className="font-semibold text-gray-500">Nenhuma OS ainda.</p>
              <p className="text-sm text-gray-400 mt-1">Crie sua primeira ordem de serviço!</p>
            </Card>
          )}
          {recentes.length > 0 && (
            <Card className="overflow-hidden">
              {recentes.map((os, i) => (
                <button
                  key={os.id}
                  onClick={() => navigate(`/ordens/${os.id}`)}
                  className={`w-full flex items-center gap-3 px-4 py-3.5 text-left active:bg-slate-50 transition-colors ${i > 0 ? 'border-t border-gray-100' : ''}`}
                >
                  <IconTile className="bg-gray-100 text-gray-500" icon={<span className="text-sm font-bold">{(os.clientes?.nome || '?').charAt(0).toUpperCase()}</span>} />
                  <div className="min-w-0 flex-1">
                    <p className="font-bold text-gray-800 truncate">{os.clientes?.nome}</p>
                    <p className="text-sm text-gray-400 mt-0.5 truncate">{os.tipo_servico}</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <StatusBadge status={os.status} />
                    <p className="text-sm font-bold text-gray-700 mt-1.5">
                      {formatBRL(os.valor)}
                    </p>
                  </div>
                </button>
              ))}
            </Card>
          )}
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

// Cores fixas (hex) para dar em color-mix() — funciona junto com a cor
// de destaque (--ac, via rgb(var(--ac))) sem precisar de tokens novos.
const STAT_COLORS = {
  amber:   '#d97706',
  violet:  '#7c3aed',
  emerald: '#059669',
}

const PERIODOS_FIN = [
  { value: 'dia',    pill: 'Dia',    titulo: 'Faturamento do dia' },
  { value: 'semana', pill: 'Semana', titulo: 'Faturamento da semana' },
  { value: 'mes',    pill: 'Mês',    titulo: 'Faturamento do mês' },
]

function FinMetric({ dotClassName, label, value, onClick }) {
  return (
    <button onClick={onClick} className="text-left transition active:scale-[0.97]">
      <div className="flex items-center gap-1.5">
        <span className={`h-1.5 w-1.5 rounded-full ${dotClassName}`} />
        <span className="text-[10.5px] text-gray-400">{label}</span>
      </div>
      <p className="mt-1 text-[13px] font-bold tabular-nums leading-tight text-gray-800">{value}</p>
    </button>
  )
}

// Tile do bloco "Resumo do dia" — ícone em selo no topo, valor, rótulo e
// barra colorida embaixo (mesmo desenho do pacote de referência).
function ResumoTile({ icon, value, label, color, onClick, compact = false }) {
  return (
    <button
      onClick={onClick}
      className={`relative overflow-hidden rounded-2xl bg-gray-50 text-left transition active:scale-[0.98] border ${
        compact ? 'p-2 pb-3' : 'p-3 pb-4'
      }`}
      style={{ borderColor: `color-mix(in srgb, ${color} 30%, transparent)` }}
    >
      <span
        className={`grid place-items-center rounded-lg ${compact ? 'h-6 w-6' : 'h-8 w-8'}`}
        style={{ background: `color-mix(in srgb, ${color} 14%, transparent)`, color }}
      >
        {icon}
      </span>
      <p
        className={`whitespace-nowrap font-extrabold ${
          compact ? 'mt-1.5 text-[16px]' : `mt-2 ${value.length > 6 ? 'text-[15px]' : 'text-[20px]'}`
        }`}
        style={{ color }}
      >
        {value}
      </p>
      <p className={`text-gray-400 truncate ${compact ? 'text-[10px] leading-tight' : 'text-[12px]'}`}>{label}</p>
      <span className="absolute inset-x-2 bottom-0 h-[3px] rounded-t-full" style={{ background: color }} />
    </button>
  )
}

function IconSnowflake({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" d="M12 2v20M4.2 6l15.6 12M4.2 18L19.8 6M9.5 3.2l2.5 2 2.5-2M9.5 20.8l2.5-2 2.5 2M4.6 8.6l3-.6.6-2.8M3.4 16l3.2.4 1.2 2.8M19.4 8l-3 .6-.4-2.8M20.6 16l-3.2.4-1.4 2.8" />
    </svg>
  )
}

function IconPlus({ className }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
    </svg>
  )
}

function IconReport({ className }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
    </svg>
  )
}

function IconFolder({ className }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 7a2 2 0 012-2h4l2 2h8a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V7z" />
    </svg>
  )
}

function IconCheck({ className }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  )
}

function IconRefresh({ className }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
    </svg>
  )
}

function IconBell({ className }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
    </svg>
  )
}

function IconChevronRight({ className }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
    </svg>
  )
}

function IconClipboardMini({ className }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
    </svg>
  )
}

function IconMoney({ className }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V6m0 10v2m9-8a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  )
}

function IconEye({ className }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  )
}

function IconEyeOff({ className }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12c1.292 4.338 5.31 7.5 10.066 7.5.993 0 1.953-.138 2.863-.395M6.228 6.228A10.451 10.451 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
    </svg>
  )
}

// Puramente decorativo (marca d'água no card Financeiro) — não representa
// dados reais, só a sugestão visual de uma linha de tendência.
function IconSparkline({ className }) {
  return (
    <svg className={className} viewBox="0 0 120 50" fill="none" preserveAspectRatio="none">
      <path
        d="M2 40 C 18 38, 24 30, 34 32 S 54 20, 64 22 S 84 8, 94 10 S 110 4, 118 3"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
      />
    </svg>
  )
}

function IconUsersMini({ className }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  )
}
