import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { formatOS, formatBRL, formatDate, resumoPagamento } from '../lib/format'
import StatusBadge from '../components/StatusBadge'
import CobrancaPendenteCard from '../components/CobrancaPendenteCard'
import LancamentoRow from '../components/financial/LancamentoRow'
import LancamentoFormSheet from '../components/financial/LancamentoFormSheet'
import { useAuth } from '../hooks/useAuth'
import { useLancamentosFinanceiros } from '../hooks/useLancamentosFinanceiros'
import { PERIODOS_UI, resolvePeriodoUI } from '../lib/financialPeriod'

export default function Relatorio() {
  const navigate = useNavigate()
  const { user, hasFaturamento, hasRelatorioAvancado } = useAuth()
  const [periodo, setPeriodo] = useState('mes')
  const [aba, setAba] = useState('faturamento')
  const [ordens, setOrdens] = useState([])
  const [loading, setLoading] = useState(true)
  const [pagamentosOrdens, setPagamentosOrdens] = useState([])
  const [sheet, setSheet] = useState(null) // { tipo: 'gasto'|'receita', initialValue } | null

  const { startISO, startDate, endDate } = resolvePeriodoUI(periodo)

  useEffect(() => {
    async function load() {
      setLoading(true)
      let query = supabase
        .from('ordens_servico')
        .select('*, clientes(nome)')
        .order('created_at', { ascending: false })

      if (startISO) query = query.gte('created_at', startISO)

      const timeout = new Promise(resolve => setTimeout(() => resolve({ data: [] }), 5000))
      const { data } = await Promise.race([query, timeout])
      setOrdens(data ?? [])
      setLoading(false)
    }
    load()
  }, [startISO])

  // Pendências e recebimentos não seguem o filtro de período acima: uma
  // dívida de uma OS antiga continua valendo hoje mesmo que ela tenha sido
  // criada fora do período selecionado. Busca independente, com todas as
  // OS concluídas, para calcular pendente/vencido/recebido corretamente.
  useEffect(() => {
    async function loadPagamentos() {
      const { data } = await supabase
        .from('ordens_servico')
        .select('id, numero, valor, desconto, pagamentos, forma_pagamento, data_conclusao, data_pagamento_pendente, tipo_servico, clientes(nome, telefone)')
        .eq('status', 'concluido')
      setPagamentosOrdens(data ?? [])
    }
    loadPagamentos()
  }, [])

  const concluidas = ordens.filter(os => os.status === 'concluido')
  const totalFaturado = concluidas.reduce((acc, os) => acc + resumoPagamento(os).valorTotal, 0)
  const totalOrcamentos = ordens.filter(os => os.status === 'orcamento').length
  const totalEmAndamento = ordens.filter(os => os.status === 'em_andamento').length

  // Cobranças: pendente/vencido são o estado atual (não olham o período
  // selecionado); recebido hoje/semana/mês somam cada pagamento pela data
  // em que ele foi de fato recebido (não pela data de criação da OS).
  const hojeISO = new Date().toISOString().split('T')[0]
  const inicioSemanaISO = new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0]
  const inicioMesISO = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0]

  const resumosPagamento = pagamentosOrdens.map(os => ({ os, pag: resumoPagamento(os) }))
  const pendentes = resumosPagamento.filter(r => r.pag.saldo > 0.004)
  const totalPendente = pendentes.reduce((s, r) => s + r.pag.saldo, 0)
  const vencidos = pendentes.filter(r => r.os.data_pagamento_pendente && r.os.data_pagamento_pendente < hojeISO)
  const totalVencido = vencidos.reduce((s, r) => s + r.pag.saldo, 0)
  // "A receber" exibido não inclui o que já está vencido — os dois cards
  // ficam mutuamente exclusivos (dá pra somar e bater com o total pendente).
  const totalAReceber = totalPendente - totalVencido

  const todosPagamentos = resumosPagamento.flatMap(r =>
    r.pag.pagamentos.map(p => ({ valor: Number(p.valor) || 0, data: p.data || r.os.data_conclusao }))
  )
  const somaPagamentosDesde = (desde) =>
    todosPagamentos.filter(p => p.data && p.data >= desde).reduce((s, p) => s + p.valor, 0)
  const recebidoHoje = somaPagamentosDesde(hojeISO)
  const recebidoSemana = somaPagamentosDesde(inicioSemanaISO)
  const recebidoMes = somaPagamentosDesde(inicioMesISO)

  const ticketMedio = concluidas.length > 0 ? totalFaturado / concluidas.length : 0

  const topClientes = Object.entries(
    concluidas.reduce((acc, os) => {
      const nome = os.clientes?.nome ?? 'Desconhecido'
      acc[nome] = (acc[nome] ?? 0) + resumoPagamento(os).valorTotal
      return acc
    }, {})
  )
    .map(([nome, total]) => ({ nome, total }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 5)

  const {
    gastos, receitas, loading: loadingFinanceiro,
    totalGastos, totalReceitas, porCategoria,
    criarGasto, atualizarGasto, excluirGasto,
    criarReceita, atualizarReceita, excluirReceita,
  } = useLancamentosFinanceiros({ userId: user?.id, startDate, endDate })

  const recebidoNoPeriodo = todosPagamentos
    .filter(p => p.data && p.data <= endDate && (!startDate || p.data >= startDate))
    .reduce((s, p) => s + p.valor, 0)
  const lucroLiquido = recebidoNoPeriodo + totalReceitas - totalGastos

  async function handleSubmitLancamento(payload) {
    const { tipo, initialValue } = sheet
    if (tipo === 'gasto') {
      if (initialValue) await atualizarGasto(initialValue.id, payload)
      else await criarGasto(payload)
    } else {
      if (initialValue) await atualizarReceita(initialValue.id, payload)
      else await criarReceita(payload)
    }
  }

  async function handleDeleteLancamento(id) {
    if (sheet.tipo === 'gasto') await excluirGasto(id)
    else await excluirReceita(id)
  }

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
          {PERIODOS_UI.map(p => (
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

        {/* Abas */}
        <div className="grid grid-cols-2 gap-2 bg-gray-100 rounded-2xl p-1">
          <button
            onClick={() => setAba('faturamento')}
            className={`text-sm py-2 rounded-xl font-semibold transition-colors ${
              aba === 'faturamento' ? 'bg-white shadow-sm text-gray-800' : 'text-gray-500'
            }`}
          >
            Faturamento
          </button>
          <button
            onClick={() => setAba('financeiro')}
            className={`text-sm py-2 rounded-xl font-semibold transition-colors ${
              aba === 'financeiro' ? 'bg-white shadow-sm text-gray-800' : 'text-gray-500'
            }`}
          >
            Financeiro
          </button>
        </div>

        {aba === 'faturamento' && (loading ? (
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

            {/* Cobranças — estado atual, independente do período selecionado acima */}
            <div className="pt-1">
              <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">
                Cobranças
              </h2>
              <p className="text-xs text-gray-400 mt-0.5">
                Situação atual de todas as OS — não muda com o período selecionado acima.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <MetricCard label="A receber" value={formatBRL(totalAReceber)} bg="bg-amber-50" text="text-amber-600" onClick={() => navigate('/ordens?pagamento=pendente')} />
              <MetricCard label="Vencido" value={formatBRL(totalVencido)} bg="bg-red-50" text="text-red-600" onClick={() => navigate('/ordens?pagamento=vencido')} />
            </div>
            <div>
              <p className="text-xs text-gray-400 pt-2">
                Recebido — soma pela data em que cada pagamento entrou, não pela data da OS:
              </p>
              <div className="grid grid-cols-3 gap-3 mt-2">
                <MetricCard label="Hoje" value={formatBRL(recebidoHoje)} bg="bg-green-50" text="text-green-600" />
                <MetricCard label="Esta semana" value={formatBRL(recebidoSemana)} bg="bg-green-50" text="text-green-600" />
                <MetricCard label="Este mês" value={formatBRL(recebidoMes)} bg="bg-green-50" text="text-green-600" />
              </div>
            </div>

            {vencidos.length > 0 && (
              <>
                <h2 className="text-sm font-semibold text-red-500 uppercase tracking-wide pt-1">
                  Pagamentos vencidos
                </h2>
                <div className="space-y-3">
                  {vencidos.map(({ os }) => (
                    <CobrancaPendenteCard key={os.id} os={os} onAtualizado={() => setPagamentosOrdens(prev => prev.filter(o => o.id !== os.id))} />
                  ))}
                </div>
              </>
            )}

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
                        <p className="font-bold text-green-600">{formatBRL(resumoPagamento(os).valorTotal)}</p>
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
                            <p className="text-sm font-bold text-gray-600 mt-1">{formatBRL(resumoPagamento(os).valorTotal)}</p>
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
        ))}

        {aba === 'financeiro' && (
          <>
            <div className="grid grid-cols-2 gap-3">
              <MetricCard label="Gastos" value={formatBRL(totalGastos)} bg="bg-red-50" text="text-red-600" />
              <MetricCard label="Receitas avulsas" value={formatBRL(totalReceitas)} bg="bg-emerald-50" text="text-emerald-600" />
            </div>

            <div className="bg-gradient-to-br from-slate-700 to-slate-800 rounded-2xl p-5 text-white shadow-md">
              <p className="text-slate-300 text-sm font-medium">Lucro líquido</p>
              <p className="text-4xl font-bold mt-1">{formatBRL(lucroLiquido)}</p>
              <p className="text-slate-300 text-xs mt-2">
                Regime de caixa: recebido de OS + receitas avulsas − gastos, no período selecionado.
              </p>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => setSheet({ tipo: 'gasto', initialValue: null })}
                className="flex-1 bg-red-50 text-red-600 text-sm font-semibold py-2.5 rounded-xl active:scale-95 transition-all"
              >
                + Despesa
              </button>
              <button
                onClick={() => setSheet({ tipo: 'receita', initialValue: null })}
                className="flex-1 bg-emerald-50 text-emerald-600 text-sm font-semibold py-2.5 rounded-xl active:scale-95 transition-all"
              >
                + Receita
              </button>
            </div>

            {Object.keys(porCategoria).length > 0 && (
              <div>
                <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide pt-1 mb-2">
                  Gastos por categoria
                </h2>
                <div className="card space-y-2">
                  {Object.entries(porCategoria)
                    .sort((a, b) => b[1] - a[1])
                    .map(([cat, valor]) => (
                      <div key={cat} className="flex justify-between text-sm">
                        <span className="text-gray-600">{cat}</span>
                        <span className="font-semibold text-gray-800">{formatBRL(valor)}</span>
                      </div>
                    ))}
                </div>
              </div>
            )}

            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide pt-1">
              Gastos no período
            </h2>
            {loadingFinanceiro ? (
              <div className="card h-16 animate-pulse bg-gray-100" />
            ) : gastos.length === 0 ? (
              <div className="card text-center text-gray-400 py-8">
                <p className="text-3xl mb-2">📊</p>
                <p>Nenhum gasto lançado neste período.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {gastos.map(g => (
                  <LancamentoRow
                    key={g.id}
                    item={g}
                    tipo="gasto"
                    onTap={() => setSheet({ tipo: 'gasto', initialValue: g })}
                  />
                ))}
              </div>
            )}

            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide pt-1">
              Receitas no período
            </h2>
            {loadingFinanceiro ? (
              <div className="card h-16 animate-pulse bg-gray-100" />
            ) : receitas.length === 0 ? (
              <div className="card text-center text-gray-400 py-8">
                <p className="text-3xl mb-2">📊</p>
                <p>Nenhuma receita avulsa neste período.</p>
              </div>
            ) : (
              <div className="space-y-3 pb-4">
                {receitas.map(r => (
                  <LancamentoRow
                    key={r.id}
                    item={r}
                    tipo="receita"
                    onTap={() => r.ordem_id ? navigate(`/ordens/${r.ordem_id}`) : setSheet({ tipo: 'receita', initialValue: r })}
                  />
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {sheet && (
        <LancamentoFormSheet
          key={`${sheet.tipo}-${sheet.initialValue?.id ?? 'novo'}`}
          tipo={sheet.tipo}
          initialValue={sheet.initialValue}
          onClose={() => setSheet(null)}
          onSubmit={handleSubmitLancamento}
          onDelete={handleDeleteLancamento}
        />
      )}
    </div>
  )
}

function MetricCard({ label, value, bg, text, onClick }) {
  const Tag = onClick ? 'button' : 'div'
  return (
    <Tag
      onClick={onClick}
      className={`${bg} rounded-2xl p-3 text-center${onClick ? ' active:scale-95 transition-transform cursor-pointer' : ''}`}
    >
      <p className={`text-base font-bold ${text} leading-tight`}>{value}</p>
      <p className={`text-xs ${text} opacity-80 mt-0.5`}>{label}</p>
    </Tag>
  )
}
