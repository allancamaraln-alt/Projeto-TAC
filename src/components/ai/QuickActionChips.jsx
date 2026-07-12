import { QUICK_ACTIONS } from '../../lib/openai'

// Alterna entre a cor de destaque do técnico e algumas cores fixas já
// usadas em outras telas do app (Painel.jsx) — essas têm dark mode coberto
// em index.css (bg-amber-50/violet-50/emerald-50/blue-50/purple-50).
const ICON_BG_CYCLE = ['ac-bg-lt', 'bg-amber-50', 'bg-violet-50', 'bg-emerald-50', 'bg-blue-50', 'bg-purple-50']

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
            className="shrink-0 text-xs px-3 py-1.5 bg-white border border-gray-200 rounded-full text-gray-600 font-medium whitespace-nowrap active:scale-95 active:shadow-sm transition-all shadow-sm"
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
        {QUICK_ACTIONS.map((action, i) => {
          const spaceIdx = action.label.indexOf(' ')
          const icon = spaceIdx > -1 ? action.label.slice(0, spaceIdx) : action.label
          const title = spaceIdx > -1 ? action.label.slice(spaceIdx + 1) : ''
          const iconBg = ICON_BG_CYCLE[i % ICON_BG_CYCLE.length]
          return (
            <button
              key={action.label}
              onClick={() => onQuickAction(action)}
              className="text-left p-3.5 bg-white rounded-2xl border border-gray-100 shadow-sm active:scale-[0.97] active:shadow-md transition-all"
            >
              <span className={`w-10 h-10 rounded-xl flex items-center justify-center text-xl mb-2.5 ${iconBg}`}>
                {icon}
              </span>
              <span className="text-[13px] font-medium text-gray-800 leading-snug block">{title}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
