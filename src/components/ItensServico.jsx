import { formatBRL, somaItens, itensPreenchidos } from '../lib/format'

// Lista de itens do orçamento (descrição + valor), com botão "+" pra
// adicionar linhas e soma automática — mesmo padrão já usado pra "formas
// de pagamento" na conclusão de OS (ver OrdemDetalhe.jsx).
export default function ItensServico({ itens, onChange }) {
  function atualizar(i, campo, valor) {
    onChange(itens.map((it, idx) => (idx === i ? { ...it, [campo]: valor } : it)))
  }

  function remover(i) {
    onChange(itens.filter((_, idx) => idx !== i))
  }

  function adicionar() {
    onChange([...itens, { descricao: '', valor: '' }])
  }

  return (
    <div className="space-y-2">
      {itens.map((it, i) => (
        <div key={i} className="flex items-center gap-2">
          <input
            type="text"
            className="input-field flex-1"
            placeholder={`Item ${i + 1} — ex: Reposição de gás`}
            value={it.descricao}
            onChange={e => atualizar(i, 'descricao', e.target.value)}
          />
          <input
            type="number"
            className="input-field w-[92px] flex-shrink-0 text-right"
            placeholder="0,00"
            min="0"
            step="0.01"
            value={it.valor}
            onChange={e => atualizar(i, 'valor', e.target.value)}
          />
          {itens.length > 1 && (
            <button
              type="button"
              onClick={() => remover(i)}
              aria-label="Remover item"
              className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full text-red-400 active:bg-red-50"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
      ))}

      <button
        type="button"
        onClick={adicionar}
        className="ac-text flex w-full items-center justify-center gap-1.5 rounded-xl border-2 border-dashed border-gray-200 py-2.5 text-sm font-medium active:bg-gray-50"
      >
        <span className="text-base leading-none">+</span> Adicionar item
      </button>

      {itensPreenchidos(itens) && (
        <p className="pt-1 text-right text-sm font-semibold text-gray-600">
          Total dos itens: {formatBRL(somaItens(itens))}
        </p>
      )}
    </div>
  )
}
