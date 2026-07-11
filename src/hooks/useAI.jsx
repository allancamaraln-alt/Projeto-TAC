import { createContext, useContext, useState, useCallback, useRef } from 'react'
import { useAuth } from './useAuth'
import { callClimaPro } from '../lib/ai'
import { trimHistory } from '../lib/openai'

const SESSION_KEY = 'climapro_ai_history'

const AIContext = createContext(null)

export function AIProvider({ children }) {
  const { user, profile } = useAuth()
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState(() => {
    try { return JSON.parse(sessionStorage.getItem(SESSION_KEY)) || [] } catch { return [] }
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const abortRef = useRef(null)

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

    abortRef.current = new AbortController()

    try {
      const reply = await callClimaPro(nextMessages, abortRef.current.signal, {
        profile,
        userId: user?.id,
      })
      const assistantMsg = { role: 'assistant', content: reply }
      const updated = [...nextMessages, assistantMsg]
      setMessages(updated)

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
    }
  }, [messages, loading, profile, user])

  const clear = useCallback(() => {
    abortRef.current?.abort()
    setMessages([])
    setError(null)
    setLoading(false)
    sessionStorage.removeItem(SESSION_KEY)
  }, [])

  const cancel = useCallback(() => {
    abortRef.current?.abort()
    setLoading(false)
  }, [])

  return (
    <AIContext.Provider value={{ open, setOpen, messages, loading, error, send, clear, cancel }}>
      {children}
    </AIContext.Provider>
  )
}

export function useAI() {
  const ctx = useContext(AIContext)
  if (!ctx) throw new Error('useAI must be used within AIProvider')
  return ctx
}
