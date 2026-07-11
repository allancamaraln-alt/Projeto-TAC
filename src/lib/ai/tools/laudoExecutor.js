import { supabase } from '../../supabase'

export async function executeLaudoTool(name, args, userId) {
  try {
    switch (name) {
      case 'generate_laudo':    return await generateLaudo(args, userId)
      case 'get_laudo':         return await getLaudo(args, userId)
      case 'list_laudos_by_os': return await listLaudosByOS(args, userId)
      default: return { error: `Ferramenta desconhecida: ${name}` }
    }
  } catch (err) {
    return { error: err.message || 'Erro interno ao executar ferramenta.' }
  }
}

async function resolveOrdemId(os_numero, userId) {
  if (!os_numero) return null
  const { data: os } = await supabase
    .from('ordens_servico')
    .select('id')
    .eq('tecnico_id', userId)
    .eq('numero', os_numero)
    .maybeSingle()
  return os?.id ?? null
}

async function generateLaudo(args, userId) {
  const {
    os_numero, cliente_nome, equipamento_tipo, equipamento_marca, equipamento_modelo,
    equipamento_capacidade, equipamento_fluido, numero_serie, defeito_relatado,
    diagnostico, servicos_executados, pecas_utilizadas, recomendacoes, conclusao,
  } = args

  const ordem_id = await resolveOrdemId(os_numero, userId)

  const laudo = {
    tecnico_id: userId,
    ordem_id,
    cliente_nome: cliente_nome || '',
    equipamento_tipo: equipamento_tipo || '',
    equipamento_marca: equipamento_marca || '',
    equipamento_modelo: equipamento_modelo || '',
    equipamento_capacidade: equipamento_capacidade || '',
    equipamento_fluido: equipamento_fluido || '',
    numero_serie: numero_serie || '',
    defeito_relatado: defeito_relatado || '',
    diagnostico: diagnostico || '',
    servicos_executados: servicos_executados || '',
    pecas_utilizadas: pecas_utilizadas || '',
    recomendacoes: recomendacoes || '',
    conclusao: conclusao || '',
  }

  const { data: row, error } = await supabase
    .from('laudos')
    .insert(laudo)
    .select()
    .single()

  if (error) return { error: error.message }

  // Promove os campos de equipamento para a OS vinculada, sem sobrescrever
  // o que o técnico já tiver preenchido manualmente.
  if (ordem_id) {
    const { data: os } = await supabase
      .from('ordens_servico')
      .select('equipamento_tipo, equipamento_marca, equipamento_modelo, equipamento_capacidade, equipamento_fluido, equipamento_numero_serie')
      .eq('id', ordem_id)
      .maybeSingle()

    if (os) {
      const updates = {}
      if (!os.equipamento_tipo && laudo.equipamento_tipo) updates.equipamento_tipo = laudo.equipamento_tipo
      if (!os.equipamento_marca && laudo.equipamento_marca) updates.equipamento_marca = laudo.equipamento_marca
      if (!os.equipamento_modelo && laudo.equipamento_modelo) updates.equipamento_modelo = laudo.equipamento_modelo
      if (!os.equipamento_capacidade && laudo.equipamento_capacidade) updates.equipamento_capacidade = laudo.equipamento_capacidade
      if (!os.equipamento_fluido && laudo.equipamento_fluido) updates.equipamento_fluido = laudo.equipamento_fluido
      if (!os.equipamento_numero_serie && laudo.numero_serie) updates.equipamento_numero_serie = laudo.numero_serie
      if (Object.keys(updates).length) {
        await supabase.from('ordens_servico').update(updates).eq('id', ordem_id)
      }
    }
  }

  return {
    success: true,
    id: row.id,
    action: { type: 'laudo_generated', id: row.id, laudo: row },
  }
}

async function getLaudo({ laudo_id }, userId) {
  const { data, error } = await supabase
    .from('laudos')
    .select('*')
    .eq('tecnico_id', userId)
    .eq('id', laudo_id)
    .maybeSingle()
  if (error) return { error: error.message }
  if (!data) return { error: 'Laudo não encontrado.' }
  return { laudo: data }
}

async function listLaudosByOS({ os_numero }, userId) {
  const ordem_id = await resolveOrdemId(os_numero, userId)
  if (!ordem_id) return { error: `OS nº ${os_numero} não encontrada.` }

  const { data, error } = await supabase
    .from('laudos')
    .select('id, cliente_nome, equipamento_tipo, equipamento_marca, created_at')
    .eq('tecnico_id', userId)
    .eq('ordem_id', ordem_id)
    .order('created_at', { ascending: false })
  if (error) return { error: error.message }
  return { laudos: data || [] }
}
