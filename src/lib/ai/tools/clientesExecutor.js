import { supabase } from '../../supabase'

function matchClient(clientes, nome) {
  const termo = (nome || '').toLowerCase().trim()
  return clientes?.find(c => {
    const cn = c.nome.toLowerCase()
    return cn.includes(termo) || termo.includes(cn)
  })
}

// Achar-ou-criar cliente por nome. Reutilizado por osExecutor.js (create_os)
// e pelo tool find_or_create_client — mantém a lógica num único lugar.
export async function findOrCreateClient(nome, userId, { telefone, endereco } = {}) {
  const { data: clientes, error: fetchError } = await supabase
    .from('clientes')
    .select('id, nome, telefone, endereco')
    .eq('tecnico_id', userId)
  if (fetchError) throw new Error(fetchError.message)

  let cliente = matchClient(clientes, nome)
  let created = false

  if (!cliente) {
    const { data: novo, error } = await supabase
      .from('clientes')
      .insert({ tecnico_id: userId, nome, telefone: telefone || '', endereco: endereco || '' })
      .select()
      .single()
    if (error) throw new Error(error.message)
    cliente = novo
    created = true
  } else if (telefone || endereco) {
    const updates = {}
    if (telefone && !cliente.telefone) updates.telefone = telefone
    if (endereco && !cliente.endereco) updates.endereco = endereco
    if (Object.keys(updates).length) {
      const { data: atualizado } = await supabase
        .from('clientes').update(updates).eq('id', cliente.id).select().single()
      if (atualizado) cliente = atualizado
    }
  }

  return { cliente, created }
}

export async function executeClientTool(name, args, userId) {
  try {
    switch (name) {
      case 'find_or_create_client': return await findOrCreateClientTool(args, userId)
      case 'update_client':         return await updateClient(args, userId)
      default: return { error: `Ferramenta desconhecida: ${name}` }
    }
  } catch (err) {
    return { error: err.message || 'Erro interno ao executar ferramenta.' }
  }
}

async function findOrCreateClientTool({ nome, telefone, endereco }, userId) {
  const { cliente, created } = await findOrCreateClient(nome, userId, { telefone, endereco })
  return { success: true, id: cliente.id, nome: cliente.nome, criado: created }
}

async function updateClient({ cliente_nome, telefone, endereco }, userId) {
  const { data: clientes, error } = await supabase
    .from('clientes').select('id, nome').eq('tecnico_id', userId)
  if (error) return { error: error.message }

  const cliente = matchClient(clientes, cliente_nome)
  if (!cliente) return { error: `Cliente "${cliente_nome}" não encontrado.` }

  const updates = {}
  if (telefone) updates.telefone = telefone
  if (endereco) updates.endereco = endereco
  if (!Object.keys(updates).length) return { error: 'Nenhum dado para atualizar.' }

  const { error: updateError } = await supabase.from('clientes').update(updates).eq('id', cliente.id)
  if (updateError) return { error: updateError.message }
  return { success: true, nome: cliente.nome, ...updates }
}
