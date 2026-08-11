import { AI_SUGGESTIONS } from '../../lib/openai'
import { SnowflakeIcon, DropletIcon, BoltIcon, WrenchIcon, EllipsisIcon } from './icons'
import SuggestionPill from './SuggestionPill'

const ICON_MAP = {
  snowflake: SnowflakeIcon,
  droplet: DropletIcon,
  bolt: BoltIcon,
  wrench: WrenchIcon,
  ellipsis: EllipsisIcon,
}

const COLOR_MAP = {
  blue: 'text-[#1E63C9]',
  sky: 'text-sky-400',
  slate: 'text-slate-400',
}

// Tira "Sugestões rápidas" — ver especificação técnica, seção 4.4. Altura
// igual entre pills (items-stretch), gap ~10-12px. `snap-x`/`snap-mandatory`
// dá o encaixe de scroll ao soltar o dedo no celular.
export default function SuggestionsRow({ onQuickAction }) {
  return (
    <div className="flex items-stretch gap-2.5 snap-x snap-mandatory">
      {AI_SUGGESTIONS.map((action) => (
        <SuggestionPill
          key={action.label}
          icon={ICON_MAP[action.icon]}
          iconColor={COLOR_MAP[action.color]}
          label={action.label}
          onPress={() => onQuickAction(action)}
        />
      ))}
    </div>
  )
}
