/** OS-001, OS-042, etc. */
export const formatOS = (numero) => `OS-${String(numero).padStart(3, '0')}`

/** R$ 1.250,00 */
export const formatBRL = (valor) =>
  Number(valor ?? 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

/** 20/04/2026 */
export const formatDate = (iso) =>
  iso ? new Date(iso.includes('T') ? iso : iso + 'T12:00:00').toLocaleDateString('pt-BR') : '—'
