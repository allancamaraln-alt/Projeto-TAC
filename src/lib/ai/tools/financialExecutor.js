import { supabase } from '../../supabase'

export async function executeTool(name, args, userId) {
  try {
    switch (name) {
      case 'create_expense':       return await createExpense(args, userId)
      case 'create_income':        return await createIncome(args, userId)
      case 'mark_order_as_paid':   return await markOrderAsPaid(args, userId)
      case 'get_financial_summary': return await getFinancialSummary(args, userId)
      case 'list_pending_orders':  return await listPendingOrders(userId)
      default: return { error: `Ferramenta desconhecida: ${name}` }
    }
  } catch (err) {
    return { error: err.message || 'Erro interno ao executar ferramenta.' }
  }
}

function today() {
  return new Date().toISOString().split('T')[0]
}

async function createExpense({ data, categoria, descricao, valor }, userId) {
  const { data: row, error } = await supabase
    .from('gastos')
    .insert({ tecnico_id: userId, data: data || today(), categoria, descricao, valor: Number(valor) })
    .select('id, data, categoria, descricao, valor')
    .single()
  if (error) return { error: error.message }
  return {
    success: true,
    ...row,
    action: { type: 'expense_registered', valor: row.valor, categoria: row.categoria },
  }
}

async function createIncome({ data, descricao, valor }, userId) {
  const { data: row, error } = await supabase
    .from('receitas')
    .insert({ tecnico_id: userId, data: data || today(), descricao, valor: Number(valor) })
    .select('id, data, descricao, valor')
    .single()
  if (error) return { error: error.message }
  return {
    success: true,
    ...row,
    action: { type: 'income_registered', valor: row.valor },
  }
}

async function markOrderAsPaid({ os_numero, valor }, userId) {
  const { data: os, error } = await supabase
    .from('ordens_servico')
    .select('id, numero, valor, status')
    .eq('tecnico_id', userId)
    .eq('numero', os_numero)
    .maybeSingle()

  if (error) return { error: error.message }
  if (!os) return { error: `OS nº ${os_numero} não encontrada.` }
  if (os.status === 'concluido') return { error: `OS nº ${os_numero} já está marcada como concluída.` }

  const valorFinal = valor ?? os.valor ?? 0

  await supabase.from('ordens_servico').update({ status: 'concluido' }).eq('id', os.id)

  await supabase.from('receitas').insert({
    tecnico_id: userId,
    data: today(),
    descricao: `Pagamento OS #${os_numero}`,
    valor: valorFinal,
    ordem_id: os.id,
  })

  return {
    success: true,
    os_numero,
    valor: valorFinal,
    action: { type: 'order_paid', numero: os_numero, valor: valorFinal },
  }
}

async function getFinancialSummary({ periodo, data_inicio, data_fim, categoria }, userId) {
  const now = new Date()
  let startDate, endDate

  if (periodo === 'hoje') {
    startDate = endDate = today()
  } else if (periodo === 'semana') {
    const d = new Date(now)
    const day = d.getDay()
    d.setDate(d.getDate() - (day === 0 ? 6 : day - 1)) // segunda-feira
    startDate = d.toISOString().split('T')[0]
    endDate = today()
  } else if (periodo === 'mes') {
    startDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`
    endDate = today()
  } else if (periodo === 'mes_anterior') {
    const first = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    const last = new Date(now.getFullYear(), now.getMonth(), 0)
    startDate = first.toISOString().split('T')[0]
    endDate = last.toISOString().split('T')[0]
  } else {
    startDate = data_inicio
    endDate = data_fim
  }

  let gastosQ = supabase
    .from('gastos')
    .select('data, categoria, descricao, valor')
    .eq('tecnico_id', userId)
    .gte('data', startDate)
    .lte('data', endDate)
    .order('data', { ascending: false })
  if (categoria) gastosQ = gastosQ.eq('categoria', categoria)

  const { data: gastos } = await gastosQ
  const { data: receitas } = await supabase
    .from('receitas')
    .select('data, descricao, valor')
    .eq('tecnico_id', userId)
    .gte('data', startDate)
    .lte('data', endDate)
    .order('data', { ascending: false })

  const totalGastos = (gastos || []).reduce((s, g) => s + Number(g.valor), 0)
  const totalReceitas = (receitas || []).reduce((s, r) => s + Number(r.valor), 0)

  const porCategoria = (gastos || []).reduce((acc, g) => {
    acc[g.categoria] = (acc[g.categoria] || 0) + Number(g.valor)
    return acc
  }, {})

  return {
    periodo: `${startDate} a ${endDate}`,
    total_gastos: totalGastos,
    total_receitas: totalReceitas,
    lucro: totalReceitas - totalGastos,
    gastos_por_categoria: porCategoria,
    gastos: gastos || [],
    receitas: receitas || [],
  }
}

async function listPendingOrders(userId) {
  const { data, error } = await supabase
    .from('ordens_servico')
    .select('numero, valor, status, data_agendamento')
    .eq('tecnico_id', userId)
    .not('status', 'in', '("concluido","cancelado")')
    .gt('valor', 0)
    .order('created_at', { ascending: false })
    .limit(20)
  if (error) return { error: error.message }
  return { ordens: data || [] }
}
