import { useState } from 'react'
import EquipamentoModal from '../EquipamentoModal'
import ConfirmModal from '../../ConfirmModal'
import { STATUS_EQUIPAMENTO } from '../../../lib/pmocTemplates'

const STATUS_LABEL = Object.fromEntries(STATUS_EQUIPAMENTO.map(s => [s.value, s.label]))

export default function StepEquipamentos({ equipamentos, onAdd, onEdit, onDuplicate, onRemove }) {
  const [showModal, setShowModal] = useState(false)
  const [editando, setEditando] = useState(null)
  const [confirmRemover, setConfirmRemover] = useState(null)

  function handleSaved(draftEquip, draftItens) {
    setShowModal(false)
    setEditando(null)
    if (draftItens) onAdd(draftEquip, draftItens)
    else onEdit(draftEquip)
  }

  return (
    <div className="px-4 pt-5 space-y-4 pb-8">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-gray-600">{equipamentos.length} equipamento(s) cadastrado(s)</p>
        <button type="button" onClick={() => { setEditando(null); setShowModal(true) }} className="text-xs font-semibold ac-text">
          + Adicionar equipamento
        </button>
      </div>

      {equipamentos.length === 0 ? (
        <div className="text-center text-gray-400 py-12">
          <p className="text-4xl mb-3">❄️</p>
          <p className="font-medium">Nenhum equipamento cadastrado</p>
          <p className="text-sm mt-1">Adicione os equipamentos deste estabelecimento para montar o plano de manutenção.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {equipamentos.map(eq => (
            <div key={eq._localId} className="card">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-semibold text-gray-800 truncate">{eq.tag || eq.tipo || 'Equipamento'}</p>
                  <p className="text-xs text-gray-500 truncate">
                    {[eq.fabricante, eq.modelo].filter(Boolean).join(' ') || 'Sem fabricante/modelo'}
                    {eq.capacidade_valor ? ` · ${eq.capacidade_valor} ${eq.capacidade_unidade}` : ''}
                  </p>
                  <p className="text-xs text-gray-400 truncate">{eq.localizacao || 'Localização não informada'}</p>
                  {eq.codigo_interno && <p className="text-xs text-gray-400">Código: {eq.codigo_interno}</p>}
                  <span className="inline-block mt-1 text-[10px] font-semibold uppercase tracking-wide text-gray-400">
                    {STATUS_LABEL[eq.status] || eq.status}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-4 mt-2 pt-2 border-t border-gray-100">
                <button type="button" onClick={() => { setEditando(eq); setShowModal(true) }} className="text-xs font-semibold ac-text">Editar</button>
                <button type="button" onClick={() => onDuplicate(eq)} className="text-xs font-semibold text-gray-500">Duplicar</button>
                <button type="button" onClick={() => setConfirmRemover(eq)} className="text-xs font-semibold text-red-500">Excluir</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <EquipamentoModal
          mode="wizard"
          equipamento={editando}
          onSaved={handleSaved}
          onClose={() => { setShowModal(false); setEditando(null) }}
        />
      )}

      <ConfirmModal
        open={Boolean(confirmRemover)}
        title="Excluir equipamento?"
        message="As atividades de manutenção já adicionadas para este equipamento também serão removidas."
        confirmLabel="Excluir"
        danger
        onConfirm={() => onRemove(confirmRemover._localId)}
        onClose={() => setConfirmRemover(null)}
      />
    </div>
  )
}
