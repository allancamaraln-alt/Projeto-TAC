import { formatBRL, somaItens, itensPreenchidos, qtdItem, subtotalItem } from '../lib/format'

// Lista de itens do orçamento (descrição + quantidade + valor unitário), com
// botão "+" pra adicionar linhas e soma automática — mesmo padrão já usado
// pra "formas de pagamento" na conclusão de OS (ver OrdemDetalhe.jsx).
// O campo `valor` continua sendo o valor UNITÁRIO; o subtotal é valor × quantidade.
export default function ItensServico({ itens, onChange }) {
  function atualizar(i, campo, valor) {
    onChange(itens.map((it, idx) => (idx === i ? { ...it, [campo]: valor } : it)))
  }

  function remover(i) {
    onChange(itens.filter((_, idx) => idx !== i))
  }

  function adicionar() {
    onChange([...itens, { descricao: '', quantidade: 1, valor: '' }])
  }

  function mudarQtd(i, delta) {
    const nova = Math.max(1, Math.round(qtdItem(itens[i])) + delta)
    atualizar(i, 'quantidade', nova)
  }

  return (
    <div className="space-y-2">
      {itens.map((it, i) => {
        const qtd = qtdItem(it)
        const temValor = it.valor !== '' && it.valor != null
        return (
          <div key={i} className="space-y-2 rounded-xl border border-gray-100 bg-gray-50 p-2">
            <div className="flex items-center gap-2">
              <input
                type="text"
                className="input-field flex-1"
                placeholder={`Item ${i + 1} — ex: Reposição de gás`}
                value={it.descricao}
                onChange={e => atualizar(i, 'descricao', e.target.value)}
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

            <div className="flex items-center gap-2">
              {/* Quantidade com − / + pra não precisar abrir o teclado */}
              <div className="flex flex-shrink-0 items-center rounded-xl border border-gray-200 bg-white">
                <button
                  type="button"
                  onClick={() => mudarQtd(i, -1)}
                  disabled={qtd <= 1}
                  aria-label="Diminuir quantidade"
                  className="flex h-10 w-9 items-center justify-center text-lg font-semibold text-gray-500 disabled:opacity-30"
                >
                  −
                </button>
                <input
                  type="number"
                  inputMode="numeric"
                  aria-label="Quantidade"
                  className="w-9 bg-transparent text-center text-base font-semibold text-gray-800 outline-none"
                  min="1"
                  step="1"
                  value={it.quantidade ?? 1}
                  onChange={e => atualizar(i, 'quantidade', e.target.value)}
                  onBlur={e => {
                    const n = parseInt(e.target.value)
                    atualizar(i, 'quantidade', n > 0 ? n : 1)
                  }}
                />
                <button
                  type="button"
                  onClick={() => mudarQtd(i, 1)}
                  aria-label="Aumentar quantidade"
                  className="flex h-10 w-9 items-center justify-center text-lg font-semibold text-gray-500"
                >
                  +
                </button>
              </div>

              <span className="text-sm text-gray-400">×</span>

              <input
                type="number"
                inputMode="decimal"
                aria-label="Valor unitário"
                className="input-field min-w-0 flex-1 text-right"
                placeholder="Valor 0,00"
                min="0"
                step="0.01"
                value={it.valor}
                onChange={e => atualizar(i, 'valor', e.target.value)}
              />
            </div>

            {qtd > 1 && temValor && (
              <p className="px-1 text-right text-xs text-gray-500">
                {qtd} × {formatBRL(parseFloat(it.valor) || 0)} ={' '}
                <span className="font-semibold text-gray-700">{formatBRL(subtotalItem(it))}</span>
              </p>
            )}
          </div>
        )
      })}

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
