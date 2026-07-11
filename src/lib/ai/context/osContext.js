import { supabase } from '../../supabase'

// Resumo compacto da OS aberta pelo técnico, injetado como contexto extra
// na conversa — assim ele não precisa redigitar cliente/equipamento/
// histórico toda vez que abre o ClimaPro IA a partir de uma OS
// (ver src/hooks/useAI.jsx: activeOrdemId + src/lib/ai/index.js).
export async function fetchOsContext(ordemId, userId) {
  const [{ data: os }, { count: fotosCount }, { data: laudos }] = await Promise.all([
    supabase
      .from('ordens_servico')
      .select(`
        numero, tipo_servico, descricao, status, valor, observacoes, data_agendamento,
        equipamento_tipo, equipamento_marca, equipamento_modelo, equipamento_capacidade,
        equipamento_fluido, equipamento_numero_serie,
        clientes(nome, telefone, endereco)
      `)
      .eq('id', ordemId)
      .eq('tecnico_id', userId)
      .maybeSingle(),
    supabase
      .from('ordens_fotos')
      .select('id', { count: 'exact', head: true })
      .eq('ordem_id', ordemId),
    supabase
      .from('laudos')
      .select('equipamento_tipo, equipamento_marca, defeito_relatado, diagnostico, created_at')
      .eq('ordem_id', ordemId)
      .order('created_at', { ascending: false })
      .limit(3),
  ])

  if (!os) return null

  const linhas = [
    `[Contexto automático — o técnico está com a OS #${os.numero} aberta agora]`,
    `Cliente: ${os.clientes?.nome || 'não informado'}${os.clientes?.telefone ? ` · ${os.clientes.telefone}` : ''}`,
  ]
  if (os.clientes?.endereco) linhas.push(`Endereço: ${os.clientes.endereco}`)

  linhas.push(`Status: ${os.status} · Serviço: ${os.tipo_servico}${os.valor ? ` · Valor: R$ ${os.valor}` : ''}`)
  if (os.descricao) linhas.push(`Descrição: ${os.descricao}`)
  if (os.observacoes) linhas.push(`Observações: ${os.observacoes}`)

  const equipamento = [os.equipamento_tipo, os.equipamento_marca, os.equipamento_modelo, os.equipamento_capacidade]
    .filter(Boolean).join(' ')
  if (equipamento) {
    linhas.push(
      `Equipamento: ${equipamento}` +
      (os.equipamento_fluido ? ` · Fluido: ${os.equipamento_fluido}` : '') +
      (os.equipamento_numero_serie ? ` · Série: ${os.equipamento_numero_serie}` : '')
    )
  }

  linhas.push(`Fotos anexadas nesta OS: ${fotosCount ?? 0}`)

  if (laudos?.length) {
    linhas.push('Laudos já gerados para esta OS:')
    laudos.forEach(l => {
      const equip = [l.equipamento_tipo, l.equipamento_marca].filter(Boolean).join(' ') || 'Equipamento'
      linhas.push(`- ${equip}: ${l.defeito_relatado || 'defeito não informado'} → ${l.diagnostico || 'sem diagnóstico registrado'}`)
    })
  }

  linhas.push(
    `Use esses dados automaticamente nas respostas sobre este atendimento — não peça ao usuário para repetir o que já está aqui. ` +
    `Se ele pedir para atualizar a OS, marcar como paga ou gerar um laudo referente a este atendimento, use os_numero=${os.numero}.`
  )

  return linhas.join('\n')
}
