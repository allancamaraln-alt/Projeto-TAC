import { useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'
import PlanoItemForm from './PlanoItemForm'

// Sem `equipamentoId` (e sem `item`), o modal mostra o seletor de
// equipamento — inclusive a opção "Todos os equipamentos deste tipo",
// que na gravação vira uma linha por equipamento daquele tipo. Usado pelo
// "+ Adicionar atividade" da aba Manutenções, que não está mais preso a
// um equipamento específico como antes (isso ficava só no wizard).
export default function ItemPlanoModal({ equipamentoId, equipamentos = [], tecnicoId, item, onSaved, onClose }) {
  const { profile } = useAuth()
  const isEdit = Boolean(item)
  const mostrarSeletor = !isEdit && !equipamentoId

  const [value, setValue] = useState({
    equipamento_id: equipamentoId || '',
    todos_do_tipo: false,
    tipo_alvo: null,
    descricao: item?.descricao || '',
    atividade: item?.descricao || '',
    periodicidade: item?.periodicidade || 'mensal',
    periodicidade_dias: item?.periodicidade_dias || '',
    proxima_execucao_override: item?.proxima_execucao_override || '',
    responsavel: item?.responsavel || profile?.nome || '',
    observacoes: item?.observacoes || '',
  })
  const [erro, setErro] = useState('')
  const [salvando, setSalvando] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    if (!value.descricao.trim()) { setErro('Descreva a atividade.'); return }
    if (value.periodicidade === 'personalizada' && !value.periodicidade_dias) { setErro('Informe a quantidade de dias.'); return }
    if (mostrarSeletor && !value.todos_do_tipo && !value.equipamento_id) { setErro('Selecione um equipamento.'); return }

    setSalvando(true)
    setErro('')

    const payload = {
      descricao: value.descricao.trim(),
      periodicidade: value.periodicidade,
      periodicidade_dias: value.periodicidade === 'personalizada' ? Number(value.periodicidade_dias) : null,
      proxima_execucao_override: value.proxima_execucao_override || null,
      responsavel: value.responsavel.trim(),
      observacoes: value.observacoes.trim(),
    }

    if (isEdit) {
      const { error } = await supabase.from('pmoc_plano_itens').update(payload).eq('id', item.id)
      setSalvando(false)
      if (error) { setErro('Não foi possível salvar. Tente novamente.'); return }
      onSaved()
      return
    }

    const equipamentoIds = value.todos_do_tipo
      ? equipamentos.filter(eq => eq.tipo === value.tipo_alvo).map(eq => eq.id)
      : [value.equipamento_id || equipamentoId]

    const linhas = equipamentoIds.filter(Boolean).map(id => ({ ...payload, equipamento_id: id, tecnico_id: tecnicoId }))
    if (linhas.length === 0) { setSalvando(false); setErro('Selecione um equipamento.'); return }

    const { error } = await supabase.from('pmoc_plano_itens').insert(linhas)
    setSalvando(false)
    if (error) { setErro('Não foi possível salvar. Tente novamente.'); return }
    onSaved()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4 py-8 overflow-y-auto">
      <form onSubmit={handleSubmit} className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl my-auto">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-gray-800">{isEdit ? 'Editar atividade' : 'Nova atividade'}</h2>
          <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">&times;</button>
        </div>

        <PlanoItemForm value={value} onChange={setValue} equipamentos={equipamentos} showEquipamentoPicker={mostrarSeletor} />

        {erro && <p className="text-xs text-red-500 mt-3">{erro}</p>}

        <button type="submit" disabled={salvando} className="btn-primary mt-4 w-full disabled:opacity-60">
          {salvando ? 'Salvando...' : 'Salvar atividade'}
        </button>
      </form>
    </div>
  )
}
