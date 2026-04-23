const config = {
  orcamento:    { label: 'Orçamento',    bg: 'bg-amber-50',   text: 'text-amber-600',   dot: 'bg-amber-400' },
  aprovado:     { label: 'Aprovado',     bg: 'ac-bg-lt',      text: 'ac-text',          dot: 'ac-bg' },
  em_andamento: { label: 'Em andamento', bg: 'bg-violet-50',  text: 'text-violet-600',  dot: 'bg-violet-400' },
  concluido:    { label: 'Concluído',    bg: 'bg-emerald-50', text: 'text-emerald-600', dot: 'bg-emerald-400' },
  cancelado:    { label: 'Cancelado',    bg: 'bg-gray-100',   text: 'text-gray-500',    dot: 'bg-gray-400' },
}

export default function StatusBadge({ status }) {
  const c = config[status] ?? config.orcamento
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full ${c.bg} ${c.text}`}>
      <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${c.dot}`} />
      {c.label}
    </span>
  )
}
