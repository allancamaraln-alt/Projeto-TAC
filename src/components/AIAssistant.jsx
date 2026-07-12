import { useCallback, useRef } from 'react'
import { useLocation } from 'react-router-dom'
import { useAI } from '../hooks/useAI'
import { useAuth } from '../hooks/useAuth'
import GreetingHero from './ai/GreetingHero'
import QuickActionChips from './ai/QuickActionChips'
import ChatMessageList from './ai/ChatMessageList'
import ChatComposer from './ai/ChatComposer'
import AddonUpsell from './ai/AddonUpsell'
import { SparklesIcon } from './ai/icons'

// Chrome do modal do ClimaPro IA (FAB + painel de tela cheia), usado a
// partir de qualquer rota que não seja a Home (que já é o chat em si —
// ver src/pages/ChatHome.jsx). Todo o conteúdo do chat (saudação, chips,
// lista de mensagens, composer) é composto a partir dos mesmos componentes
// compartilhados em src/components/ai/, garantindo que uma conversa iniciada
// na Home seja exatamente a mesma vista aqui.
export default function AIAssistant() {
  const { open, setOpen, messages, loading, phase, error, send, clear } = useAI()
  const { profile, hasAiAssistant } = useAuth()
  const location = useLocation()
  const composerRef = useRef(null)

  const firstName = profile?.nome?.split(' ')[0] || null
  const isChatTab = location.pathname === '/chat'

  const handleQuickAction = useCallback((action) => {
    if (action.type === 'photo') { composerRef.current?.openGallery(); return }
    if (action.type === 'voice') { composerRef.current?.startVoice(); return }
    if (action.autoSend) { send(action.prompt); return }
    composerRef.current?.prefill(action.prompt)
  }, [send])

  return (
    <>
      {!open && !isChatTab && (
        <button
          onClick={() => setOpen(true)}
          aria-label="Abrir ClimaPro IA"
          className="fixed bottom-20 right-4 z-[100] w-14 h-14 rounded-full shadow-xl flex items-center justify-center text-white transition-transform active:scale-95 focus:outline-none"
          style={{ background: 'linear-gradient(135deg, rgb(var(--ac)) 0%, rgb(var(--ac-dk)) 100%)' }}
        >
          <SparklesIcon className="w-6 h-6" />
          {messages.length > 0 && (
            <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-emerald-500 rounded-full border-2 border-white" />
          )}
        </button>
      )}

      {open && !hasAiAssistant && <AddonUpsell onClose={() => setOpen(false)} />}

      {open && hasAiAssistant && (
        <div className="fixed inset-0 z-[200] flex flex-col bg-gray-50">
          {/* Header */}
          <div
            className="flex items-center gap-3 px-4 shrink-0"
            style={{
              background: 'linear-gradient(135deg, rgb(var(--ac)) 0%, rgb(var(--ac-dk)) 100%)',
              paddingTop: 'max(16px, env(safe-area-inset-top))',
              paddingBottom: '12px',
            }}
          >
            <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center">
              <SparklesIcon className="w-5 h-5 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white font-bold text-sm leading-tight">ClimaPro IA</p>
              <p className="text-white/70 text-xs">Técnico · Financeiro</p>
            </div>
            <button
              onClick={clear}
              aria-label="Limpar conversa"
              className="text-white/70 p-2 rounded-full hover:bg-white/10 active:bg-white/20 transition-colors"
            >
              <svg className="w-4.5 h-4.5" width={18} height={18} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
            <button
              onClick={() => setOpen(false)}
              aria-label="Fechar"
              className="text-white p-2 rounded-full hover:bg-white/10 active:bg-white/20 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto overscroll-contain px-4 py-4">
            {messages.length === 0 ? (
              <>
                <GreetingHero firstName={firstName} />
                <QuickActionChips variant="grid" onQuickAction={handleQuickAction} />
              </>
            ) : (
              <ChatMessageList messages={messages} loading={loading} phase={phase} error={error} />
            )}
          </div>

          {/* Quick actions strip */}
          {messages.length > 0 && !loading && (
            <div className="shrink-0 px-3 pb-2 overflow-x-auto">
              <QuickActionChips variant="strip" onQuickAction={handleQuickAction} />
            </div>
          )}

          {/* Input */}
          <div
            className="shrink-0 bg-white border-t border-gray-100 px-3 pt-2"
            style={{ paddingBottom: 'max(10px, env(safe-area-inset-bottom))' }}
          >
            <ChatComposer ref={composerRef} />
          </div>
        </div>
      )}
    </>
  )
}
