import { QUICK_ACTIONS } from '../../lib/openai'

// variant="grid": cartões grandes (2 colunas) usados na tela inicial vazia.
// variant="strip": tira horizontal de pílulas usada quando já há conversa.
export default function QuickActionChips({ variant = 'grid', onQuickAction }) {
  if (variant === 'strip') {
    return (
      <div className="flex gap-2 w-max">
        {QUICK_ACTIONS.map((action) => (
          <button
            key={action.label}
            onClick={() => onQuickAction(action)}
            className="shrink-0 text-xs px-3 py-1.5 bg-white border border-gray-200 rounded-full text-gray-600 font-medium whitespace-nowrap active:scale-95 transition-transform shadow-sm"
          >
            {action.label}
          </button>
        ))}
      </div>
    )
  }

  return (
    <div>
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
