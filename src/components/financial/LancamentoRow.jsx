import { formatOS, formatBRL, formatDate } from '../../lib/format'

// Linha de lista reutilizada pra gasto e receita avulsa, na aba "Financeiro"
// do Relatório. Puramente apresentacional — o pai decide o que acontece no
// tap (abrir o sheet de edição, ou navegar pra OS quando for uma receita
// vinculada a um pagamento de OS).
export default function LancamentoRow({ item, tipo, onTap }) {
  const vinculadaAOS = tipo === 'receita' && !!item.ordem_id
  const valorClass = tipo === 'gasto' ? 'text-red-600' : 'text-emerald-600'

  return (
    <button onClick={onTap} className="card w-full text-left active:bg-gray-50 transition-colors">
      <div className="flex justify-between items-start gap-2">
        <div className="min-w-0">
          <p className="font-semibold text-gray-800 truncate">{item.descricao}</p>
          <p className="text-xs text-gray-400 mt-0.5">{formatDate(item.data)}</p>
          {tipo === 'gasto' && (
            <span className="inline-block mt-1.5 text-[11px] font-medium px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">
              {item.categoria}
            </span>
          )}
          {vinculadaAOS && (
            <span className="inline-block mt-1.5 text-[11px] font-medium px-2 py-0.5 rounded-full ac-bg-lt ac-text">
              {formatOS(item.ordens_servico?.numero)}
            </span>
          )}
        </div>
        <p className={`font-bold flex-shrink-0 whitespace-nowrap ${valorClass}`}>
          {tipo === 'gasto' ? '-' : '+'}{formatBRL(item.valor)}
        </p>
      </div>
    </button>
  )
}
