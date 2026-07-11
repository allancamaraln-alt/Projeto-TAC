import { supabase } from '../../supabase'

export async function executeAtendimentoTool(args, { userId, ordemId, conversationId }) {
  try {
    const { tipo, descricao } = args
    const { data, error } = await supabase
      .from('atendimento_eventos')
      .insert({
        conversation_id: conversationId,
        ordem_id: ordemId,
        tecnico_id: userId,
        tipo,
        descricao,
      })
      .select()
      .single()
    if (error) return { error: error.message }
    return { success: true, evento_id: data.id }
  } catch (err) {
    return { error: err.message || 'Erro interno ao executar ferramenta.' }
  }
}
