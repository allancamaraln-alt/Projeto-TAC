import { MicIcon } from './icons'

// Botão de voz — ocupa o lugar do SendButton quando não há texto/imagem
// pra enviar (estilo WhatsApp: mic e enviar trocam de lugar conforme o
// campo tem conteúdo ou não, em vez de ficarem lado a lado).
export default function VoiceButton({ onPress, listening, transcribing }) {
  return (
    <button
      onClick={onPress}
      disabled={transcribing}
      aria-label={listening ? 'Parar gravação' : transcribing ? 'Transcrevendo' : 'Gravar voz'}
      className={`shrink-0 w-14 h-14 rounded-full flex items-center justify-center text-white active:scale-90 transition-all ${
        listening ? 'bg-red-500 shadow-lg shadow-red-500/30 animate-pulse' : 'bg-white/15'
      } ${transcribing ? 'opacity-50' : ''}`}
    >
      <MicIcon active={listening} className="w-5 h-5" />
    </button>
  )
}
