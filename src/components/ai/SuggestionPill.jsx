// Pill individual da tira "Sugestões rápidas" — ver especificação técnica,
// seção 4.4. Padding 16px/12px, radius pill, borda 1px gray-200. O ícone
// varia de cor por item (mesma lógica de categorização do grid de "Ações
// rápidas"), não é mais uma cor de marca única — ver src/lib/openai.js
// (AI_SUGGESTIONS) e SuggestionsRow.jsx (COLOR_MAP).
export default function SuggestionPill({ icon, iconColor, label, onPress }) {
  const Icon = icon
  return (
    <button
      onClick={onPress}
      className="shrink-0 snap-start w-[104px] flex items-center gap-1.5 px-4 py-3 bg-white border border-gray-200 rounded-full shadow-sm active:scale-95 active:shadow-md transition-all"
    >
      <Icon className={`w-5 h-5 shrink-0 ${iconColor}`} />
      <span className="text-[11.5px] font-semibold leading-tight text-gray-700 text-left">{label}</span>
    </button>
  )
}
