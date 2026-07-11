import { memo, useState, useCallback } from 'react'
import { SparklesIcon, CopyIcon } from './icons'
import ActionResultCard from './ActionResultCard'

function getTextContent(content) {
  if (typeof content === 'string') return content
  if (Array.isArray(content)) return content.find(c => c.type === 'text')?.text ?? ''
  return ''
}

function getImageContent(content) {
  if (!Array.isArray(content)) return null
  return content.find(c => c.type === 'image_url')?.image_url?.url ?? null
}

// memo: numa conversa longa, cada nova mensagem recria o array `messages`
// (useAI.jsx/useAtendimento.js) — sem isso, todas as bolhas já renderizadas
// re-renderizariam a cada turno. Os objetos `msg` já existentes mantêm a
// mesma referência entre renders, então a comparação rasa padrão já basta.
function MessageBubble({ msg }) {
  const isUser = msg.role === 'user'
  const [copied, setCopied] = useState(false)

  const displayContent = getTextContent(msg.content)
  const imageUrl = isUser ? getImageContent(msg.content) : null

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
          {!isUser && <ActionResultCard actions={msg.actions} />}
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

export default memo(MessageBubble)
