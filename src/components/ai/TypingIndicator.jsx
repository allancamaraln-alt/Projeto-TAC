import { SparklesIcon } from './icons'

const PHASE_LABEL = {
  pensando: 'Pensando...',
  executando: 'Executando...',
}

export default function TypingIndicator({ phase }) {
  const label = PHASE_LABEL[phase]

  return (
    <div className="flex items-center gap-2 mb-3 animate-fade-in">
      <div className="w-7 h-7 rounded-full flex items-center justify-center shrink-0 shadow-sm ring-2 ring-white"
        style={{ background: 'linear-gradient(135deg, rgb(var(--ac)) 0%, rgb(var(--ac-dk)) 100%)' }}>
        <SparklesIcon className="w-3.5 h-3.5 text-white" />
      </div>
      <div className="bg-white rounded-2xl rounded-bl-sm px-4 py-3 shadow-sm border border-gray-100 flex items-center gap-2">
        <div className="flex gap-1">
          <span className="w-2 h-2 rounded-full animate-bounce" style={{ animationDelay: '0ms', background: 'rgb(var(--ac) / 0.55)' }} />
          <span className="w-2 h-2 rounded-full animate-bounce" style={{ animationDelay: '150ms', background: 'rgb(var(--ac) / 0.55)' }} />
          <span className="w-2 h-2 rounded-full animate-bounce" style={{ animationDelay: '300ms', background: 'rgb(var(--ac) / 0.55)' }} />
        </div>
        {label && <span className="text-xs ac-text font-medium">{label}</span>}
      </div>
    </div>
  )
}
