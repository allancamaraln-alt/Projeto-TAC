import { QUICK_ACTIONS } from '../../lib/openai'
import { SearchIcon, WarningIcon, CameraIcon, MicIcon, DocumentIcon, BookIcon, DollarIcon } from './icons'
import ActionCard from './ActionCard'

const ICON_MAP = {
  search: SearchIcon,
  warning: WarningIcon,
  camera: CameraIcon,
  mic: MicIcon,
  document: DocumentIcon,
  book: BookIcon,
  dollar: DollarIcon,
}

const COLOR_MAP = {
  blue:    { bg: 'bg-blue-50',    text: 'text-blue-500' },
  amber:   { bg: 'bg-amber-50',   text: 'text-amber-500' },
  emerald: { bg: 'bg-emerald-50', text: 'text-emerald-500' },
  violet:  { bg: 'bg-violet-50',  text: 'text-violet-500' },
  teal:    { bg: 'bg-teal-50',    text: 'text-teal-500' },
  orange:  { bg: 'bg-orange-50',  text: 'text-orange-500' },
  rose:    { bg: 'bg-rose-50',    text: 'text-rose-500' },
}

// Grid "Ações rápidas" — 2 colunas (ver especificação técnica, seção 4.3 —
// o layout de referência é 4x2, calibrado sobre um frame ~402-430px). O
// shell deste app trava a largura em max-w-md (448px) em toda tela, então
// 4 colunas nunca tem espaço de verdade aqui — diferente de um container
// mais largo (ex: 760px), onde alternar para 4 colunas a partir de um
// breakpoint faria sentido. 2 colunas fixas é o que preserva os tamanhos
// de badge/fonte da especificação sem espremer o texto.
// Gap ~10-12px entre colunas/linhas.
export default function QuickActionsGrid({ onQuickAction }) {
  return (
    <div className="grid grid-cols-2 gap-2.5">
      {QUICK_ACTIONS.map((action) => (
        <ActionCard
          key={action.title}
          icon={ICON_MAP[action.icon]}
          iconBg={COLOR_MAP[action.color].bg}
          iconColor={COLOR_MAP[action.color].text}
          title={action.title}
          description={action.description}
          onPress={() => onQuickAction(action)}
        />
      ))}
    </div>
  )
}
