import { supabase } from './supabase'

export const PERIODICIDADE_LABEL = {
  semanal: 'Semanal',
  quinzenal: 'Quinzenal',
  mensal: 'Mensal',
  bimestral: 'Bimestral',
  trimestral: 'Trimestral',
  semestral: 'Semestral',
  anual: 'Anual',
  personalizada: 'Personalizada',
}

function parseIsoDate(dataIso) {
  const [y, m, d] = dataIso.split('-').map(Number)
  return new Date(y, m - 1, d)
}

function toIso(date) {
  return date.toISOString().split('T')[0]
}

export function proximaData(baseIso, periodicidade, periodicidadeDias) {
  const base = parseIsoDate(baseIso)
  const d = new Date(base)
  switch (periodicidade) {
    case 'semanal':      d.setDate(d.getDate() + 7); break
    case 'quinzenal':    d.setDate(d.getDate() + 15); break
    case 'mensal':       d.setMonth(d.getMonth() + 1); break
    case 'bimestral':    d.setMonth(d.getMonth() + 2); break
    case 'trimestral':   d.setMonth(d.getMonth() + 3); break
    case 'semestral':    d.setMonth(d.getMonth() + 6); break
    case 'anual':        d.setFullYear(d.getFullYear() + 1); break
    case 'personalizada': d.setDate(d.getDate() + (Number(periodicidadeDias) || 0)); break
    default: break
  }
  return toIso(d)
}

export function diasParaData(dataIso) {
  const hoje = new Date()
  hoje.setHours(0, 0, 0, 0)
  return Math.round((parseIsoDate(dataIso) - hoje) / 86400000)
}

export function labelDias(dias) {
  if (dias < 0)   return { texto: `${Math.abs(dias)}d em atraso`, cor: 'text-red-500',    bg: 'bg-red-50',    border: 'border-red-100' }
  if (dias === 0) return { texto: 'Vence hoje',                   cor: 'text-orange-500', bg: 'bg-orange-50', border: 'border-orange-100' }
  if (dias <= 7)  return { texto: `em ${dias} dias`,               cor: 'text-orange-500', bg: 'bg-orange-50', border: 'border-orange-100' }
  return                { texto: `em ${dias} dias`,               cor: 'text-gray-500',   bg: 'bg-gray-50',   border: 'border-gray-100' }
}

// Bucketing de 3 estados usado no dashboard/lista/aba de manutenções.
// Nunca depende só de cor — sempre vem junto com ícone + texto.
export function bucket3(dias) {
  if (dias < 0) return 'atrasado'
  if (dias <= 7) return 'proximo'
  return 'em_dia'
}

export const BUCKET3_LABEL = {
  atrasado: { texto: 'Atrasado',            icone: '🔴', cor: 'text-red-500',    bg: 'bg-red-50',    border: 'border-red-100' },
  proximo:  { texto: 'Próximo do vencimento', icone: '🟠', cor: 'text-orange-500', bg: 'bg-orange-50', border: 'border-orange-100' },
  em_dia:   { texto: 'Em dia',              icone: '🟢', cor: 'text-green-600',  bg: 'bg-green-50',  border: 'border-green-100' },
}

// execucaoItens: linhas de pmoc_execucao_itens (plano_item_id, data)
// -> Map<plano_item_id, dataMaisRecenteISO>
export function ultimaExecucaoPorItem(execucaoItens) {
  const map = new Map()
  for (const ei of execucaoItens) {
    if (!ei.plano_item_id) continue
    const atual = map.get(ei.plano_item_id)
    if (!atual || ei.data > atual) map.set(ei.plano_item_id, ei.data)
  }
  return map
}

// item: { id, periodicidade, periodicidade_dias, proxima_execucao_override, created_at }
// O override só vale enquanto o item nunca foi executado — depois da 1ª
// execução real, o cálculo por última execução sempre prevalece.
export function statusItem(item, ultimaData, dataInicioPmoc) {
  const nuncaExecutado = !ultimaData
  if (nuncaExecutado && item.proxima_execucao_override) {
    const prevista = item.proxima_execucao_override
    return { prevista, dias: diasParaData(prevista), nuncaExecutado }
  }
  const base = ultimaData || dataInicioPmoc || item.created_at.slice(0, 10)
  const prevista = ultimaData
    ? proximaData(ultimaData, item.periodicidade, item.periodicidade_dias)
    : base
  return { prevista, dias: diasParaData(prevista), nuncaExecutado }
}

// Loader único de histórico — usado tanto pela aba embutida quanto pela
// rota completa, para não haver duas implementações divergentes.
export async function carregarHistoricoPmoc(pmocId) {
  const [{ data: execucoes }, { data: itens }] = await Promise.all([
    supabase.from('pmoc_execucoes').select('*').eq('pmoc_id', pmocId).order('data', { ascending: false }),
    supabase.from('pmoc_execucao_itens').select('*').eq('pmoc_id', pmocId).order('data', { ascending: false }),
  ])

  const itensPorExecucao = {}
  for (const item of itens ?? []) {
    if (!itensPorExecucao[item.execucao_id]) itensPorExecucao[item.execucao_id] = []
    itensPorExecucao[item.execucao_id].push(item)
  }

  const itemIds = (itens ?? []).map(i => i.id)
  const fotosPorItem = {}
  if (itemIds.length > 0) {
    const { data: fotos } = await supabase.from('pmoc_execucao_fotos').select('*').in('execucao_item_id', itemIds)
    for (const foto of fotos ?? []) {
      if (!fotosPorItem[foto.execucao_item_id]) fotosPorItem[foto.execucao_item_id] = []
      fotosPorItem[foto.execucao_item_id].push(foto)
    }
  }

  return { execucoes: execucoes ?? [], itensPorExecucao, fotosPorItem }
}
