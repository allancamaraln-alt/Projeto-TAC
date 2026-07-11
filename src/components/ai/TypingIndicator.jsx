import { SparklesIcon } from './icons'

const PHASE_LABEL = {
  pensando: 'Pensando...',
  executando: 'Executando...',
}

export default function TypingIndicator({ phase }) {
  const label = PHASE_LABEL[phase]

  return (
    <div className="flex items-center gap-2 mb-3">
      <div className="w-7 h-7 rounded-full flex items-center justify-center shrink-0 shadow-sm"
        style={{ background: 'linear-gradient(135deg, rgb(var(--ac)) 0%, rgb(var(--ac-dk)) 100%)' }}>
        <SparklesIcon className="w-3.5 h-3.5 text-white" />
      </div>
      <div className="bg-white rounded-2xl rounded-bl-sm px-4 py-3 shadow-sm border border-gray-100 flex items-center gap-2">
        <div className="flex gap-1">
          <span className="w-2 h-2 bg-gray-300 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
          <span className="w-2 h-2 bg-gray-300 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
          <span className="w-2 h-2 bg-gray-300 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
        </div>
        {label && <span className="text-xs text-gray-400">{label}</span>}
      </div>
    </div>
  )
}
