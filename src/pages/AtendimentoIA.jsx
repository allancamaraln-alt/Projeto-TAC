import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAtendimento } from '../hooks/useAtendimento'
import ChatMessageList from '../components/ai/ChatMessageList'
import ChatComposer from '../components/ai/ChatComposer'
import AtendimentoTimeline from '../components/ai/AtendimentoTimeline'

function BackIcon({ className }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
    </svg>
  )
}

function TimelineIcon({ className }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
  )
}

function formatElapsed(seconds) {
  const m = Math.floor(seconds / 60).toString().padStart(2, '0')
  const s = Math.floor(seconds % 60).toString().padStart(2, '0')
  return `${m}:${s}`
}

function useElapsedTime(startedAt) {
  const [elapsed, setElapsed] = useState(0)
  useEffect(() => {
    if (!startedAt) return
    const start = new Date(startedAt).getTime()
    const tick = () => setElapsed(Math.max(0, (Date.now() - start) / 1000))
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [startedAt])
  return elapsed
}

// Modo Atendimento IA — narração ao vivo vinculada a uma OS. Tudo que o
// técnico narra vira dado real na hora (financeiro/OS/laudo, via as mesmas
// ferramentas do chat normal) mais um evento na linha do tempo — ver
// src/hooks/useAtendimento.js.
export default function AtendimentoIA() {
  const { id } = useParams()
  const navigate = useNavigate()
  const composerRef = useRef(null)
  const [osResumo, setOsResumo] = useState(null)
  const [finalizando, setFinalizando] = useState(false)
  const [showTimeline, setShowTimeline] = useState(false)
  const { conversation, messages, loading, phase, initializing, error, send, cancel, finalizar } = useAtendimento(id)
  const elapsed = useElapsedTime(conversation?.created_at)

  useEffect(() => {
    supabase
      .from('ordens_servico')
      .select('numero, tipo_servico, clientes(nome)')
      .eq('id', id)
      .single()
      .then(({ data }) => setOsResumo(data))
  }, [id])

  async function handleFinalizar() {
    setFinalizando(true)
    await finalizar()
    setFinalizando(false)
    navigate(`/ordens/${id}`)
  }

  if (initializing) {
    return (
      <div className="fixed inset-0 z-[200] flex items-center justify-center bg-gray-50">
        <span className="w-7 h-7 border-[3px] border-gray-200 border-t-sky-500 rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="fixed inset-0 z-[200] flex flex-col bg-gray-50">
      {/* Header */}
      <div
        className="relative overflow-hidden flex items-center gap-3 px-4 shrink-0"
        style={{
          background: 'linear-gradient(135deg, rgb(var(--ac)) 0%, rgb(var(--ac-dk)) 100%)',
          paddingTop: 'max(16px, env(safe-area-inset-top))',
          paddingBottom: '12px',
        }}
      >
        <div className="absolute -top-6 -right-6 w-28 h-28 rounded-full bg-white opacity-5 pointer-events-none" />
        <div className="absolute bottom-0 left-12 w-16 h-16 rounded-full bg-white opacity-5 pointer-events-none" />
        <button
          onClick={() => navigate(`/ordens/${id}`)}
          aria-label="Voltar"
          className="relative text-white p-2 -ml-2 rounded-full hover:bg-white/10 active:bg-white/20 transition-colors"
        >
          <BackIcon className="w-5 h-5" />
        </button>
        <div className="relative flex-1 min-w-0">
          <p className="text-white font-bold text-sm leading-tight truncate">
            Atendimento · {osResumo?.clientes?.nome || '...'}
          </p>
          <p className="text-white/70 text-xs flex items-center gap-1.5 mt-0.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-300 animate-pulse" />
            {formatElapsed(elapsed)}
          </p>
        </div>
        <button
          onClick={() => setShowTimeline(v => !v)}
          aria-label="Linha do tempo"
          className={`relative p-2 rounded-full transition-colors ${showTimeline ? 'bg-white/25' : 'hover:bg-white/10'}`}
        >
          <TimelineIcon className="w-5 h-5 text-white" />
        </button>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto px-4 py-4">
        {showTimeline ? (
          <AtendimentoTimeline conversationId={conversation?.id} refreshKey={messages.length} />
        ) : messages.length === 0 ? (
          <div className="text-center pt-10">
            <p className="text-4xl mb-3">🎙️</p>
            <p className="font-semibold text-gray-600">Narre o atendimento normalmente</p>
            <p className="text-sm text-gray-400 mt-2 max-w-xs mx-auto leading-relaxed">
              "Cheguei no cliente", "troquei um capacitor de 45uF", "cliente pagou R$380 via Pix"...
              tudo é registrado automaticamente enquanto você trabalha.
            </p>
          </div>
        ) : (
          <ChatMessageList messages={messages} loading={loading} phase={phase} error={error} />
        )}
      </div>

      {/* Finalizar */}
      <div className="shrink-0 px-3 pt-1">
        <button
          onClick={handleFinalizar}
          disabled={finalizando || loading || conversation?.status === 'encerrada'}
          className="w-full py-2.5 rounded-xl text-sm font-semibold border-2 active:scale-95 transition-transform disabled:opacity-60"
          style={{ borderColor: 'rgb(var(--ac-lt))', color: 'rgb(var(--ac))' }}
        >
          {finalizando ? 'Finalizando atendimento...' : conversation?.status === 'encerrada' ? '✅ Atendimento finalizado' : '🏁 Finalizar Atendimento'}
        </button>
      </div>

      {/* Input */}
      <div
        className="shrink-0 bg-white border-t border-gray-100 px-3 pt-2 mt-3"
        style={{ paddingBottom: 'max(10px, env(safe-area-inset-bottom))' }}
      >
        <ChatComposer ref={composerRef} send={send} loading={loading} cancel={cancel} />
      </div>
    </div>
  )
}
