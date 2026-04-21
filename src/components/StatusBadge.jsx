const config = {
  orcamento:   { label: 'Orçamento',    bg: 'bg-yellow-100', text: 'text-yellow-700' },
  aprovado:    { label: 'Aprovado',     bg: 'bg-blue-100',   text: 'text-blue-700' },
  em_andamento:{ label: 'Em andamento', bg: 'bg-purple-100', text: 'text-purple-700' },
  concluido:   { label: 'Concluído',    bg: 'bg-green-100',  text: 'text-green-700' },
  cancelado:   { label: 'Cancelado',    bg: 'bg-gray-100',   text: 'text-gray-500' },
}

export default function StatusBadge({ status }) {
  const c = config[status] ?? config.orcamento
  return (
    <span className={`inline-block text-xs font-semibold px-2 py-0.5 rounded-full ${c.bg} ${c.text}`}>
      {c.label}
    </span>
  )
}
