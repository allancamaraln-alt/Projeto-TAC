import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from 'react'
import { useAI } from '../../hooks/useAI'
import { QUICK_ACTIONS } from '../../lib/openai'
import { transcribeAudio } from '../../lib/ai/api'
import { MicIcon, PlusIcon, CameraIcon } from './icons'
import ToolbarIconButton from './ToolbarIconButton'
import SendButton from './SendButton'

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

function blobToBase64(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onloadend = () => resolve(reader.result.split(',')[1])
    reader.onerror = reject
    reader.readAsDataURL(blob)
  })
}

// Safari/iOS não implementa SpeechRecognition — só MediaRecorder. Prioriza
// mp4/aac (o que o Safari grava) e cai pra webm/opus nos outros browsers.
function pickRecorderMimeType() {
  if (typeof MediaRecorder === 'undefined') return ''
  const candidates = ['audio/mp4', 'audio/webm;codecs=opus', 'audio/webm', 'audio/ogg;codecs=opus']
  return candidates.find(t => MediaRecorder.isTypeSupported?.(t)) || ''
}

const MAX_RECORDING_MS = 60_000

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
  const [transcribing, setTranscribing] = useState(false)
  const [voiceError, setVoiceError] = useState(null)
  const [pendingImage, setPendingImage] = useState(null)
  const inputRef = useRef(null)
  const recognitionRef = useRef(null)
  const mediaRecorderRef = useRef(null)
  const audioChunksRef = useRef([])
  const mediaStreamRef = useRef(null)
  const recordTimeoutRef = useRef(null)
  // Trava síncrona contra double-tap/toque fantasma do iOS: React só
  // atualiza `listening` no próximo render, então dois toques na mesma
  // fração de segundo podem ver `listening` ainda false e disparar
  // getUserMedia duas vezes — o que o WebKit costuma abortar. Um ref
  // muda na hora, sem esperar re-render.
  const recordingBusyRef = useRef(false)
  // true assim que o usuário pede pra PARAR a gravação de propósito — usado
  // pra diferenciar isso de rec.onerror disparando 'aborted' sozinho (a
  // própria SpeechRecognition falhando ao iniciar, sem o usuário ter feito
  // nada). Alguns iPhones expõem window.webkitSpeechRecognition mas a API
  // não funciona de verdade — existe, mas aborta sozinha assim que chamada.
  const userAbortedRef = useRef(false)
  // Uma vez que a gente descobre que a SpeechRecognition nativa não
  // funciona neste aparelho, para de tentar de novo nos próximos toques —
  // vai direto pro MediaRecorder.
  const nativeRecognitionBrokenRef = useRef(false)
  const sendRef = useRef(send)
  const galleryInputRef = useRef(null)
  const cameraInputRef = useRef(null)
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
  // No iPhone/iPad, window.webkitSpeechRecognition EXISTE (então
  // `!!SpeechRecognition` engana), mas não faz a transcrição de verdade —
  // termina em silêncio, sem erro e sem resultado algum (já vimos isso
  // acontecer: nem "aborted" nem qualquer outro erro, só nada). Não dá pra
  // detectar isso de forma confiável reagindo a eventos, então nem tenta:
  // no iOS vai direto pro MediaRecorder.
  const isIOS = /iP(hone|od|ad)/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
  const supportsSpeechRecognition = !!SpeechRecognition && !isIOS
  // Fallback pro Safari/iOS, que não implementa SpeechRecognition de forma
  // confiável: grava com MediaRecorder e transcreve no servidor (ver
  // toggleVoice/startRecording e supabase/functions/transcribe-audio).
  const supportsMediaRecorder = typeof window.MediaRecorder !== 'undefined' && !!navigator.mediaDevices?.getUserMedia

  useEffect(() => { sendRef.current = send }, [send])

  // Solta o microfone se o componente desmontar no meio de uma gravação.
  useEffect(() => () => {
    clearTimeout(recordTimeoutRef.current)
    mediaStreamRef.current?.getTracks().forEach(t => t.stop())
  }, [])

  useEffect(() => {
    const timer = setTimeout(() => inputRef.current?.focus(), 350)
    return () => clearTimeout(timer)
  }, [])

  // Solicita permissão de mic assim que o composer aparece em tela — só
  // pro caminho de SpeechRecognition, que precisa da permissão já resolvida
  // antes de rec.start(). NÃO faz isso pro caminho de MediaRecorder
  // (Safari/iOS): esquentar e soltar o stream aqui e pedir de novo no tap
  // do usuário é duas chamadas de getUserMedia em sequência rápida, e o
  // WebKit do iOS costuma abortar a segunda (AbortError) — startRecording
  // já pede a permissão sozinho, na hora que precisa.
  useEffect(() => {
    if (!supportsSpeechRecognition) return
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
  }, [supportsSpeechRecognition])

  useEffect(() => {
    const ta = inputRef.current
    if (!ta) return
    ta.style.height = 'auto'
    ta.style.height = Math.min(ta.scrollHeight, 128) + 'px'
  }, [input])

  // Grava com MediaRecorder e manda pro transcribe-audio (Edge Function) —
  // caminho usado quando não há SpeechRecognition (Safari/iOS).
  const startRecording = useCallback(async () => {
    if (recordingBusyRef.current) return // já tem uma gravação em andamento
    recordingBusyRef.current = true

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      mediaStreamRef.current = stream

      const mimeType = pickRecorderMimeType()
      // 32kbps é suficiente pra voz (é o que apps de mensagem usam) — o
      // iPhone por padrão grava bem mais alto que isso, deixando o upload
      // (e a espera pra transcrever) maior do que precisa.
      const recorderOptions = { audioBitsPerSecond: 32_000, ...(mimeType ? { mimeType } : {}) }
      const recorder = new MediaRecorder(stream, recorderOptions)
      audioChunksRef.current = []

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data)
      }

      recorder.onerror = (e) => {
        mediaStreamRef.current?.getTracks().forEach(t => t.stop())
        clearTimeout(recordTimeoutRef.current)
        recordingBusyRef.current = false
        setListening(false)
        setVoiceError(`Erro ao gravar áudio (${e?.error?.name || 'desconhecido'}). Tente novamente.`)
        setTimeout(() => setVoiceError(null), 5000)
      }

      recorder.onstop = async () => {
        mediaStreamRef.current?.getTracks().forEach(t => t.stop())
        clearTimeout(recordTimeoutRef.current)
        setListening(false)

        const blob = new Blob(audioChunksRef.current, { type: recorder.mimeType || mimeType || 'audio/webm' })
        if (blob.size === 0) {
          recordingBusyRef.current = false
          setVoiceError('Nenhum áudio foi captado. Tente novamente.')
          setTimeout(() => setVoiceError(null), 4000)
          return
        }

        setTranscribing(true)
        try {
          const base64 = await blobToBase64(blob)
          const text = await transcribeAudio(base64, blob.type)
          if (text?.trim()) {
            sendRef.current(text.trim())
          } else {
            setVoiceError('Não entendi o áudio. Tente novamente.')
            setTimeout(() => setVoiceError(null), 4000)
          }
        } catch (err) {
          const friendly = { addon_required: 'Assine o Assistente IA para usar voz.' }
          setVoiceError(friendly[err.message] || `Erro ao transcrever (${err?.name || err?.message || 'falha de rede'}). Tente novamente.`)
          setTimeout(() => setVoiceError(null), 5000)
        } finally {
          setTranscribing(false)
          recordingBusyRef.current = false
        }
      }

      mediaRecorderRef.current = recorder
      recorder.start()
      setListening(true)
      setVoiceError(null)

      recordTimeoutRef.current = setTimeout(() => recorder.stop(), MAX_RECORDING_MS)
    } catch (err) {
      recordingBusyRef.current = false
      const msgs = {
        NotAllowedError: 'Permissão de microfone negada. Habilite nas configurações do navegador.',
        NotFoundError: 'Microfone não encontrado.',
      }
      setVoiceError(msgs[err?.name] || `Não foi possível acessar o microfone (${err?.name || 'erro'}). Toque novamente.`)
      setTimeout(() => setVoiceError(null), 5000)
    }
  }, [])

  const toggleVoice = useCallback(() => {
    if (transcribing) return

    if (supportsSpeechRecognition && !nativeRecognitionBrokenRef.current) {
      if (listening) {
        // .stop() processa o que já foi captado e dispara onresult com a
        // transcrição; .abort() DESCARTA tudo sem processar — por isso
        // parecia que nada tinha sido dito ao tocar pra parar.
        recognitionRef.current?.stop()
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

        // .abort() (chamado quando o usuário toca o mic de novo pra parar
        // de propósito) sempre dispara onerror com 'aborted' — isso não é
        // uma falha, é o usuário pedindo pra parar. Não é erro nenhum.
        if (userAbortedRef.current) {
          userAbortedRef.current = false
          return
        }

        // Sem ter sido o usuário: alguns iPhones expõem SpeechRecognition
        // mas ela não funciona de verdade — falha sozinha com 'aborted' (ou
        // 'service-not-allowed') assim que chamada. Cai pro MediaRecorder
        // em vez de mostrar erro, e não tenta mais o caminho nativo nesta
        // sessão.
        const brokenNative = e.error === 'aborted' || e.error === 'service-not-allowed'

        if (brokenNative && supportsMediaRecorder) {
          nativeRecognitionBrokenRef.current = true
          startRecording()
          return
        }

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
      userAbortedRef.current = false // estado limpo a cada nova gravação, por garantia

      try {
        rec.start()
        setListening(true)
        setVoiceError(null)
      } catch {
        if (supportsMediaRecorder) {
          nativeRecognitionBrokenRef.current = true
          startRecording()
          return
        }
        setVoiceError('Não foi possível acessar o microfone.')
        setTimeout(() => setVoiceError(null), 3000)
      }
      return
    }

    if (supportsMediaRecorder) {
      if (mediaRecorderRef.current?.state === 'recording') {
        mediaRecorderRef.current.stop()
        return
      }
      startRecording()
      return
    }

    setVoiceError('Reconhecimento de voz não é suportado neste navegador. Tente digitar a mensagem.')
    setTimeout(() => setVoiceError(null), 6000)
  }, [listening, transcribing, supportsSpeechRecognition, supportsMediaRecorder, SpeechRecognition, startRecording])

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
    startVoice: () => { if (!listening && !transcribing) toggleVoice() },
    prefill: (text) => {
      setInput(text)
      setTimeout(() => {
        const ta = inputRef.current
        if (!ta) return
        ta.focus()
        ta.setSelectionRange(ta.value.length, ta.value.length)
      }, 50)
    },
  }), [listening, transcribing, toggleVoice])

  const canSend = (input.trim() || pendingImage) && !loading

  return (
    <div>
      {pendingImage && (
        <div className="relative mb-2 inline-block">
          <img src={pendingImage} alt="preview" className="h-20 w-auto rounded-xl object-cover border border-white/20" />
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

      <div className="relative rounded-[30px] px-6 pt-5 pb-5 bg-[#122A4E]">
        <textarea
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={listening || transcribing}
          placeholder={
            listening
              ? '🎙️ Ouvindo...'
              : transcribing
                ? 'Transcrevendo áudio...'
                : pendingImage
                  ? 'Adicione uma pergunta sobre a imagem...'
                  : QUICK_ACTIONS.find(a => a.type === 'prompt' && input.startsWith(a.prompt))?.placeholder
                    ?? 'Descreva o problema ou envie uma foto...'
          }
          rows={1}
          className="w-full bg-transparent text-sm text-white placeholder-white/60 resize-none outline-none leading-[1.4]"
          style={{ maxHeight: '120px' }}
        />

        <div className="flex items-center justify-between mt-5">
          <div className="flex items-center gap-3">
            <ToolbarIconButton icon={PlusIcon} label="Enviar da galeria" onPress={() => galleryInputRef.current?.click()} />
            <ToolbarIconButton icon={CameraIcon} label="Tirar foto" onPress={() => cameraInputRef.current?.click()} />
            <ToolbarIconButton
              icon={MicIcon}
              label={listening ? 'Parar gravação' : transcribing ? 'Transcrevendo' : 'Gravar voz'}
              onPress={toggleVoice}
              active={listening || transcribing}
              activeClassName={listening ? 'text-red-400 animate-pulse' : 'text-white/40 animate-pulse'}
            />
          </div>

          {loading ? (
            <button
              onClick={cancel}
              aria-label="Cancelar"
              className="shrink-0 w-14 h-14 rounded-full flex items-center justify-center bg-white/20 text-white active:scale-90 transition-transform"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <rect x="6" y="6" width="12" height="12" rx="2" />
              </svg>
            </button>
          ) : (
            <SendButton onPress={handleSend} disabled={!canSend} />
          )}
        </div>
      </div>

      {voiceError ? (
        <p className="text-center text-[11px] text-red-500 mt-1.5">{voiceError}</p>
      ) : (
        <p className="text-center text-[10px] text-gray-400 mt-1.5">
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
