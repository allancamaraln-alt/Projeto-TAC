import { useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAI } from '../hooks/useAI'
import { useAuth } from '../hooks/useAuth'
import GreetingHero from '../components/ai/GreetingHero'
import QuickActionChips from '../components/ai/QuickActionChips'
import ChatMessageList from '../components/ai/ChatMessageList'
import ChatComposer from '../components/ai/ChatComposer'
import AddonUpsell from '../components/ai/AddonUpsell'

function PainelIcon({ className }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.5V21h6v-7.5H3zM9 3v18h6V3H9zM15 9v12h6V9h-6z" />
    </svg>
  )
}

// Nova Home do ClimaPro — estilo ChatGPT: a conversa É a tela inicial.
// O antigo Dashboard (estatísticas da semana, revisões, OS recentes) migrou
// para /painel (ver src/pages/Painel.jsx), acessível pelo ícone no topo.
export default function ChatHome() {
  const { messages, loading, phase, error, send } = useAI()
  const { profile, hasAiAssistant } = useAuth()
  const navigate = useNavigate()
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
        <div className="flex justify-end mb-2">
          <button
            onClick={() => navigate('/painel')}
            aria-label="Ver painel"
            className="shrink-0 w-9 h-9 rounded-xl bg-white border border-gray-100 shadow-sm flex items-center justify-center text-gray-500 active:scale-95 transition-transform"
          >
            <PainelIcon className="w-[18px] h-[18px]" />
          </button>
        </div>

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
