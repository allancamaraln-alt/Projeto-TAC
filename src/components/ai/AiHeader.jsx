import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { SnowflakeIcon, ClockIcon, TrashIcon, CloseIcon } from './icons'
import StatusBadge from './StatusBadge'
import ChatHistoryPanel from './ChatHistoryPanel'
import { useAI } from '../../hooks/useAI'

// Cabeçalho da aba "Chat" em tela cheia (ver ChatHome.jsx) — ver
// especificação técnica, seção 4.1. Logo (floco de neve + wordmark
// bicolor) + StatusBadge + histórico/limpar/fechar. O modal do AIAssistant
// (usado nas outras abas) já tem seu próprio cabeçalho com o StatusBadge,
// então este componente não é reutilizado lá.
export default function AiHeader() {
  const navigate = useNavigate()
  const { messages, clear } = useAI()
  const [showHistory, setShowHistory] = useState(false)
  // navigator.onLine mede a conexão do navegador, não se o backend da IA
  // está de fato respondendo — é um proxy imperfeito, mas melhor que um
  // badge sempre fixo em "Online".
  const [online, setOnline] = useState(navigator.onLine)

  useEffect(() => {
    const on = () => setOnline(true)
    const off = () => setOnline(false)
    window.addEventListener('online', on)
    window.addEventListener('offline', off)
    return () => {
      window.removeEventListener('online', on)
      window.removeEventListener('offline', off)
    }
  }, [])

  return (
    <>
      <div className="flex items-center justify-between px-6 pt-4 pb-1 shrink-0">
        <div className="flex items-center gap-2">
          <SnowflakeIcon className="w-7 h-7 text-[#1E63C9]" />
          <span className="font-extrabold text-[17px] tracking-tight">
            <span className="text-gray-900">Clima</span>
            <span className="text-[#1E63C9]">Pro</span>
          </span>
        </div>

        <div className="flex items-center gap-2.5">
          <StatusBadge
            label={online ? 'IA Online' : 'IA Offline'}
            dotClassName={online ? 'bg-emerald-500' : 'bg-gray-400'}
          />
          <button
            onClick={() => setShowHistory(true)}
            aria-label="Histórico de conversas"
            className="text-gray-800 active:scale-90 transition-transform"
          >
            <ClockIcon className="w-6 h-6" />
          </button>
          {messages.length > 0 && (
            <button
              onClick={clear}
              aria-label="Limpar conversa"
              className="text-gray-800 active:scale-90 transition-transform"
            >
              <TrashIcon className="w-6 h-6" />
            </button>
          )}
          <button
            onClick={() => navigate('/')}
            aria-label="Fechar conversa"
            className="text-gray-800 active:scale-90 transition-transform"
          >
            <CloseIcon className="w-6 h-6" />
          </button>
        </div>
      </div>

      {showHistory && <ChatHistoryPanel onClose={() => setShowHistory(false)} />}
    </>
  )
}
