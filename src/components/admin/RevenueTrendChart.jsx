import { formatBRL } from '../../lib/format'

/** Coluna simples por dia — série única, cor de acento do ClimaPro (sem legenda: 1 série não precisa). */
export default function RevenueTrendChart({ data }) {
  if (!data || data.length === 0) {
    return <div className="card text-center text-sm text-gray-400 py-8">Sem dados no período</div>
  }
  const max = Math.max(1, ...data.map((d) => Number(d.receita) || 0))
  const largura = 100 / data.length
  const picoIdx = data.reduce((melhor, d, i) => (Number(d.receita) > Number(data[melhor].receita) ? i : melhor), 0)

  return (
    <div className="card">
      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Receita por dia</p>
      <svg viewBox="0 0 100 40" className="w-full h-32" preserveAspectRatio="none">
        <line x1="0" y1="39.5" x2="100" y2="39.5" stroke="#e1e0d9" strokeWidth="0.5" />
        {data.map((d, i) => {
          const h = (Number(d.receita) / max) * 36
          return (
            <rect
              key={i}
              x={i * largura + largura * 0.15}
              y={40 - h}
              width={largura * 0.7}
              height={h}
              rx="1"
              style={{ fill: 'rgb(var(--ac))' }}
            >
              <title>{`${new Date(d.dia).toLocaleDateString('pt-BR')}: ${formatBRL(d.receita)}`}</title>
            </rect>
          )
        })}
      </svg>
      <div className="flex justify-between text-xs text-gray-400 mt-1">
        <span>{new Date(data[0].dia).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}</span>
        <span className="font-semibold text-gray-600">Pico: {formatBRL(data[picoIdx].receita)}</span>
        <span>{new Date(data[data.length - 1].dia).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}</span>
      </div>
    </div>
  )
}
