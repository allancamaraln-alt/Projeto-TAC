/** 'YYYY-MM-DD' de hoje. */
export const todayISODate = () => new Date().toISOString().split('T')[0]

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

  const startDate = startISO ? startISO.split('T')[0] : null
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
    startDate = d.toISOString().split('T')[0]
    endDate = todayISODate()
  } else if (periodo === 'mes') {
    startDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`
    endDate = todayISODate()
  } else if (periodo === 'mes_anterior') {
    const first = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    const last = new Date(now.getFullYear(), now.getMonth(), 0)
    startDate = first.toISOString().split('T')[0]
    endDate = last.toISOString().split('T')[0]
  } else {
    startDate = data_inicio
    endDate = data_fim
  }

  return { startDate, endDate }
}
