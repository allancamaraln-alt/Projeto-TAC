import { useState } from 'react'
import { supabase } from '../../../lib/supabase'
import { useToast } from '../../../hooks/useToast'
import EquipamentoModal from '../EquipamentoModal'
import ConfirmModal from '../../ConfirmModal'
import { STATUS_EQUIPAMENTO } from '../../../lib/pmocTemplates'

const STATUS_LABEL = Object.fromEntries(STATUS_EQUIPAMENTO.map(s => [s.value, s.label]))
const STATUS_COR = { ativo: 'text-green-600 bg-green-50', inativo: 'text-gray-500 bg-gray-100', manutencao: 'text-orange-500 bg-orange-50' }

function omitCampos(obj, campos) {
  const copia = { ...obj }
  for (const campo of campos) delete copia[campo]
  return copia
}

export default function TabEquipamentos({ pmocId, tecnicoId, equipamentos, onChanged }) {
  const toast = useToast()
  const [showModal, setShowModal] = useState(false)
  const [editando, setEditando] = useState(null)
  const [confirmRemover, setConfirmRemover] = useState(null)
  const [duplicando, setDuplicando] = useState(null)

  async function duplicar(eq) {
    setDuplicando(eq.id)
    const campos = omitCampos(eq, ['id', 'created_at', 'updated_at'])
    const { data: novo, error } = await supabase
      .from('pmoc_equipamentos')
      .insert({ ...campos, tag: eq.tag ? `${eq.tag} (cópia)` : eq.tag, codigo_interno: eq.codigo_interno ? `${eq.codigo_interno}-2` : '' })
      .select()
      .single()

    if (error) { setDuplicando(null); toast('Erro ao duplicar equipamento.', 'error'); return }

    const { data: itensOriginais } = await supabase.from('pmoc_plano_itens').select('*').eq('equipamento_id', eq.id)
    if (itensOriginais?.length) {
      const clones = itensOriginais.map(it => ({ ...omitCampos(it, ['id', 'created_at', 'updated_at']), equipamento_id: novo.id }))
      await supabase.from('pmoc_plano_itens').insert(clones)
    }

    setDuplicando(null)
    toast('Equipamento duplicado!')
    onChanged()
  }

  async function excluir(eq) {
    const { error } = await supabase.from('pmoc_equipamentos').delete().eq('id', eq.id)
    if (error) { toast('Erro ao excluir equipamento.', 'error'); return }
    toast('Equipamento excluído.')
    onChanged()
  }

  return (
    <div className="px-4 pt-4 space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-gray-600">{equipamentos.length} equipamento(s)</p>
        <button onClick={() => { setEditando(null); setShowModal(true) }} className="text-xs font-semibold ac-text">
          + Adicionar equipamento
        </button>
      </div>

      {equipamentos.length === 0 ? (
        <div className="text-center text-gray-400 py-12">
          <p className="text-4xl mb-3">❄️</p>
          <p className="font-medium">Nenhum equipamento cadastrado</p>
          <p className="text-sm mt-1">Adicione os equipamentos deste estabelecimento para começar a configurar o plano.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {equipamentos.map(eq => (
            <div key={eq.id} className="card">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-semibold text-gray-800 truncate">{eq.tag || eq.tipo || 'Equipamento'}</p>
                  <p className="text-xs text-gray-500 truncate">
                    {[eq.fabricante, eq.modelo].filter(Boolean).join(' ') || 'Sem fabricante/modelo'}
                    {eq.capacidade_valor ? ` · ${eq.capacidade_valor} ${eq.capacidade_unidade}` : ''}
                  </p>
                  <p className="text-xs text-gray-400 truncate">{eq.localizacao || 'Localização não informada'}</p>
                  {eq.codigo_interno && <p className="text-xs text-gray-400">Código: {eq.codigo_interno}</p>}
                </div>
                <span className={`text-[10px] font-semibold uppercase tracking-wide rounded-full px-2 py-1 whitespace-nowrap ${STATUS_COR[eq.status] || ''}`}>
                  {STATUS_LABEL[eq.status] || eq.status}
                </span>
              </div>
              <div className="flex items-center gap-4 mt-2 pt-2 border-t border-gray-100">
                <button onClick={() => { setEditando(eq); setShowModal(true) }} className="text-xs font-semibold ac-text">Editar</button>
                <button onClick={() => duplicar(eq)} disabled={duplicando === eq.id} className="text-xs font-semibold text-gray-500 disabled:opacity-50">
                  {duplicando === eq.id ? 'Duplicando...' : 'Duplicar'}
                </button>
                <button onClick={() => setConfirmRemover(eq)} className="text-xs font-semibold text-red-500">Excluir</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <EquipamentoModal
          mode="persisted"
          pmocId={pmocId}
          tecnicoId={tecnicoId}
          equipamento={editando}
          onClose={() => { setShowModal(false); setEditando(null) }}
          onSaved={() => { setShowModal(false); setEditando(null); onChanged() }}
        />
      )}

      <ConfirmModal
        open={Boolean(confirmRemover)}
        title="Excluir equipamento?"
        message="O checklist deste equipamento também será removido. O histórico de execuções passadas é mantido."
        confirmLabel="Excluir"
        danger
        onConfirm={() => excluir(confirmRemover)}
        onClose={() => setConfirmRemover(null)}
      />
    </div>
  )
}
