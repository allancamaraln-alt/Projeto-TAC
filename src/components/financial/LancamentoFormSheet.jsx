import { useState } from 'react'
import { CATEGORIAS_GASTO } from '../../lib/ai/tools/financial'
import { todayISODate } from '../../lib/financialPeriod'
import { useToast } from '../../hooks/useToast'
import ConfirmModal from '../ConfirmModal'

const TITULOS = { gasto: 'Despesa', receita: 'Receita' }

// Bottom-sheet único de criar/editar despesa ou receita avulsa — usado pela
// aba "Financeiro" de Relatorio.jsx. Quem chama o Supabase é o pai, via
// onSubmit/onDelete — este componente só cuida do formulário. O pai monta
// este componente com uma `key` que muda a cada lançamento aberto, pra que
// os campos partam do valor certo sem precisar sincronizar via effect.
export default function LancamentoFormSheet({ tipo, initialValue, onClose, onSubmit, onDelete }) {
  const toast = useToast()
  const [data, setData] = useState(initialValue?.data || todayISODate())
  const [categoria, setCategoria] = useState(initialValue?.categoria || CATEGORIAS_GASTO[0])
  const [descricao, setDescricao] = useState(initialValue?.descricao || '')
  const [valor, setValor] = useState(initialValue?.valor != null ? String(initialValue.valor) : '')
  const [saving, setSaving] = useState(false)
  const [erro, setErro] = useState('')
  const [confirmandoExclusao, setConfirmandoExclusao] = useState(false)

  const titulo = TITULOS[tipo]

  async function handleSubmit(e) {
    e.preventDefault()
    if (!descricao.trim() || !valor || Number(valor) <= 0) {
      setErro('Preencha a descrição e um valor válido.')
      return
    }
    setSaving(true)
    setErro('')
    try {
      const payload = tipo === 'gasto'
        ? { data, categoria, descricao: descricao.trim(), valor }
        : { data, descricao: descricao.trim(), valor }
      await onSubmit(payload)
      toast(initialValue ? `${titulo} atualizada!` : `${titulo} lançada!`)
      onClose()
    } catch (err) {
      setErro(err.message || 'Erro ao salvar. Tente novamente.')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    setSaving(true)
    try {
      await onDelete(initialValue.id)
      toast(`${titulo} excluída.`)
      onClose()
    } catch (err) {
      setErro(err.message || 'Erro ao excluir. Tente novamente.')
      setSaving(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-[110] bg-black/50 flex items-end"
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="bg-white w-full rounded-t-3xl px-5 pt-6 pb-8 space-y-4 max-h-[85vh] overflow-y-auto">
        <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto -mt-1 mb-1" />

        <h2 className="text-lg font-bold text-gray-800">
          {initialValue ? `Editar ${titulo.toLowerCase()}` : `Nova ${titulo.toLowerCase()}`}
        </h2>

        <form onSubmit={handleSubmit} className="space-y-3.5">
          <div>
            <label className="text-sm font-medium text-gray-700 block mb-1">Data</label>
            <input
              type="date"
              value={data}
              max={todayISODate()}
              onChange={e => setData(e.target.value)}
              className="input-field"
            />
          </div>

          {tipo === 'gasto' && (
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1">Categoria</label>
              <select value={categoria} onChange={e => setCategoria(e.target.value)} className="input-field">
                {CATEGORIAS_GASTO.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          )}

          <div>
            <label className="text-sm font-medium text-gray-700 block mb-1">Descrição</label>
            <input
              type="text"
              value={descricao}
              onChange={e => setDescricao(e.target.value)}
              placeholder={tipo === 'gasto' ? 'Ex: Combustível' : 'Ex: Venda de peça avulsa'}
              className="input-field"
            />
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700 block mb-1">Valor (R$)</label>
            <input
              type="number"
              inputMode="decimal"
              step="0.01"
              min="0"
              value={valor}
              onChange={e => setValor(e.target.value)}
              placeholder="0,00"
              className="input-field"
            />
          </div>

          {erro && <p className="text-sm text-red-500">{erro}</p>}

          <div className="pt-1 space-y-2.5">
            <button type="submit" disabled={saving} className="btn-primary disabled:opacity-60">
              {saving ? 'Salvando...' : 'Salvar'}
            </button>
            {initialValue && (
              <button
                type="button"
                disabled={saving}
                onClick={() => setConfirmandoExclusao(true)}
                className="w-full text-center text-red-500 py-2.5 font-semibold text-sm disabled:opacity-60"
              >
                Excluir
              </button>
            )}
            <button type="button" onClick={onClose} className="w-full text-center text-gray-400 py-1 font-medium text-sm">
              Cancelar
            </button>
          </div>
        </form>
      </div>

      <ConfirmModal
        open={confirmandoExclusao}
        title={`Excluir ${titulo.toLowerCase()}?`}
        message="Essa ação não pode ser desfeita."
        confirmLabel="Excluir"
        danger
        onConfirm={handleDelete}
        onClose={() => setConfirmandoExclusao(false)}
      />
    </div>
  )
}
