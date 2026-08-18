import { useState } from 'react'
import PlanoItemForm from '../PlanoItemForm'
import ConfirmModal from '../../ConfirmModal'
import { PERIODICIDADE_LABEL, proximaData } from '../../../lib/pmoc'
import { formatDate } from '../../../lib/format'

const VALOR_VAZIO = {
  equipamento_local_id: '',
  equipamento_id: '',
  todos_do_tipo: false,
  tipo_alvo: null,
  atividade: 'Limpeza de filtros',
  descricao: 'Limpeza de filtros',
  periodicidade: 'mensal',
  periodicidade_dias: '',
  proxima_execucao_override: '',
  responsavel: '',
  observacoes: '',
}

function nomeEquipamento(equipamentos, item) {
  if (item.todos_do_tipo) return `Todos — ${item.tipo_alvo}`
  const eq = equipamentos.find(e => e._localId === item.equipamento_local_id)
  return eq ? (eq.tag || eq.tipo || 'Equipamento') : 'Equipamento removido'
}

export default function StepPlano({ equipamentos, itens, onAdd, onEdit, onRemove, dataInicio }) {
  const [mostrarForm, setMostrarForm] = useState(false)
  const [editandoId, setEditandoId] = useState(null)
  const [valor, setValor] = useState(VALOR_VAZIO)
  const [erro, setErro] = useState('')
  const [confirmRemover, setConfirmRemover] = useState(null)

  function abrirNovo() {
    setValor(VALOR_VAZIO)
    setEditandoId(null)
    setErro('')
    setMostrarForm(true)
  }

  function abrirEdicao(item) {
    setValor(item)
    setEditandoId(item._localId)
    setErro('')
    setMostrarForm(true)
  }

  function salvar() {
    if (!valor.descricao.trim()) { setErro('Descreva a atividade.'); return }
    if (!valor.todos_do_tipo && !valor.equipamento_local_id) { setErro('Selecione um equipamento.'); return }
    if (valor.periodicidade === 'personalizada' && !valor.periodicidade_dias) { setErro('Informe a quantidade de dias.'); return }

    if (editandoId) onEdit({ ...valor, _localId: editandoId })
    else onAdd({ ...valor, _localId: crypto.randomUUID() })
    setMostrarForm(false)
  }

  return (
    <div className="px-4 pt-5 space-y-4 pb-8">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-gray-600">{itens.length} atividade(s) no plano</p>
        <button type="button" onClick={abrirNovo} disabled={equipamentos.length === 0} className="text-xs font-semibold ac-text disabled:opacity-40">
          + Adicionar atividade
        </button>
      </div>

      {equipamentos.length === 0 && (
        <p className="text-sm text-gray-400 text-center py-6">Cadastre ao menos um equipamento na etapa anterior antes de montar o plano.</p>
      )}

      {mostrarForm && (
        <div className="card space-y-3">
          <PlanoItemForm value={valor} onChange={setValor} equipamentos={equipamentos} showEquipamentoPicker />
          {valor.proxima_execucao_override === '' && valor.periodicidade !== 'personalizada' && dataInicio && (
            <p className="text-xs text-gray-400">
              Prevista para {formatDate(proximaData(dataInicio, valor.periodicidade, valor.periodicidade_dias))} (calculada automaticamente)
            </p>
          )}
          {erro && <p className="text-xs text-red-500">{erro}</p>}
          <div className="flex gap-2">
            <button type="button" onClick={salvar} className="btn-primary flex-1">Salvar atividade</button>
            <button type="button" onClick={() => setMostrarForm(false)} className="btn-secondary flex-1">Cancelar</button>
          </div>
        </div>
      )}

      {itens.length > 0 && (
        <div className="space-y-2">
          {itens.map(item => (
            <div key={item._localId} className="card">
              <p className="text-sm font-semibold text-gray-800">{item.descricao}</p>
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                <span className="text-xs font-medium text-gray-400 bg-gray-100 rounded-full px-2 py-0.5">
                  {nomeEquipamento(equipamentos, item)}
                </span>
                <span className="text-xs font-medium text-gray-400 bg-gray-100 rounded-full px-2 py-0.5">
                  🔁 {PERIODICIDADE_LABEL[item.periodicidade]}
                </span>
                {item.responsavel && (
                  <span className="text-xs font-medium text-gray-400 bg-gray-100 rounded-full px-2 py-0.5">
                    👤 {item.responsavel}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-4 mt-2 pt-2 border-t border-gray-100">
                <button type="button" onClick={() => abrirEdicao(item)} className="text-xs font-semibold ac-text">Editar</button>
                <button type="button" onClick={() => setConfirmRemover(item)} className="text-xs font-semibold text-red-500">Excluir</button>
              </div>
            </div>
          ))}
        </div>
      )}

      <ConfirmModal
        open={Boolean(confirmRemover)}
        title="Excluir atividade?"
        message="Essa atividade será removida do plano de manutenção."
        confirmLabel="Excluir"
        danger
        onConfirm={() => onRemove(confirmRemover._localId)}
        onClose={() => setConfirmRemover(null)}
      />
    </div>
  )
}
