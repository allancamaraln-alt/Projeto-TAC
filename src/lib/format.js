/** OS-001, OS-042, etc. */
export const formatOS = (numero) => `OS-${String(numero).padStart(3, '0')}`

/** R$ 1.250,00 */
export const formatBRL = (valor) =>
  Number(valor ?? 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

/** 20/04/2026 */
export const formatDate = (iso) =>
  iso ? new Date(iso.includes('T') ? iso : iso + 'T12:00:00').toLocaleDateString('pt-BR') : '—'

// Calculado manualmente (em vez de toLocaleDateString com weekday: 'long')
// porque alguns navegadores/WebViews de celular têm dados de localização
// (ICU) incompletos para pt-BR e ignoram a opção 'weekday' silenciosamente,
// mostrando só a data.
const DIAS_SEMANA = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado']

/** 20/04/2026 - Segunda-feira */
export const formatDateWeekday = (iso) => {
  if (!iso) return '—'
  const data = new Date(iso.includes('T') ? iso : iso + 'T12:00:00')
  return `${data.toLocaleDateString('pt-BR')} - ${DIAS_SEMANA[data.getDay()]}`
}

/** 08:30 */
export const formatTime = (time) =>
  time ? time.slice(0, 5) : ''

/** 20/04/2026 14:32 */
export const formatDateTime = (iso) =>
  iso ? new Date(iso).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—'

/** 1 ano / 2 anos / 1 mês / 3 meses / 1 dia / 5 dias */
export const formatGarantia = (valor, unidade) => {
  const n = parseInt(valor)
  const singular = { dias: 'dia', meses: 'mês', anos: 'ano' }
  const label = n === 1 ? (singular[unidade] ?? unidade) : unidade
  return `${n} ${label}`
}

// Uma OS pode ter sido paga em mais de uma forma (ex: parte no Pix, parte em
// dinheiro) e pode não ter sido paga por completo — nesse caso fica um saldo
// a receber, com uma previsão de quando será quitado. `ordem.pagamentos` é a
// fonte de verdade quando existe; OS antigas (antes dessa funcionalidade) só
// têm `forma_pagamento`, e são tratadas como pagas integralmente naquela forma.
export function resumoPagamento(ordem) {
  const valorTotal = Math.max(0, (Number(ordem?.valor) || 0) - (Number(ordem?.desconto) || 0))
  const pagamentos = Array.isArray(ordem?.pagamentos) && ordem.pagamentos.length > 0
    ? ordem.pagamentos
    : (ordem?.forma_pagamento ? [{ forma: ordem.forma_pagamento, valor: valorTotal }] : [])
  const valorPago = pagamentos.reduce((soma, p) => soma + (Number(p.valor) || 0), 0)
  const saldo = Math.max(0, valorTotal - valorPago)
  return { pagamentos, valorPago, valorTotal, saldo, quitado: saldo <= 0.005 }
}

/** Soma o valor de uma lista de itens de orçamento [{ descricao, valor }] */
export function somaItens(itens) {
  return (itens ?? []).reduce((soma, it) => soma + (parseFloat(it?.valor) || 0), 0)
}

/** true quando o usuário já preencheu algo nos itens (não é só a linha vazia inicial) */
export function itensPreenchidos(itens) {
  return (itens ?? []).some(it => (it?.descricao && it.descricao.trim() !== '') || (it?.valor !== '' && it?.valor != null))
}
