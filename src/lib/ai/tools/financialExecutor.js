import { supabase } from '../../supabase'
import { resumoPagamento } from '../../format'
import { todayISODate, resolvePeriodoAI } from '../../financialPeriod'
import { matchClient } from './clientesExecutor'

export async function executeTool(name, args, userId) {
  try {
    switch (name) {
      case 'create_expense':        return await createExpense(args, userId)
      case 'create_income':         return await createIncome(args, userId)
      case 'register_os_payment':   return await registerOSPayment(args, userId)
      case 'get_financial_summary': return await getFinancialSummary(args, userId)
      case 'list_pending_orders':   return await listPendingOrders(userId)
      default: return { error: `Ferramenta desconhecida: ${name}` }
    }
  } catch (err) {
    return { error: err.message || 'Erro interno ao executar ferramenta.' }
  }
}

async function createExpense({ data, categoria, descricao, valor }, userId) {
  const { data: row, error } = await supabase
    .from('gastos')
    .insert({ tecnico_id: userId, data: data || todayISODate(), categoria, descricao, valor: Number(valor) })
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
    .insert({ tecnico_id: userId, data: data || todayISODate(), descricao, valor: Number(valor) })
    .select('id, data, descricao, valor')
    .single()
  if (error) return { error: error.message }
  return {
    success: true,
    ...row,
    action: { type: 'income_registered', valor: row.valor },
  }
}

// Registra o pagamento de uma OS identificada pelo nome do cliente — cobre
// tanto uma OS ainda não concluída (fecha e marca paga em um passo) quanto
// uma já concluída com saldo pendente ("cobrança em aberto"/"em atraso").
// Usa exatamente o mesmo modelo de dados que o botão "✓ Recebido" do app
// (CobrancaPendenteCard.jsx — ordens_servico.pagamentos), pra que o
// pagamento feito por voz/texto apareça nas mesmas telas (Painel, Relatório,
// Ordens) que um pagamento marcado manualmente.
async function registerOSPayment({ cliente_nome, os_numero, forma_pagamento }, userId) {
  const { data: clientes, error: clientesError } = await supabase
    .from('clientes')
    .select('id, nome')
    .eq('tecnico_id', userId)
  if (clientesError) return { error: clientesError.message }

  const cliente = matchClient(clientes, cliente_nome)
  if (!cliente) return { error: `Cliente "${cliente_nome}" não encontrado.` }

  let query = supabase
    .from('ordens_servico')
    .select('id, numero, tipo_servico, valor, desconto, status, pagamentos, forma_pagamento, data_pagamento_pendente')
    .eq('tecnico_id', userId)
    .eq('cliente_id', cliente.id)
    .neq('status', 'cancelado')
  if (os_numero) query = query.eq('numero', os_numero)

  const { data: ordens, error } = await query
  if (error) return { error: error.message }

  const abertas = (ordens || [])
    .map(os => ({ os, pag: resumoPagamento(os) }))
    .filter(({ os, pag }) => (os.status === 'concluido' ? pag.saldo > 0.004 : pag.valorTotal > 0))

  if (!abertas.length) {
    return {
      error: os_numero
        ? `OS nº ${os_numero} de ${cliente.nome} não tem pagamento em aberto.`
        : `Não encontrei nenhuma cobrança em aberto para ${cliente.nome}.`,
    }
  }

  if (abertas.length > 1) {
    return {
      needs_disambiguation: true,
      cliente_nome: cliente.nome,
      ordens_em_aberto: abertas.map(({ os, pag }) => ({
        os_numero: os.numero,
        tipo_servico: os.tipo_servico,
        saldo: os.status === 'concluido' ? pag.saldo : pag.valorTotal,
      })),
    }
  }

  const { os, pag } = abertas[0]
  const hoje = todayISODate()
  const forma = forma_pagamento || 'outros'
  const valorPago = os.status === 'concluido' ? pag.saldo : pag.valorTotal
  const novosPagamentos = [...pag.pagamentos, { forma, valor: valorPago, data: hoje }]

  const updates = { pagamentos: novosPagamentos, data_pagamento_pendente: null }
  if (os.status !== 'concluido') updates.status = 'concluido'

  const { error: updateError } = await supabase.from('ordens_servico').update(updates).eq('id', os.id)
  if (updateError) return { error: updateError.message }

  await supabase.from('receitas').insert({
    tecnico_id: userId,
    data: hoje,
    descricao: `Pagamento OS #${os.numero} — ${cliente.nome}`,
    valor: valorPago,
    ordem_id: os.id,
  })

  return {
    success: true,
    os_numero: os.numero,
    cliente_nome: cliente.nome,
    valor: valorPago,
    forma_pagamento: forma,
    action: { type: 'order_paid', numero: os.numero, valor: valorPago },
  }
}

async function getFinancialSummary({ periodo, data_inicio, data_fim, categoria }, userId) {
  const { startDate, endDate } = resolvePeriodoAI({ periodo, data_inicio, data_fim })

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
    .select('numero, valor, desconto, status, data_agendamento')
    .eq('tecnico_id', userId)
    .not('status', 'in', '("concluido","cancelado")')
    .gt('valor', 0)
    .order('created_at', { ascending: false })
    .limit(20)
  if (error) return { error: error.message }
  return { ordens: (data || []).map(os => ({ ...os, valor: resumoPagamento(os).valorTotal })) }
}
