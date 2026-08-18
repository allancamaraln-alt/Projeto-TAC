// Átomos de UI reaproveitados no reskin do Painel e do Perfil.
// Usam só classes Tailwind já cobertas pelo esquema dark mode global
// (ver "DARK MODE" em src/index.css) — nenhum token novo é necessário.

export function Card({ className = '', children }) {
  return (
    <div className={`bg-white rounded-[22px] border border-gray-100 shadow-md ${className}`}>
      {children}
    </div>
  )
}

export function CardTitle({ children, action }) {
  return (
    <div className="flex items-center justify-between mb-3.5">
      <h2 className="text-[13px] font-bold text-gray-400 uppercase tracking-widest">{children}</h2>
      {action}
    </div>
  )
}

// className deve trazer bg-{cor}-50 (ou ac-bg-lt) + text-{cor}-500 (ou ac-text)
export function IconTile({ icon, className = 'bg-gray-100 text-gray-500', size = 46, radius = 16 }) {
  return (
    <span
      className={`grid shrink-0 place-items-center ${className}`}
      style={{ width: size, height: size, borderRadius: radius }}
    >
      {icon}
    </span>
  )
}

export function ListRow({ icon, tileClassName, title, subtitle, action, divider = false, onClick }) {
  const Comp = onClick ? 'button' : 'div'
  return (
    <Comp
      onClick={onClick}
      className={`w-full flex items-center gap-3.5 px-4 py-4 text-left transition active:scale-[0.99] ${
        divider ? 'border-t border-gray-100' : ''
      }`}
    >
      <IconTile icon={icon} className={tileClassName} />
      <span className="min-w-0 flex-1">
        <span className="block text-[16px] font-bold text-gray-800">{title}</span>
        {subtitle && <span className="block text-[12.5px] text-gray-400 truncate">{subtitle}</span>}
      </span>
      {action}
    </Comp>
  )
}

export function Badge({ children }) {
  return (
    <span className="ac-bg-lt ac-text text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full">
      {children}
    </span>
  )
}
