import { useState, useEffect, useCallback, useRef } from 'react'
import { useAuth } from './useAuth'
import { supabase } from '../lib/supabase'
import { runAtendimentoTurn } from '../lib/ai/atendimento'
import { trimHistory } from '../lib/openai'

// Mapeia actions de ferramentas de domínio (já existentes desde as Fases 1/3)
// para eventos da linha do tempo do atendimento — evita depender do modelo
// lembrar de chamar duas ferramentas (log_atendimento_evento + a de domínio)
// para os eventos mais importantes (dinheiro, OS, laudo).
const ACTION_TO_EVENTO = {
  os_created: (a) => ({ tipo: 'outro', descricao: `OS #${a.numero} criada` }),
  os_updated: (a) => ({ tipo: 'outro', descricao: `OS #${a.numero} atualizada` }),
  laudo_generated: () => ({ tipo: 'conclusao', descricao: 'Laudo técnico gerado' }),
  expense_registered: (a) => ({ tipo: 'outro', descricao: `Despesa registrada — R$ ${Number(a.valor).toFixed(2)}${a.categoria ? ` (${a.categoria})` : ''}` }),
  income_registered: (a) => ({ tipo: 'pagamento', descricao: `Receita registrada — R$ ${Number(a.valor).toFixed(2)}` }),
  order_paid: (a) => ({ tipo: 'pagamento', descricao: `OS #${a.numero} marcada como paga — R$ ${Number(a.valor).toFixed(2)}` }),
}

async function logEventosFromActions(actions, ctx) {
  if (!actions?.length) return
  const rows = actions
    .map(a => {
      const mapper = ACTION_TO_EVENTO[a.type]
      if (!mapper) return null
      return { conversation_id: ctx.conversationId, ordem_id: ctx.ordemId, tecnico_id: ctx.userId, ...mapper(a) }
    })
    .filter(Boolean)
  if (rows.length) await supabase.from('atendimento_eventos').insert(rows)
}

function rowToMessage(row) {
  if (row.role === 'assistant' && row.content && typeof row.content === 'object' && !Array.isArray(row.content)) {
    return { role: 'assistant', content: row.content.text ?? '', ...(row.content.actions?.length ? { actions: row.content.actions } : {}) }
  }
  return { role: row.role, content: row.content }
}

// Sessão de narração ao vivo vinculada a uma OS (Modo Atendimento IA).
// Diferente do chat geral (useAI.jsx, sessionStorage), a conversa aqui é
// persistida em ai_conversations/ai_messages — precisa sobreviver a troca
// de app/aba durante o atendimento presencial.
export function useAtendimento(ordemId) {
  const { user, profile } = useAuth()
  const [conversation, setConversation] = useState(null)
  const [messages, setMessages] = useState([])
  const [loading, setLoading] = useState(false)
  const [phase, setPhase] = useState(null) // 'pensando' | 'executando' | null
  const [initializing, setInitializing] = useState(true)
  const [error, setError] = useState(null)
  const abortRef = useRef(null)

  useEffect(() => {
    if (!user?.id || !ordemId) return
    let cancelled = false

    async function init() {
      setInitializing(true)

      const { data: existente } = await supabase
        .from('ai_conversations')
        .select('*')
        .eq('ordem_id', ordemId)
        .eq('tipo', 'atendimento')
        .eq('status', 'ativa')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      let conv = existente
      if (!conv) {
        const { data: nova, error: convError } = await supabase
          .from('ai_conversations')
          .insert({ tecnico_id: user.id, ordem_id: ordemId, tipo: 'atendimento', status: 'ativa' })
          .select()
          .single()
        if (convError) {
          if (!cancelled) { setError('Erro ao iniciar atendimento.'); setInitializing(false) }
          return
        }
        conv = nova
      }

      const { data: msgRows } = await supabase
        .from('ai_messages')
        .select('*')
        .eq('conversation_id', conv.id)
        .order('created_at', { ascending: true })

      if (!cancelled) {
        setConversation(conv)
        setMessages((msgRows || []).map(rowToMessage))
        setInitializing(false)
      }
    }

    init()
    return () => { cancelled = true }
  }, [user?.id, ordemId])

  const persistMessage = useCallback((msg, conversationId) => {
    const content = msg.role === 'assistant' ? { text: msg.content, actions: msg.actions || [] } : msg.content
    return supabase.from('ai_messages').insert({
      conversation_id: conversationId,
      tecnico_id: user.id,
      role: msg.role,
      content,
    })
  }, [user])

  const send = useCallback(async (text, imageDataUrl = null) => {
    const hasContent = text?.trim() || imageDataUrl
    if (!hasContent || loading || !conversation) return

    const content = imageDataUrl
      ? [
          { type: 'text', text: text?.trim() || 'Foto anexada durante o atendimento.' },
          { type: 'image_url', image_url: { url: imageDataUrl, detail: 'auto' } },
        ]
      : text.trim()

    const userMsg = { role: 'user', content }
    const nextMessages = trimHistory([...messages, userMsg])
    setMessages(nextMessages)
    setLoading(true)
    setError(null)
    persistMessage(userMsg, conversation.id)

    abortRef.current = new AbortController()

    try {
      const reply = await runAtendimentoTurn(nextMessages, abortRef.current.signal, {
        profile,
        userId: user.id,
        ordemId,
        conversationId: conversation.id,
        onPhaseChange: setPhase,
      })
      const assistantMsg = { role: 'assistant', content: reply.text, ...(reply.actions?.length ? { actions: reply.actions } : {}) }
      setMessages(prev => [...prev, assistantMsg])
      persistMessage(assistantMsg, conversation.id)
      await logEventosFromActions(reply.actions, { conversationId: conversation.id, ordemId, userId: user.id })
    } catch (err) {
      if (err.name === 'AbortError') return
      setError(err.message || 'Erro ao conectar com a IA. Tente novamente.')
    } finally {
      setLoading(false)
      setPhase(null)
    }
  }, [messages, loading, conversation, profile, user, ordemId, persistMessage])

  const cancel = useCallback(() => {
    abortRef.current?.abort()
    setLoading(false)
  }, [])

  const finalizar = useCallback(async () => {
    if (!conversation) return
    await send('Finalize o atendimento. Gere o laudo técnico resumindo o que foi feito nesta sessão, caso ainda não tenha sido gerado.')
    await supabase.from('ai_conversations').update({ status: 'encerrada' }).eq('id', conversation.id)
    setConversation(prev => (prev ? { ...prev, status: 'encerrada' } : prev))
  }, [conversation, send])

  return { conversation, messages, loading, phase, initializing, error, send, cancel, finalizar }
}
