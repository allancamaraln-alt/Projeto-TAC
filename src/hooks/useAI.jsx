import { createContext, useContext, useState, useCallback, useRef } from 'react'
import { useAuth } from './useAuth'
import { supabase } from '../lib/supabase'
import { callClimaPro } from '../lib/ai'
import { trimHistory } from '../lib/openai'

const SESSION_KEY = 'climapro_ai_history'
const CONVERSATION_KEY = 'climapro_ai_conversation_id'

function makeTitulo(text) {
  const limpo = text.replace(/\s+/g, ' ').trim()
  return limpo.length > 60 ? `${limpo.slice(0, 60)}…` : limpo
}

function rowToMessage(row) {
  if (row.role === 'assistant' && row.content && typeof row.content === 'object' && !Array.isArray(row.content)) {
    return { role: 'assistant', content: row.content.text ?? '', ...(row.content.actions?.length ? { actions: row.content.actions } : {}) }
  }
  return { role: row.role, content: row.content }
}

const AIContext = createContext(null)

export function AIProvider({ children }) {
  const { user, profile } = useAuth()
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState(() => {
    try { return JSON.parse(sessionStorage.getItem(SESSION_KEY)) || [] } catch { return [] }
  })
  const [conversationId, setConversationId] = useState(() => sessionStorage.getItem(CONVERSATION_KEY) || null)
  const [loading, setLoading] = useState(false)
  const [phase, setPhase] = useState(null) // 'pensando' | 'executando' | null
  const [error, setError] = useState(null)
  const [activeOrdemId, setActiveOrdemId] = useState(null)
  const abortRef = useRef(null)

  const setActiveOrdem = useCallback((ordemId) => setActiveOrdemId(ordemId), [])
  const clearActiveOrdem = useCallback(() => setActiveOrdemId(null), [])

  const send = useCallback(async (text, imageDataUrl = null) => {
    const hasContent = text?.trim() || imageDataUrl
    if (!hasContent || loading) return

    const content = imageDataUrl
      ? [
          { type: 'text', text: text?.trim() || 'O que você vê nesta imagem? Descreva em relação a ar-condicionado ou refrigeração.' },
          { type: 'image_url', image_url: { url: imageDataUrl, detail: 'auto' } },
        ]
      : text.trim()

    const userMsg = { role: 'user', content }
    const nextMessages = trimHistory([...messages, userMsg])
    setMessages(nextMessages)
    setLoading(true)
    setError(null)

    // Cria a conversa no banco na primeira mensagem (histórico real — ver
    // ChatHistoryPanel.jsx), preservando o comportamento local quando não
    // há usuário autenticado.
    let convId = conversationId
    if (!convId && user?.id) {
      const { data: conv } = await supabase
        .from('ai_conversations')
        .insert({ tecnico_id: user.id, tipo: 'chat', titulo: text?.trim() ? makeTitulo(text.trim()) : 'Conversa com foto' })
        .select()
        .single()
      if (conv) {
        convId = conv.id
        setConversationId(convId)
        sessionStorage.setItem(CONVERSATION_KEY, convId)
      }
    }
    if (convId) supabase.from('ai_messages').insert({ conversation_id: convId, tecnico_id: user.id, role: 'user', content })

    abortRef.current = new AbortController()

    try {
      const reply = await callClimaPro(nextMessages, abortRef.current.signal, {
        profile,
        userId: user?.id,
        activeOrdemId,
        onPhaseChange: setPhase,
      })
      const assistantMsg = { role: 'assistant', content: reply.text, ...(reply.actions?.length ? { actions: reply.actions } : {}) }
      const updated = [...nextMessages, assistantMsg]
      setMessages(updated)

      if (convId) {
        supabase.from('ai_messages').insert({
          conversation_id: convId,
          tecnico_id: user.id,
          role: 'assistant',
          content: { text: assistantMsg.content, actions: assistantMsg.actions || [] },
        })
        supabase.from('ai_conversations').update({ updated_at: new Date().toISOString() }).eq('id', convId)
      }

      // Persiste sem base64 para não estourar sessionStorage
      const storable = updated.map(m => ({
        ...m,
        content: Array.isArray(m.content)
          ? m.content.find(c => c.type === 'text')?.text || '[Imagem]'
          : m.content,
      }))
      sessionStorage.setItem(SESSION_KEY, JSON.stringify(storable))
    } catch (err) {
      if (err.name === 'AbortError') return
      setError(err.message || 'Erro ao conectar com a IA. Tente novamente.')
    } finally {
      setLoading(false)
      setPhase(null)
    }
  }, [messages, loading, profile, user, activeOrdemId, conversationId])

  const clear = useCallback(() => {
    abortRef.current?.abort()
    setMessages([])
    setConversationId(null)
    setError(null)
    setLoading(false)
    sessionStorage.removeItem(SESSION_KEY)
    sessionStorage.removeItem(CONVERSATION_KEY)
  }, [])

  const cancel = useCallback(() => {
    abortRef.current?.abort()
    setLoading(false)
  }, [])

  // Reabre uma conversa antiga a partir do histórico (ChatHistoryPanel.jsx) —
  // troca a sessão atual para continuar exatamente a conversa selecionada.
  const openConversation = useCallback(async (conv) => {
    abortRef.current?.abort()
    const { data: rows } = await supabase
      .from('ai_messages')
      .select('*')
      .eq('conversation_id', conv.id)
      .order('created_at', { ascending: true })

    const loaded = (rows || []).map(rowToMessage)
    setMessages(loaded)
    setConversationId(conv.id)
    setError(null)
    setLoading(false)

    const storable = loaded.map(m => ({
      ...m,
      content: Array.isArray(m.content) ? m.content.find(c => c.type === 'text')?.text || '[Imagem]' : m.content,
    }))
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(storable))
    sessionStorage.setItem(CONVERSATION_KEY, conv.id)
  }, [])

  return (
    <AIContext.Provider value={{
      open, setOpen, messages, loading, phase, error, send, clear, cancel,
      activeOrdemId, setActiveOrdem, clearActiveOrdem,
      conversationId, openConversation,
    }}>
      {children}
    </AIContext.Provider>
  )
}

export function useAI() {
  const ctx = useContext(AIContext)
  if (!ctx) throw new Error('useAI must be used within AIProvider')
  return ctx
}
