/** Stat tile: label + valor grande + sublabel opcional (dataviz skill: um número por card, sem eixo/legenda). */
export default function StatCard({ label, value, sublabel }) {
  return (
    <div className="card">
      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">{label}</p>
      <p className="text-2xl font-bold text-gray-800">{value}</p>
      {sublabel && <p className="text-xs text-gray-400 mt-1">{sublabel}</p>}
    </div>
  )
}
