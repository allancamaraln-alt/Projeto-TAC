import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAI } from '../hooks/useAI'
import { useAuth } from '../hooks/useAuth'
import { QUICK_ACTIONS, extractOSData, stripOSData, extractLaudoData, stripLaudoData } from '../lib/openai'
import { supabase } from '../lib/supabase'
import { compartilharLaudo } from '../lib/pdf'

function SparklesIcon({ className }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
    </svg>
  )
}

function MicIcon({ active, className }) {
  return (
    <svg className={className} fill={active ? 'currentColor' : 'none'} viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 01-3-3V4.5a3 3 0 116 0v8.25a3 3 0 01-3 3z" />
    </svg>
  )
}

function SendIcon({ className }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.269 20.876L5.999 12zm0 0h7.5" />
    </svg>
  )
}

function CopyIcon({ className }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
    </svg>
  )
}

function PlusIcon({ className }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
    </svg>
  )
}

function CameraIcon({ className }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0zM18.75 10.5h.008v.008h-.008V10.5z" />
    </svg>
  )
}

function StickerIcon({ className }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.182 15.182a4.5 4.5 0 01-6.364 0M21 12a9 9 0 11-18 0 9 9 0 0118 0zM9.75 9.75c0 .414-.168.75-.375.75S9 10.164 9 9.75 9.168 9 9.375 9s.375.336.375.75zm-.375 0h.008v.015h-.008V9.75zm5.625 0c0 .414-.168.75-.375.75s-.375-.336-.375-.75.168-.75.375-.75.375.336.375.75zm-.375 0h.008v.015h-.008V9.75z" />
    </svg>
  )
}

async function compressImage(file) {
  return new Promise((resolve) => {
    const img = new Image()
    const url = URL.createObjectURL(file)
    img.onload = () => {
      const MAX = 1024
      const ratio = Math.min(1, MAX / Math.max(img.width, img.height))
      const canvas = document.createElement('canvas')
      canvas.width = Math.round(img.width * ratio)
      canvas.height = Math.round(img.height * ratio)
      canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height)
      URL.revokeObjectURL(url)
      resolve(canvas.toDataURL('image/jpeg', 0.75))
    }
    img.src = url
  })
}

// ── Dashboard stats ───────────────────────────────────────
async function fetchDashboardStats(userId) {
  const today = new Date().toISOString().split('T')[0]
  const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1)
    .toISOString().split('T')[0]

  const [osHojeRes, pendentesRes, mesRes] = await Promise.all([
    supabase
      .from('ordens_servico')
      .select('id', { count: 'exact', head: true })
      .eq('tecnico_id', userId)
      .eq('data_agendamento', today)
      .neq('status', 'cancelado'),
    supabase
      .from('ordens_servico')
      .select('valor')
      .eq('tecnico_id', userId)
      .in('status', ['orcamento', 'aprovado', 'em_andamento']),
    supabase
      .from('ordens_servico')
      .select('valor')
      .eq('tecnico_id', userId)
      .eq('status', 'concluido')
      .gte('created_at', startOfMonth),
  ])

  const aReceber = (pendentesRes.data || []).reduce((s, o) => s + Number(o.valor || 0), 0)
  const receitaMes = (mesRes.data || []).reduce((s, o) => s + Number(o.valor || 0), 0)

  return {
    osHoje: osHojeRes.count ?? 0,
    pendentes: pendentesRes.data?.length ?? 0,
    aReceber,
    receitaMes,
  }
}

function getGreeting() {
  const h = new Date().getHours()
  if (h < 12) return 'Bom dia'
  if (h < 18) return 'Boa tarde'
  return 'Boa noite'
}

function formatCompact(value) {
  if (value === 0) return 'R$ 0'
  if (value >= 1000) {
    const k = value / 1000
    const n = k % 1 === 0 ? k : parseFloat(k.toFixed(1))
    return `R$ ${String(n).replace('.', ',')}k`
  }
  return `R$ ${Math.round(value).toLocaleString('pt-BR')}`
}

function StatChip({ label, value, loading }) {
  return (
    <div className="flex-1 min-w-0 bg-white rounded-2xl p-3 border border-gray-100 shadow-sm">
      {loading ? (
        <div className="h-5 w-10 bg-gray-100 rounded-md animate-pulse mb-1.5" />
      ) : (
        <p className="text-[15px] font-bold text-gray-900 leading-none tabular-nums truncate">{value}</p>
      )}
      <p className="text-[11px] text-gray-400 mt-1.5 leading-tight">{label}</p>
    </div>
  )
}

function OSCreateButton({ osData }) {
  const [status, setStatus] = useState('idle')
  const [errorMsg, setErrorMsg] = useState('')
  const [clienteCriado, setClienteCriado] = useState(false)
  const { user } = useAuth()
  const { setOpen } = useAI()
  const navigate = useNavigate()

  const handleCreate = useCallback(async () => {
    setStatus('loading')
    setErrorMsg('')
    setClienteCriado(false)

    const { data: clientes, error: fetchError } = await supabase
      .from('clientes')
      .select('id, nome')
      .eq('tecnico_id', user.id)

    if (fetchError) { setStatus('error'); setErrorMsg('Erro ao buscar clientes.'); return }

    const termo = (osData.cliente_nome || '').toLowerCase().trim()
    let cliente = clientes?.find(c => {
      const cn = c.nome.toLowerCase()
      return cn.includes(termo) || termo.includes(cn)
    })

    if (!cliente) {
      const { data: novoCliente, error: clienteError } = await supabase
        .from('clientes')
        .insert({ tecnico_id: user.id, nome: osData.cliente_nome, telefone: '', endereco: '' })
        .select()
        .single()

      if (clienteError) { setStatus('error'); setErrorMsg('Erro ao criar o cliente. Tente novamente.'); return }
      cliente = novoCliente
      setClienteCriado(true)
    }

    const { data: os, error: insertError } = await supabase
      .from('ordens_servico')
      .insert({
        tecnico_id: user.id,
        cliente_id: cliente.id,
        tipo_servico: osData.tipo_servico || 'Outro',
        descricao: osData.descricao || '',
        valor: parseFloat(osData.valor) || 0,
        data_agendamento: osData.data_agendamento || null,
        hora_agendamento: osData.hora_agendamento || null,
        observacoes: osData.observacoes || '',
        status: osData.status || 'orcamento',
      })
      .select()
      .single()

    if (insertError) { setStatus('error'); setErrorMsg('Erro ao criar OS. Tente novamente.'); return }

    setStatus('success')
    setTimeout(() => { setOpen(false); navigate(`/ordens/${os.id}`) }, 900)
  }, [osData, user, setOpen, navigate])

  if (status === 'success') {
    return (
      <div className="mt-2">
        <p className="text-xs text-green-600 font-semibold">✅ OS criada! Abrindo...</p>
        {clienteCriado && (
          <p className="text-xs text-amber-600 mt-1">⚠️ Cliente criado automaticamente — lembre de adicionar telefone e endereço.</p>
        )}
      </div>
    )
  }

  return (
    <div className="mt-3">
      {errorMsg && <p className="text-xs text-red-500 mb-2">{errorMsg}</p>}
      <button
        onClick={handleCreate}
        disabled={status === 'loading'}
        className="w-full py-2.5 px-4 rounded-xl text-sm font-semibold text-white flex items-center justify-center gap-2 disabled:opacity-60 active:scale-95 transition-transform"
        style={{ background: 'rgb(var(--ac))' }}
      >
        {status === 'loading' ? (
          <>
            <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            Criando OS...
          </>
        ) : '📋 Criar OS automaticamente'}
      </button>
    </div>
  )
}

function LaudoButton({ laudoData }) {
  const [status, setStatus] = useState('idle')
  const [errorMsg, setErrorMsg] = useState('')
  const { profile } = useAuth()

  const handleGerar = useCallback(async () => {
    setStatus('loading')
    setErrorMsg('')
    try {
      await compartilharLaudo({ laudo: laudoData, tecnico: profile })
      setStatus('success')
      setTimeout(() => setStatus('idle'), 3000)
    } catch {
      setStatus('error')
      setErrorMsg('Erro ao gerar o PDF. Tente novamente.')
    }
  }, [laudoData, profile])

  if (status === 'success') {
    return <p className="mt-2 text-xs text-green-600 font-semibold">✅ Laudo gerado com sucesso!</p>
  }

  return (
    <div className="mt-3">
      {errorMsg && <p className="text-xs text-red-500 mb-2">{errorMsg}</p>}
      <button
        onClick={handleGerar}
        disabled={status === 'loading'}
        className="w-full py-2.5 px-4 rounded-xl text-sm font-semibold text-white flex items-center justify-center gap-2 disabled:opacity-60 active:scale-95 transition-transform"
        style={{ background: 'rgb(var(--ac))' }}
      >
        {status === 'loading' ? (
          <>
            <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            Gerando PDF...
          </>
        ) : '📄 Baixar Laudo em PDF'}
      </button>
    </div>
  )
}

function getTextContent(content) {
  if (typeof content === 'string') return content
  if (Array.isArray(content)) return content.find(c => c.type === 'text')?.text ?? ''
  return ''
}

function getImageContent(content) {
  if (!Array.isArray(content)) return null
  return content.find(c => c.type === 'image_url')?.image_url?.url ?? null
}

function MessageBubble({ msg }) {
  const isUser = msg.role === 'user'
  const [copied, setCopied] = useState(false)

  const textContent = getTextContent(msg.content)
  const imageUrl = isUser ? getImageContent(msg.content) : null

  const osData = !isUser ? extractOSData(textContent) : null
  const laudoData = !isUser && !osData ? extractLaudoData(textContent) : null
  const displayContent = osData
    ? stripOSData(textContent)
    : laudoData
      ? stripLaudoData(textContent)
      : textContent

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(displayContent)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // clipboard not available
    }
  }, [displayContent])

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-3 group`}>
      {!isUser && (
        <div className="w-7 h-7 rounded-full flex items-center justify-center mr-2 shrink-0 mt-0.5 shadow-sm"
          style={{ background: 'linear-gradient(135deg, rgb(var(--ac)) 0%, rgb(var(--ac-dk)) 100%)' }}>
          <SparklesIcon className="w-3.5 h-3.5 text-white" />
        </div>
      )}
      <div className="max-w-[82%] relative">
        <div
          className={`rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed whitespace-pre-wrap break-words ${
            isUser
              ? 'text-white rounded-br-sm'
              : 'bg-white text-gray-800 rounded-bl-sm shadow-sm border border-gray-100'
          }`}
          style={isUser ? { background: 'rgb(var(--ac))' } : {}}
        >
          {imageUrl && (
            <img
              src={imageUrl}
              alt="imagem enviada"
              className="rounded-xl mb-2 max-h-56 w-auto object-cover"
            />
          )}
          {displayContent && <span>{displayContent}</span>}
          {osData && <OSCreateButton osData={osData} />}
          {laudoData && <LaudoButton laudoData={laudoData} />}
        </div>
        {!isUser && (
          <button
            onClick={handleCopy}
            className="absolute -bottom-5 right-0 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 text-[10px] text-gray-400 hover:text-gray-600"
          >
            <CopyIcon className="w-3 h-3" />
            {copied ? 'Copiado!' : 'Copiar'}
          </button>
        )}
      </div>
    </div>
  )
}

function TypingIndicator() {
  return (
    <div className="flex items-center gap-2 mb-3">
      <div className="w-7 h-7 rounded-full flex items-center justify-center shrink-0 shadow-sm"
        style={{ background: 'linear-gradient(135deg, rgb(var(--ac)) 0%, rgb(var(--ac-dk)) 100%)' }}>
        <SparklesIcon className="w-3.5 h-3.5 text-white" />
      </div>
      <div className="bg-white rounded-2xl rounded-bl-sm px-4 py-3 shadow-sm border border-gray-100">
        <div className="flex gap-1">
          <span className="w-2 h-2 bg-gray-300 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
          <span className="w-2 h-2 bg-gray-300 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
          <span className="w-2 h-2 bg-gray-300 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
        </div>
      </div>
    </div>
  )
}

function SmartEmptyState({ firstName, onQuickAction }) {
  const { user } = useAuth()
  const [stats, setStats] = useState(null)
  const [loadingStats, setLoadingStats] = useState(true)

  useEffect(() => {
    if (!user?.id) return
    setLoadingStats(true)
    fetchDashboardStats(user.id)
      .then(setStats)
      .catch(() => setStats(null))
      .finally(() => setLoadingStats(false))
  }, [user?.id])

  const greeting = getGreeting()
  const now = new Date()
  const dayName = now.toLocaleDateString('pt-BR', { weekday: 'long' })
  const dateLabel = `${dayName.charAt(0).toUpperCase()}${dayName.slice(1)}, ${now.toLocaleDateString('pt-BR', { day: 'numeric', month: 'long' })}`

  let insight = null
  if (stats && !loadingStats) {
    if (stats.osHoje > 0) {
      insight = {
        icon: '📅',
        text: stats.osHoje === 1 ? '1 OS agendada para hoje' : `${stats.osHoje} OS agendadas para hoje`,
        isAccent: true,
      }
    } else if (stats.pendentes > 0) {
      insight = {
        icon: '💳',
        text: `${formatCompact(stats.aReceber)} a receber — ${stats.pendentes} OS pendente${stats.pendentes !== 1 ? 's' : ''}`,
        isAccent: false,
      }
    }
  }

  return (
    <div className="flex flex-col pt-2 pb-4">
      {/* Greeting */}
      <div className="mb-4">
        <h2 className="text-[22px] font-bold text-gray-900 leading-tight tracking-tight">
          {greeting}{firstName ? `, ${firstName}` : ''}.
        </h2>
        <p className="text-sm text-gray-400 mt-0.5">{dateLabel}</p>
      </div>

      {/* Stats strip — dados reais do negócio */}
      <div className="flex gap-2 mb-4">
        <StatChip label="OS hoje" value={String(stats?.osHoje ?? 0)} loading={loadingStats} />
        <StatChip label="A receber" value={stats ? formatCompact(stats.aReceber) : '—'} loading={loadingStats} />
        <StatChip label="No mês" value={stats ? formatCompact(stats.receitaMes) : '—'} loading={loadingStats} />
      </div>

      {/* Insight proativo — aparece apenas quando há algo acionável */}
      {insight && (
        <div
          className="flex items-center gap-2.5 rounded-2xl px-3.5 py-2.5 mb-4 border"
          style={insight.isAccent ? {
            backgroundColor: 'rgb(var(--ac) / 0.07)',
            borderColor: 'rgb(var(--ac) / 0.2)',
          } : {
            backgroundColor: '#fffbeb',
            borderColor: '#fde68a',
          }}
        >
          <span className="text-sm">{insight.icon}</span>
          <p
            className="text-sm font-medium leading-snug"
            style={{ color: insight.isAccent ? 'rgb(var(--ac-dk))' : '#92400e' }}
          >
            {insight.text}
          </p>
        </div>
      )}

      {/* Ações rápidas */}
      <p className="text-[11px] font-semibold uppercase tracking-widest text-gray-400 mb-3">
        O que você precisa?
      </p>
      <div className="grid grid-cols-2 gap-2">
        {QUICK_ACTIONS.map((action) => {
          const spaceIdx = action.label.indexOf(' ')
          const icon = spaceIdx > -1 ? action.label.slice(0, spaceIdx) : action.label
          const title = spaceIdx > -1 ? action.label.slice(spaceIdx + 1) : ''
          return (
            <button
              key={action.label}
              onClick={() => onQuickAction(action)}
              className="text-left p-3.5 bg-white rounded-2xl border border-gray-100 shadow-sm active:scale-[0.97] transition-transform"
            >
              <span className="text-xl block mb-2">{icon}</span>
              <span className="text-[13px] font-medium text-gray-800 leading-snug block">{title}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

export default function AIAssistant() {
  const { open, setOpen, messages, loading, error, send, clear, cancel } = useAI()
  const { profile } = useAuth()
  const [input, setInput] = useState('')
  const [listening, setListening] = useState(false)
  const [voiceError, setVoiceError] = useState(null)
  const [pendingImage, setPendingImage] = useState(null)
  const messagesEndRef = useRef(null)
  const inputRef = useRef(null)
  const recognitionRef = useRef(null)
  const sendRef = useRef(send)
  const galleryInputRef = useRef(null)
  const cameraInputRef = useRef(null)
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
  const supportsVoice = !!SpeechRecognition

  useEffect(() => { sendRef.current = send }, [send])

  useEffect(() => {
    if (!open) return
    const timer = setTimeout(() => inputRef.current?.focus(), 350)
    return () => clearTimeout(timer)
  }, [open])

  // Solicita mic + câmera automaticamente na primeira abertura
  useEffect(() => {
    if (!open) return
    const request = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false })
        stream.getTracks().forEach(t => t.stop())
      } catch {
        // usuário negou ou não há mic — o botão já mostra o erro ao clicar
      }
    }
    navigator.permissions?.query({ name: 'microphone' })
      .then(p => { if (p.state === 'prompt') request() })
      .catch(() => request()) // fallback: tenta pedir direto se a API não suportar query
  }, [open])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  useEffect(() => {
    const ta = inputRef.current
    if (!ta) return
    ta.style.height = 'auto'
    ta.style.height = Math.min(ta.scrollHeight, 128) + 'px'
  }, [input])

  const toggleVoice = useCallback(() => {
    if (!SpeechRecognition) return

    if (listening) {
      recognitionRef.current?.abort()
      setListening(false)
      return
    }

    // Cria nova instância a cada gravação (evita bugs de reutilização)
    const rec = new SpeechRecognition()
    rec.lang = 'pt-BR'
    rec.continuous = false
    rec.interimResults = false

    rec.onresult = (e) => {
      const transcript = e.results[0][0].transcript
      setListening(false)
      setVoiceError(null)
      if (transcript.trim()) sendRef.current(transcript.trim())
    }

    rec.onend = () => setListening(false)

    rec.onerror = (e) => {
      setListening(false)
      const msgs = {
        'not-allowed': 'Permissão de microfone negada. Habilite nas configurações do navegador.',
        'no-speech':   'Nenhuma fala detectada. Tente novamente.',
        'audio-capture': 'Microfone não encontrado.',
        'network':     'Erro de rede ao processar voz.',
      }
      setVoiceError(msgs[e.error] || `Erro: ${e.error}`)
      setTimeout(() => setVoiceError(null), 4000)
    }

    recognitionRef.current = rec

    try {
      rec.start()
      setListening(true)
      setVoiceError(null)
    } catch {
      setVoiceError('Não foi possível acessar o microfone.')
      setTimeout(() => setVoiceError(null), 3000)
    }
  }, [listening, SpeechRecognition])

  const handleImageFile = useCallback(async (file) => {
    if (!file || !file.type.startsWith('image/')) return
    const dataUrl = await compressImage(file)
    setPendingImage(dataUrl)
  }, [])

  const handleSend = useCallback(() => {
    if ((!input.trim() && !pendingImage) || loading) return
    send(input.trim(), pendingImage)
    setInput('')
    setPendingImage(null)
  }, [input, loading, send, pendingImage])

  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }, [handleSend])

  const handleQuickAction = useCallback((action) => {
    if (action.autoSend) {
      send(action.prompt)
      return
    }
    setInput(action.prompt)
    setTimeout(() => {
      const ta = inputRef.current
      if (!ta) return
      ta.focus()
      ta.setSelectionRange(ta.value.length, ta.value.length)
    }, 50)
  }, [send])

  const firstName = profile?.nome?.split(' ')[0] || null

  return (
    <>
      {!open && (
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

      {open && (
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
              <SmartEmptyState firstName={firstName} onQuickAction={handleQuickAction} />
            ) : (
              <>
                {messages.map((msg, i) => (
                  <MessageBubble key={i} msg={msg} />
                ))}
                {loading && <TypingIndicator />}
                {error && (
                  <div className="flex items-start gap-2 bg-red-50 border border-red-100 rounded-xl px-3 py-2.5 mb-3">
                    <svg className="w-4 h-4 text-red-400 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
                    </svg>
                    <p className="text-xs text-red-600 leading-relaxed">{error}</p>
                  </div>
                )}
                <div ref={messagesEndRef} className="h-6" />
              </>
            )}
          </div>

          {/* Quick actions strip */}
          {messages.length > 0 && !loading && (
            <div className="shrink-0 px-3 pb-2 overflow-x-auto">
              <div className="flex gap-2 w-max">
                {QUICK_ACTIONS.map((action) => (
                  <button
                    key={action.label}
                    onClick={() => handleQuickAction(action)}
                    className="shrink-0 text-xs px-3 py-1.5 bg-white border border-gray-200 rounded-full text-gray-600 font-medium whitespace-nowrap active:scale-95 transition-transform shadow-sm"
                  >
                    {action.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Input */}
          <div
            className="shrink-0 bg-white border-t border-gray-100 px-3 pt-2"
            style={{ paddingBottom: 'max(10px, env(safe-area-inset-bottom))' }}
          >
            {/* Preview de imagem pendente */}
            {pendingImage && (
              <div className="relative mb-2 inline-block">
                <img src={pendingImage} alt="preview" className="h-20 w-auto rounded-xl object-cover border border-gray-200" />
                <button
                  onClick={() => setPendingImage(null)}
                  className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-gray-700 text-white flex items-center justify-center shadow"
                  aria-label="Remover imagem"
                >
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            )}

            <div className="flex items-end gap-1.5">
              {/* + Galeria */}
              <button
                onClick={() => galleryInputRef.current?.click()}
                aria-label="Enviar da galeria"
                className="shrink-0 w-9 h-9 flex items-center justify-center text-gray-500 active:scale-90 transition-transform"
              >
                <PlusIcon className="w-6 h-6" />
              </button>

              {/* Input pill */}
              <div className="flex-1 bg-gray-100 rounded-full px-4 py-2 flex items-end gap-2 min-h-[42px]">
                <textarea
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder={
                    pendingImage
                      ? 'Adicione uma pergunta sobre a imagem...'
                      : QUICK_ACTIONS.find(a => input.startsWith(a.prompt))?.placeholder
                        ?? 'Mensagem...'
                  }
                  rows={1}
                  className="flex-1 bg-transparent text-sm text-gray-800 placeholder-gray-400 resize-none outline-none leading-[1.4] py-0.5"
                  style={{ maxHeight: '120px' }}
                />
                <button
                  aria-label="Emoji"
                  className="shrink-0 text-gray-400 opacity-60 pb-0.5"
                  tabIndex={-1}
                >
                  <SparklesIcon className="w-5 h-5" />
                </button>
              </div>

              {/* Câmera */}
              <button
                onClick={() => cameraInputRef.current?.click()}
                aria-label="Tirar foto"
                className="shrink-0 w-9 h-9 flex items-center justify-center text-gray-500 active:scale-90 transition-transform"
              >
                <CameraIcon className="w-5 h-5" />
              </button>

              {/* Mic / Send / Stop */}
              {loading ? (
                <button
                  onClick={cancel}
                  aria-label="Cancelar"
                  className="shrink-0 w-10 h-10 rounded-full flex items-center justify-center bg-gray-200 text-gray-500 active:scale-90 transition-transform"
                >
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                    <rect x="6" y="6" width="12" height="12" rx="2" />
                  </svg>
                </button>
              ) : input.trim() || pendingImage ? (
                <button
                  onClick={handleSend}
                  aria-label="Enviar"
                  className="shrink-0 w-10 h-10 rounded-full flex items-center justify-center text-white active:scale-90 transition-transform"
                  style={{ background: 'rgb(var(--ac))' }}
                >
                  <SendIcon className="w-4 h-4" />
                </button>
              ) : (
                <button
                  onClick={supportsVoice ? toggleVoice : undefined}
                  aria-label={listening ? 'Parar gravação' : 'Gravar voz'}
                  className={`shrink-0 w-10 h-10 rounded-full flex items-center justify-center shadow-md transition-all active:scale-90 ${
                    listening
                      ? 'bg-red-500 text-white animate-pulse'
                      : 'bg-white text-gray-700'
                  }`}
                >
                  <MicIcon active={listening} className="w-5 h-5" />
                </button>
              )}
            </div>

            {voiceError ? (
              <p className="text-center text-[11px] text-red-500 mt-1.5">{voiceError}</p>
            ) : (
              <p className="text-center text-[10px] text-gray-300 mt-1.5">
                IA pode cometer erros — confirme informações críticas
              </p>
            )}

            {/* File inputs ocultos */}
            <input
              ref={galleryInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={e => { if (e.target.files?.[0]) handleImageFile(e.target.files[0]); e.target.value = '' }}
            />
            <input
              ref={cameraInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={e => { if (e.target.files?.[0]) handleImageFile(e.target.files[0]); e.target.value = '' }}
            />
          </div>
        </div>
      )}
    </>
  )
}
