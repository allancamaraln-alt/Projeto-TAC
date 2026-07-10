/** OS-001, OS-042, etc. */
export const formatOS = (numero) => `OS-${String(numero).padStart(3, '0')}`

/** R$ 1.250,00 */
export const formatBRL = (valor) =>
  Number(valor ?? 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

/** 20/04/2026 */
export const formatDate = (iso) =>
  iso ? new Date(iso.includes('T') ? iso : iso + 'T12:00:00').toLocaleDateString('pt-BR') : '—'

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
