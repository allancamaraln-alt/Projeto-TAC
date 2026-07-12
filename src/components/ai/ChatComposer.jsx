import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from 'react'
import { useAI } from '../../hooks/useAI'
import { QUICK_ACTIONS } from '../../lib/openai'
import { SparklesIcon, MicIcon, SendIcon, PlusIcon, CameraIcon } from './icons'

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

// Barra de entrada do ClimaPro IA (texto/foto/voz) — usada em ChatHome.jsx,
// no modal do AIAssistant e no Modo Atendimento IA (AtendimentoIA.jsx).
// Por padrão usa o chat global (useAI()); passe send/loading/cancel como
// props para plugar noutra sessão (ex: useAtendimento()) sem duplicar toda
// a lógica de texto/foto/voz. Expõe métodos imperativos para que os
// QuickActionChips (foto/voz) acionem o composer mesmo estando fora dele
// na árvore de componentes.
const ChatComposer = forwardRef(function ChatComposer({ send: sendProp, loading: loadingProp, cancel: cancelProp } = {}, ref) {
  const globalAI = useAI()
  const send = sendProp ?? globalAI.send
  const loading = loadingProp ?? globalAI.loading
  const cancel = cancelProp ?? globalAI.cancel
  const [input, setInput] = useState('')
  const [listening, setListening] = useState(false)
  const [voiceError, setVoiceError] = useState(null)
  const [pendingImage, setPendingImage] = useState(null)
  const inputRef = useRef(null)
  const recognitionRef = useRef(null)
  const sendRef = useRef(send)
  const galleryInputRef = useRef(null)
  const cameraInputRef = useRef(null)
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
  const supportsVoice = !!SpeechRecognition

  useEffect(() => { sendRef.current = send }, [send])

  useEffect(() => {
    const timer = setTimeout(() => inputRef.current?.focus(), 350)
    return () => clearTimeout(timer)
  }, [])

  // Solicita permissão de mic assim que o composer aparece em tela — só
  // quando o navegador realmente suporta reconhecimento de voz (Safari não
  // suporta, então não faz sentido pedir a permissão à toa).
  useEffect(() => {
    if (!supportsVoice) return
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
  }, [supportsVoice])

  useEffect(() => {
    const ta = inputRef.current
    if (!ta) return
    ta.style.height = 'auto'
    ta.style.height = Math.min(ta.scrollHeight, 128) + 'px'
  }, [input])

  const toggleVoice = useCallback(() => {
    if (!SpeechRecognition) {
      setVoiceError('Reconhecimento de voz não é suportado neste navegador. No iPhone, o Safari não suporta — tente pelo Chrome no Android ou digite a mensagem.')
      setTimeout(() => setVoiceError(null), 6000)
      return
    }

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

  useImperativeHandle(ref, () => ({
    openGallery: () => galleryInputRef.current?.click(),
    openCamera: () => cameraInputRef.current?.click(),
    startVoice: () => { if (!listening) toggleVoice() },
    prefill: (text) => {
      setInput(text)
      setTimeout(() => {
        const ta = inputRef.current
        if (!ta) return
        ta.focus()
        ta.setSelectionRange(ta.value.length, ta.value.length)
      }, 50)
    },
  }), [listening, toggleVoice])

  return (
    <div>
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
            disabled={listening}
            placeholder={
              listening
                ? '🎙️ Ouvindo...'
                : pendingImage
                  ? 'Adicione uma pergunta sobre a imagem...'
                  : QUICK_ACTIONS.find(a => a.type === 'prompt' && input.startsWith(a.prompt))?.placeholder
                    ?? 'Pergunte qualquer coisa ou descreva seu atendimento...'
            }
            rows={1}
            className="flex-1 bg-transparent text-sm text-gray-800 placeholder-gray-400 resize-none outline-none leading-[1.4] py-0.5"
            style={{ maxHeight: '120px' }}
          />
          <button aria-label="Emoji" className="shrink-0 text-gray-400 opacity-60 pb-0.5" tabIndex={-1}>
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
            onClick={toggleVoice}
            aria-label={listening ? 'Parar gravação' : 'Gravar voz'}
            className={`shrink-0 w-10 h-10 rounded-full flex items-center justify-center shadow-md transition-all active:scale-90 ${
              listening
                ? 'bg-red-500 text-white animate-pulse'
                : supportsVoice
                  ? 'bg-white text-gray-700'
                  : 'bg-white text-gray-300'
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
  )
})

export default ChatComposer
