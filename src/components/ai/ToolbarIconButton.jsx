// Botão de ícone da toolbar do composer (+ / câmera / mic) — ver
// especificação técnica, seção 4.5 e 2.6. Área tocável ~40x40px, ícone
// ~22-24px, branco a 75% de opacidade (100% quando `active`, ex: gravando
// voz).
export default function ToolbarIconButton({ icon, onPress, active = false, activeClassName = 'text-red-400 animate-pulse', label }) {
  const Icon = icon
  return (
    <button
      onClick={onPress}
      aria-label={label}
      className={`shrink-0 w-10 h-10 flex items-center justify-center active:scale-90 transition-transform ${
        active ? activeClassName : 'text-white/75'
      }`}
    >
      <Icon className="w-[23px] h-[23px]" active={active} />
    </button>
  )
}
