import { supabase } from '../supabase'

// Estatísticas leves usadas pela saudação do ClimaPro IA (GreetingHero) —
// extraído de AIAssistant.jsx para ser reutilizado também por ChatHome.jsx.
export async function fetchDashboardStats(userId) {
  const today = new Date().toISOString().split('T')[0]
  const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1)
    .toISOString().split('T')[0]

  const [osHojeRes, pendentesRes, mesRes] = await Promise.all([
    supabase
      .from('ordens_servico')
      .select('id', { count: 'exact', head: true })
      .eq('tecnico_id', userId)
      .eq('data_agendamento', today)
      .neq('status', 'cancelado'),
    supabase
      .from('ordens_servico')
      .select('valor')
      .eq('tecnico_id', userId)
      .in('status', ['orcamento', 'aprovado', 'em_andamento']),
    supabase
      .from('ordens_servico')
      .select('valor')
      .eq('tecnico_id', userId)
      .eq('status', 'concluido')
      .gte('created_at', startOfMonth),
  ])

  const aReceber = (pendentesRes.data || []).reduce((s, o) => s + Number(o.valor || 0), 0)
  const receitaMes = (mesRes.data || []).reduce((s, o) => s + Number(o.valor || 0), 0)

  return {
    osHoje: osHojeRes.count ?? 0,
    pendentes: pendentesRes.data?.length ?? 0,
    aReceber,
    receitaMes,
  }
}

export function getGreeting() {
  const h = new Date().getHours()
  if (h < 12) return 'Bom dia'
  if (h < 18) return 'Boa tarde'
  return 'Boa noite'
}

export function formatCompact(value) {
  if (value === 0) return 'R$ 0'
  if (value >= 1000) {
    const k = value / 1000
    const n = k % 1 === 0 ? k : parseFloat(k.toFixed(1))
    return `R$ ${String(n).replace('.', ',')}k`
  }
  return `R$ ${Math.round(value).toLocaleString('pt-BR')}`
}
