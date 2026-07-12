import { useCallback, useRef } from 'react'
import { useAI } from '../hooks/useAI'
import { useAuth } from '../hooks/useAuth'
import GreetingHero from '../components/ai/GreetingHero'
import QuickActionChips from '../components/ai/QuickActionChips'
import ChatMessageList from '../components/ai/ChatMessageList'
import ChatComposer from '../components/ai/ChatComposer'
import AddonUpsell from '../components/ai/AddonUpsell'

// Aba "Chat" da barra inferior — conversa em tela cheia estilo ChatGPT.
// A Home ("/") continua sendo o Painel (ver src/pages/Painel.jsx).
export default function ChatHome() {
  const { messages, loading, phase, error, send } = useAI()
  const { profile, hasAiAssistant } = useAuth()
  const composerRef = useRef(null)

  const firstName = profile?.nome?.split(' ')[0] || null

  const handleQuickAction = useCallback((action) => {
    if (action.type === 'photo') { composerRef.current?.openGallery(); return }
    if (action.type === 'voice') { composerRef.current?.startVoice(); return }
    if (action.autoSend) { send(action.prompt); return }
    composerRef.current?.prefill(action.prompt)
  }, [send])

  if (!hasAiAssistant) {
    return (
      <div style={{ height: '100%', overflowY: 'auto' }} className="max-w-md mx-auto bg-gray-50 pb-24">
        <AddonUpsell fixed={false} />
      </div>
    )
  }

  return (
    <div style={{ height: '100%' }} className="max-w-md mx-auto bg-slate-50 flex flex-col">
      <div className="flex-1 overflow-y-auto px-4 pt-6">
        {messages.length === 0 ? (
          <>
            <GreetingHero firstName={firstName} />
            <QuickActionChips variant="grid" onQuickAction={handleQuickAction} />
          </>
        ) : (
          <ChatMessageList messages={messages} loading={loading} phase={phase} error={error} />
        )}
      </div>

      <div className="shrink-0">
        {messages.length > 0 && !loading && (
          <div className="px-3 pb-2 overflow-x-auto">
            <QuickActionChips variant="strip" onQuickAction={handleQuickAction} />
          </div>
        )}
        <div className="px-3 pt-2 pb-24">
          <ChatComposer ref={composerRef} />
        </div>
      </div>
    </div>
  )
}
