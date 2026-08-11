// Card individual do grid "Ações rápidas" — ver especificação técnica,
// seção 4.3. Padding ~14-16px, radius 20-24px, badge de ícone circular,
// título e descrição empilhados à esquerda.
//
// A grid (ver QuickActionsGrid.jsx) é 2 colunas fixas — isso dá espaço
// suficiente para usar os tamanhos de badge/fonte exatamente como a
// especificação pede (badge 56px, título 14px, descrição 12px), sem
// precisar reduzir proporção como numa 4 colunas espremida.
export default function ActionCard({ icon, iconBg, iconColor, title, description, onPress }) {
  const Icon = icon
  return (
    <button
      onClick={onPress}
      className="text-left p-4 bg-white rounded-[22px] border border-gray-100 shadow-sm active:scale-[0.97] active:shadow-md transition-all flex flex-col"
    >
      <span className={`w-14 h-14 rounded-full flex items-center justify-center mb-3 ${iconBg}`}>
        <Icon className={`w-6 h-6 ${iconColor}`} />
      </span>
      <span className="text-sm font-bold leading-[1.25] text-gray-800 block">{title}</span>
      <span className="text-xs leading-[1.35] text-gray-400 block mt-1">{description}</span>
    </button>
  )
}
