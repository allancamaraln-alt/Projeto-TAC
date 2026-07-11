import { supabase } from '../../supabase'
import { findOrCreateClient } from './clientesExecutor'

export async function executeOSTool(name, args, userId) {
  try {
    switch (name) {
      case 'create_os': return await createOS(args, userId)
      case 'update_os': return await updateOS(args, userId)
      case 'get_os':    return await getOS(args, userId)
      case 'list_os':   return await listOS(args, userId)
      default: return { error: `Ferramenta desconhecida: ${name}` }
    }
  } catch (err) {
    return { error: err.message || 'Erro interno ao executar ferramenta.' }
  }
}

async function createOS({ cliente_nome, tipo_servico, descricao, valor, data_agendamento, hora_agendamento, observacoes, status }, userId) {
  const { cliente, created } = await findOrCreateClient(cliente_nome, userId)

  const { data: os, error } = await supabase
    .from('ordens_servico')
    .insert({
      tecnico_id: userId,
      cliente_id: cliente.id,
      tipo_servico: tipo_servico || 'Outro',
      descricao: descricao || '',
      valor: Number(valor) || 0,
      data_agendamento: data_agendamento || null,
      hora_agendamento: hora_agendamento || null,
      observacoes: observacoes || '',
      status: status || 'orcamento',
    })
    .select()
    .single()

  if (error) return { error: error.message }

  return {
    success: true,
    numero: os.numero,
    cliente: cliente.nome,
    cliente_criado: created,
    action: { type: 'os_created', id: os.id, numero: os.numero, cliente_criado: created },
  }
}

async function updateOS({ os_numero, ...fields }, userId) {
  const { data: os, error: findError } = await supabase
    .from('ordens_servico')
    .select('id, numero')
    .eq('tecnico_id', userId)
    .eq('numero', os_numero)
    .maybeSingle()
  if (findError) return { error: findError.message }
  if (!os) return { error: `OS nº ${os_numero} não encontrada.` }

  const allowed = ['tipo_servico', 'descricao', 'valor', 'data_agendamento', 'hora_agendamento', 'observacoes', 'status']
  const updates = {}
  for (const key of allowed) {
    if (fields[key] !== undefined && fields[key] !== null) updates[key] = fields[key]
  }
  if (!Object.keys(updates).length) return { error: 'Nenhum dado para atualizar.' }

  const { error: updateError } = await supabase.from('ordens_servico').update(updates).eq('id', os.id)
  if (updateError) return { error: updateError.message }

  return {
    success: true,
    numero: os_numero,
    ...updates,
    action: { type: 'os_updated', id: os.id, numero: os_numero },
  }
}

async function getOS({ os_numero }, userId) {
  const { data: os, error } = await supabase
    .from('ordens_servico')
    .select('numero, tipo_servico, descricao, valor, status, data_agendamento, hora_agendamento, observacoes, clientes(nome, telefone)')
    .eq('tecnico_id', userId)
    .eq('numero', os_numero)
    .maybeSingle()
  if (error) return { error: error.message }
  if (!os) return { error: `OS nº ${os_numero} não encontrada.` }
  return { os }
}

async function listOS({ status, limit }, userId) {
  let query = supabase
    .from('ordens_servico')
    .select('numero, tipo_servico, valor, status, data_agendamento, clientes(nome)')
    .eq('tecnico_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit && limit > 0 ? limit : 15)
  if (status) query = query.eq('status', status)

  const { data, error } = await query
  if (error) return { error: error.message }
  return { ordens: data || [] }
}
