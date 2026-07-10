/**
 * Barras horizontais categóricas com rótulo direto (nome + valor sempre visíveis,
 * nunca só a cor) — forma recomendada pela skill dataviz para "parte-do-todo"
 * com nomes de categoria (Origem/Dispositivo/Navegador), em vez de pizza/donut.
 * `colorMap` fixa a cor por nome de categoria (nunca por posição/rank).
 */
export default function CategoryBarList({ data, colorMap, labelKey, valueKey = 'compras', formatValue }) {
  if (!data || data.length === 0) {
    return <div className="card text-center text-sm text-gray-400 py-8">Sem dados no período</div>
  }
  const max = Math.max(1, ...data.map((d) => Number(d[valueKey]) || 0))

  return (
    <div className="card space-y-3">
      {data.map((d, i) => {
        const valor = Number(d[valueKey]) || 0
        const largura = Math.max(4, Math.round((valor / max) * 100))
        const cor = colorMap[d[labelKey]] ?? '#898781'
        return (
          <div key={i}>
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="font-medium text-gray-700">{d[labelKey] ?? '—'}</span>
              <span className="text-gray-500 font-semibold">{formatValue ? formatValue(d) : valor}</span>
            </div>
            <div className="h-2.5 rounded-full bg-gray-100 overflow-hidden">
              <div className="h-full rounded-full" style={{ width: `${largura}%`, background: cor }} />
            </div>
          </div>
        )
      })}
    </div>
  )
}
