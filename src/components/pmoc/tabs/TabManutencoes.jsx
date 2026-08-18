import { useState } from 'react'
import { supabase } from '../../../lib/supabase'
import { useToast } from '../../../hooks/useToast'
import { PERIODICIDADE_LABEL, BUCKET3_LABEL } from '../../../lib/pmoc'
import { formatDate } from '../../../lib/format'
import ItemPlanoModal from '../ItemPlanoModal'
import ConfirmModal from '../../ConfirmModal'

const FILTROS = [
  { value: 'todas', label: 'Todas' },
  { value: 'hoje', label: 'Hoje' },
  { value: 'proximas', label: 'Próximas' },
  { value: 'atrasadas', label: 'Atrasadas' },
  { value: 'concluidas', label: 'Concluídas' },
]

function aplicarFiltro(itens, filtro) {
  switch (filtro) {
    case 'hoje': return itens.filter(i => i.ativo && i.status.dias === 0)
    case 'proximas': return itens.filter(i => i.ativo && i.status.bucket === 'proximo')
    case 'atrasadas': return itens.filter(i => i.ativo && i.status.bucket === 'atrasado')
    case 'concluidas': return itens.filter(i => i.ativo && !i.status.nuncaExecutado)
    default: return itens
  }
}

export default function TabManutencoes({ tecnicoId, itens, equipamentos, onExecutarItem, onChanged }) {
  const toast = useToast()
  const [filtro, setFiltro] = useState('todas')
  const [showModal, setShowModal] = useState(false)
  const [editando, setEditando] = useState(null)
  const [confirmRemover, setConfirmRemover] = useState(null)
  const filtrados = aplicarFiltro(itens, filtro).sort((a, b) => a.status.prevista.localeCompare(b.status.prevista))

  async function toggleAtivo(item) {
    const { error } = await supabase.from('pmoc_plano_itens').update({ ativo: !item.ativo }).eq('id', item.id)
    if (error) { toast('Erro ao atualizar atividade.', 'error'); return }
    onChanged()
  }

  async function excluir(item) {
    const { error } = await supabase.from('pmoc_plano_itens').delete().eq('id', item.id)
    if (error) { toast('Erro ao excluir atividade.', 'error'); return }
    toast('Atividade excluída.')
    onChanged()
  }

  return (
    <div className="px-4 pt-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex gap-1.5 overflow-x-auto pb-1">
          {FILTROS.map(f => (
            <button
              key={f.value}
              onClick={() => setFiltro(f.value)}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-colors ${
                filtro === f.value ? 'ac-bg text-white' : 'bg-gray-100 text-gray-500'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
        <button
          onClick={() => { setEditando(null); setShowModal(true) }}
          disabled={equipamentos.length === 0}
          className="text-xs font-semibold ac-text whitespace-nowrap disabled:opacity-40"
        >
          + Adicionar
        </button>
      </div>

      {filtrados.length === 0 ? (
        <div className="text-center text-gray-400 py-12">
          <p className="text-4xl mb-3">🛠️</p>
          <p className="font-medium">Nenhuma atividade encontrada</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtrados.map(item => {
            const eq = equipamentos.find(e => e.id === item.equipamento_id)
            const label = BUCKET3_LABEL[item.status.bucket]
            return (
              <div key={item.id} className={`card ${!item.ativo ? 'opacity-50' : ''}`}>
                <button
                  onClick={() => onExecutarItem(item.id)}
                  className="w-full text-left active:opacity-70 transition-opacity"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-gray-800 truncate">{item.descricao}</p>
                      <p className="text-xs text-gray-500 truncate">{eq ? (eq.tag || eq.tipo) : 'Equipamento removido'}</p>
                      <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                        <span className="text-xs font-medium text-gray-400 bg-gray-100 rounded-full px-2 py-0.5">
                          🔁 {PERIODICIDADE_LABEL[item.periodicidade]}
                        </span>
                        {item.responsavel && (
                          <span className="text-xs font-medium text-gray-400 bg-gray-100 rounded-full px-2 py-0.5">
                            👤 {item.responsavel}
                          </span>
                        )}
                        {!item.ativo && (
                          <span className="text-xs font-medium text-gray-400 bg-gray-100 rounded-full px-2 py-0.5">
                            Inativa
                          </span>
                        )}
                      </div>
                    </div>
                    {item.ativo && (
                      <span className={`text-xs font-semibold whitespace-nowrap rounded-full px-2 py-1 border ${label.bg} ${label.cor} ${label.border}`}>
                        {label.icone} {item.status.nuncaExecutado ? 'Nunca executado' : formatDate(item.status.prevista)}
                      </span>
                    )}
                  </div>
                </button>
                <div className="flex items-center gap-4 mt-2 pt-2 border-t border-gray-100">
                  <button onClick={() => { setEditando(item); setShowModal(true) }} className="text-xs font-semibold ac-text">Editar</button>
                  <button onClick={() => toggleAtivo(item)} className="text-xs font-semibold text-gray-500">
                    {item.ativo ? 'Desativar' : 'Ativar'}
                  </button>
                  <button onClick={() => setConfirmRemover(item)} className="text-xs font-semibold text-red-500">Excluir</button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {showModal && (
        <ItemPlanoModal
          tecnicoId={tecnicoId}
          equipamentos={equipamentos}
          item={editando}
          equipamentoId={editando?.equipamento_id}
          onClose={() => { setShowModal(false); setEditando(null) }}
          onSaved={() => { setShowModal(false); setEditando(null); onChanged() }}
        />
      )}

      <ConfirmModal
        open={Boolean(confirmRemover)}
        title="Excluir atividade?"
        message="O histórico de execuções passadas desta atividade é mantido."
        confirmLabel="Excluir"
        danger
        onConfirm={() => excluir(confirmRemover)}
        onClose={() => setConfirmRemover(null)}
      />
    </div>
  )
}
