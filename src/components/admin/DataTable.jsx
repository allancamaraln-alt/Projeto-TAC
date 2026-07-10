/** Tabela genérica paginada — reaproveitada em campanhas, anúncios e lista de compras. */
export default function DataTable({ columns, rows, onRowClick, page, pageSize, total, onPageChange }) {
  const totalPages = total && pageSize ? Math.max(1, Math.ceil(total / pageSize)) : 1

  return (
    <div className="card p-0 overflow-x-auto">
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr className="bg-gray-50 text-left text-xs text-gray-400 uppercase tracking-wide">
            {columns.map((c) => (
              <th key={c.key} className="p-2.5 whitespace-nowrap">{c.label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr
              key={row.id ?? i}
              className={`border-t border-gray-50 ${onRowClick ? 'cursor-pointer hover:bg-gray-50' : ''}`}
              onClick={() => onRowClick?.(row)}
            >
              {columns.map((c) => (
                <td key={c.key} className="p-2.5 whitespace-nowrap">{c.render ? c.render(row) : (row[c.key] ?? '—')}</td>
              ))}
            </tr>
          ))}
          {rows.length === 0 && (
            <tr><td colSpan={columns.length} className="p-6 text-center text-gray-400 text-sm">Nenhum dado encontrado</td></tr>
          )}
        </tbody>
      </table>
      {onPageChange && totalPages > 1 && (
        <div className="flex items-center justify-between px-3 py-2 border-t border-gray-50">
          <button disabled={page <= 1} onClick={() => onPageChange(page - 1)} className="text-xs px-2 py-1 rounded disabled:opacity-30">← Anterior</button>
          <span className="text-xs text-gray-400">Página {page} de {totalPages}</span>
          <button disabled={page >= totalPages} onClick={() => onPageChange(page + 1)} className="text-xs px-2 py-1 rounded disabled:opacity-30">Próxima →</button>
        </div>
      )}
    </div>
  )
}
