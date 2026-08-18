import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'
import { useAI } from '../../hooks/useAI'
import { formatDateTime } from '../../lib/format'
import { CloseIcon, ClockIcon } from './icons'

// Painel de histórico de conversas do Chat — lista as conversas persistidas
// em ai_conversations (tipo='chat', ver supabase/schema.sql) e permite
// reabrir qualquer uma delas via useAI().openConversation.
export default function ChatHistoryPanel({ onClose }) {
  const { user } = useAuth()
  const { conversationId, openConversation } = useAI()
  const [conversas, setConversas] = useState(null)

  useEffect(() => {
    if (!user?.id) return
    let cancelled = false
    supabase
      .from('ai_conversations')
      .select('id, titulo, updated_at')
      .eq('tecnico_id', user.id)
      .eq('tipo', 'chat')
      .order('updated_at', { ascending: false })
      .limit(50)
      .then(({ data }) => { if (!cancelled) setConversas(data || []) })
    return () => { cancelled = true }
  }, [user?.id])

  async function handleSelect(conv) {
    await openConversation(conv)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-[250] flex flex-col bg-gray-50">
      <div
        className="flex items-center gap-3 px-4 shrink-0 border-b border-gray-100 bg-white"
        style={{ paddingTop: 'max(16px, env(safe-area-inset-top))', paddingBottom: '12px' }}
      >
        <ClockIcon className="w-5 h-5 text-gray-500 shrink-0" />
        <p className="flex-1 font-bold text-[15px] text-gray-900">Histórico de conversas</p>
        <button
          onClick={onClose}
          aria-label="Fechar"
          className="text-gray-500 p-2 -mr-2 rounded-full hover:bg-gray-100 active:bg-gray-200 transition-colors"
        >
          <CloseIcon className="w-5 h-5" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4">
        {conversas === null ? (
          <div className="flex justify-center pt-10">
            <span className="w-6 h-6 border-[3px] border-gray-200 border-t-sky-500 rounded-full animate-spin" />
          </div>
        ) : conversas.length === 0 ? (
          <div className="text-center pt-10">
            <ClockIcon className="w-10 h-10 text-gray-300 mx-auto mb-3" />
            <p className="font-semibold text-gray-600">Nenhuma conversa ainda</p>
            <p className="text-sm text-gray-400 mt-1">Suas conversas com a IA vão aparecer aqui.</p>
          </div>
        ) : (
          <ul className="space-y-2">
            {conversas.map(conv => (
              <li key={conv.id}>
                <button
                  onClick={() => handleSelect(conv)}
                  className={`w-full text-left bg-white rounded-2xl px-4 py-3 border transition-colors active:scale-[0.99] ${
                    conv.id === conversationId ? 'border-sky-300 ac-bg-lt' : 'border-gray-100 hover:border-gray-200'
                  }`}
                >
                  <p className="font-semibold text-[14px] text-gray-900 truncate">
                    {conv.titulo || 'Conversa sem título'}
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5">{formatDateTime(conv.updated_at)}</p>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
