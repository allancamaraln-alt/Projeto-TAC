// Badge de status ("IA Online") do header da tela do Assistente — ver
// especificação técnica, seção 4.1. Padding 14px/8px, altura ~36-38px,
// radius pill, ponto de status em state/online (#22C55E).
export default function StatusBadge({ label = 'IA Online', dotClassName = 'bg-emerald-500' }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-600 bg-white border border-gray-200 rounded-full px-3.5 py-2 shadow-sm">
      <span className={`w-1.5 h-1.5 rounded-full ${dotClassName}`} />
      {label}
    </span>
  )
}
