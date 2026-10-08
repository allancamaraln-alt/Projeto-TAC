import { resumoPagamento } from './format'

/**
 * 'YYYY-MM-DD' de uma data no fuso do aparelho. Não usar
 * `toISOString().split('T')[0]` pra isso: toISOString é UTC, então no Brasil
 * (UTC−3) a partir das 21h ela já devolve o dia seguinte.
 */
export function toLocalISODate(d = new Date()) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

/** 'YYYY-MM-DD' de hoje (fuso local). */
export const todayISODate = () => toLocalISODate()

/** 'YYYY-MM-DD' do dia 1º do mês corrente (fuso local). */
export const inicioMesISODate = () => {
  const now = new Date()
  return toLocalISODate(new Date(now.getFullYear(), now.getMonth(), 1))
}

/** 'YYYY-MM-DD' de N dias atrás (fuso local). */
export const diasAtrasISODate = (n) => {
  const d = new Date()
  d.setDate(d.getDate() - n)
  return toLocalISODate(d)
}

/**
 * Data em que a OS conta como faturada: data_conclusao, ou — em OS antigas
 * concluídas por caminhos que não gravavam esse campo — o dia de criação.
 */
export function dataFaturamentoOS(os) {
  return os.data_conclusao || (os.created_at ? toLocalISODate(new Date(os.created_at)) : null)
}

/**
 * Filtro PostgREST (`.or(...)`) pra OS concluídas a partir de `startDate`,
 * pela mesma regra de dataFaturamentoOS. `startISO` é o instante equivalente
 * usado no fallback por created_at.
 */
export const filtroConcluidasDesde = (startDate, startISO) =>
  `data_conclusao.gte.${startDate},and(data_conclusao.is.null,created_at.gte.${startISO})`

/**
 * Achata os pagamentos de uma lista de OS em [{ valor, data }] — data é o
 * dia em que o dinheiro entrou (ou a conclusão da OS, pra pagamentos antigos
 * sem data). Regime de caixa: é isso que conta como "recebido".
 */
export function pagamentosDasOrdens(ordens) {
  return ordens.flatMap(os =>
    resumoPagamento(os).pagamentos.map(p => ({
      valor: Number(p.valor) || 0,
      data: p.data || os.data_conclusao,
    }))
  )
}

/** Soma pagamentos com data em [startDate, endDate] (startDate null = sem limite). */
export function somaPagamentos(pagamentos, startDate, endDate) {
  return pagamentos
    .filter(p => p.data && (!startDate || p.data >= startDate) && (!endDate || p.data <= endDate))
    .reduce((s, p) => s + p.valor, 0)
}

// Pills de período usados na tela de Relatório — 'semana'/'trimestre' são
// janelas corridas (rolling), não calendário, ao contrário do período 'semana'
// da IA em resolvePeriodoAI (que usa segunda-feira a hoje).
export const PERIODOS_UI = [
  { label: 'Esta semana', value: 'semana' },
  { label: 'Este mês', value: 'mes' },
  { label: 'Últimos 3 meses', value: 'trimestre' },
  { label: 'Tudo', value: 'tudo' },
]

/** Resolve um valor de PERIODOS_UI em bounds pra filtrar OS (timestamp) e gastos/receitas (date). */
export function resolvePeriodoUI(periodo) {
  // Truncado pra início do dia (em vez de `new Date()` com a hora exata) —
  // assim o valor fica estável entre renderizações no mesmo dia. Usar a hora
  // exata aqui fazia o startISO mudar a cada render (até o milissegundo),
  // o que reentra o useEffect que depende dele em loop infinito.
  const now = new Date()
  const hoje = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const endDate = todayISODate()
  let startISO = null

  if (periodo === 'semana') {
    const d = new Date(hoje)
    d.setDate(d.getDate() - 7)
    startISO = d.toISOString()
  } else if (periodo === 'mes') {
    startISO = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
  } else if (periodo === 'trimestre') {
    const d = new Date(hoje)
    d.setMonth(d.getMonth() - 3)
    startISO = d.toISOString()
  }

  const startDate = startISO ? toLocalISODate(new Date(startISO)) : null
  return { startISO, startDate, endDate }
}

/** Resolve os parâmetros de período da ferramenta de IA get_financial_summary em startDate/endDate. */
export function resolvePeriodoAI({ periodo, data_inicio, data_fim }) {
  const now = new Date()
  let startDate, endDate

  if (periodo === 'hoje') {
    startDate = endDate = todayISODate()
  } else if (periodo === 'semana') {
    const d = new Date(now)
    const day = d.getDay()
    d.setDate(d.getDate() - (day === 0 ? 6 : day - 1)) // segunda-feira
    startDate = toLocalISODate(d)
    endDate = todayISODate()
  } else if (periodo === 'mes') {
    startDate = inicioMesISODate()
    endDate = todayISODate()
  } else if (periodo === 'mes_anterior') {
    const first = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    const last = new Date(now.getFullYear(), now.getMonth(), 0)
    startDate = toLocalISODate(first)
    endDate = toLocalISODate(last)
  } else {
    startDate = data_inicio
    endDate = data_fim
  }

  return { startDate, endDate }
}
