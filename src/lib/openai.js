// Utilitários de UI para o ClimaPro IA
// A lógica de chamada à API está em src/lib/ai/

export function trimHistory(history, max = 20) {
  if (history.length <= max) return history
  return history.slice(history.length - max)
}

// ── OS JSON ──────────────────────────────────────────────
const OS_START = '<<<OS_JSON>>>'
const OS_END = '<<<FIM_OS>>>'

export function extractOSData(text) {
  const start = text.indexOf(OS_START)
  const end = text.indexOf(OS_END)
  if (start === -1 || end === -1) return null
  try { return JSON.parse(text.slice(start + OS_START.length, end).trim()) } catch { return null }
}

export function stripOSData(text) {
  const start = text.indexOf(OS_START)
  return start === -1 ? text : text.slice(0, start).trim()
}

// ── Laudo JSON ───────────────────────────────────────────
const LAUDO_START = '<<<LAUDO_JSON>>>'
const LAUDO_END = '<<<FIM_LAUDO>>>'

export function extractLaudoData(text) {
  const start = text.indexOf(LAUDO_START)
  const end = text.indexOf(LAUDO_END)
  if (start === -1 || end === -1) return null
  try { return JSON.parse(text.slice(start + LAUDO_START.length, end).trim()) } catch { return null }
}

export function stripLaudoData(text) {
  const start = text.indexOf(LAUDO_START)
  return start === -1 ? text : text.slice(0, start).trim()
}

// ── Quick Actions ────────────────────────────────────────
export const QUICK_ACTIONS = [
  {
    label: '🔍 Diagnosticar defeito',
    prompt: 'Preciso diagnosticar um defeito em um equipamento.',
    autoSend: true,
  },
  {
    label: '⚠️ Código de erro',
    prompt: 'Preciso interpretar um código de erro de um equipamento.',
    autoSend: true,
  },
  {
    label: '📋 Redigir OS',
    prompt: 'Preciso redigir uma Ordem de Serviço.',
    autoSend: true,
  },
  {
    label: '📄 Gerar laudo',
    prompt: 'Gere um laudo técnico para: ',
    placeholder: 'Ex: Split 9.000 BTU com vazamento de gás R-410A...',
  },
  {
    label: '💰 Registrar gasto',
    prompt: 'Quero registrar um gasto de hoje.',
    autoSend: true,
  },
  {
    label: '📊 Relatório financeiro',
    prompt: 'Me dê um resumo dos meus gastos e receitas deste mês.',
    autoSend: true,
  },
]
