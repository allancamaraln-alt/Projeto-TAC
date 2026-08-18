import { useState } from 'react'
import { supabase } from '../../lib/supabase'
import { EQUIPAMENTO_TIPOS, FLUIDOS, CAPACIDADE_UNIDADES, STATUS_EQUIPAMENTO, itensPadrao } from '../../lib/pmocTemplates'

const CAMPOS_VAZIOS = {
  tag: '',
  codigo_interno: '',
  tipo: '',
  fabricante: '',
  modelo: '',
  capacidade_valor: '',
  capacidade_unidade: 'btu',
  fluido: '',
  localizacao: '',
  numero_serie: '',
  status: 'ativo',
  observacoes: '',
}

export default function EquipamentoModal({ mode = 'persisted', pmocId, tecnicoId, equipamento, onSaved, onClose }) {
  const isEdit = Boolean(equipamento)
  const [form, setForm] = useState(() =>
    equipamento
      ? {
          tag: equipamento.tag || '',
          codigo_interno: equipamento.codigo_interno || '',
          tipo: equipamento.tipo || '',
          fabricante: equipamento.fabricante || '',
          modelo: equipamento.modelo || '',
          capacidade_valor: equipamento.capacidade_valor ?? '',
          capacidade_unidade: equipamento.capacidade_unidade || 'btu',
          fluido: equipamento.fluido || '',
          localizacao: equipamento.localizacao || '',
          numero_serie: equipamento.numero_serie || '',
          status: equipamento.status || 'ativo',
          observacoes: equipamento.observacoes || '',
        }
      : CAMPOS_VAZIOS
  )
  const [erro, setErro] = useState('')
  const [salvando, setSalvando] = useState(false)

  const set = campo => e => setForm(f => ({ ...f, [campo]: e.target.value }))

  function montarPayload() {
    return {
      tag: form.tag.trim(),
      codigo_interno: form.codigo_interno.trim(),
      tipo: form.tipo,
      fabricante: form.fabricante.trim(),
      modelo: form.modelo.trim(),
      capacidade_valor: form.capacidade_valor === '' ? null : Number(form.capacidade_valor),
      capacidade_unidade: form.capacidade_valor === '' ? null : form.capacidade_unidade,
      fluido: form.fluido,
      localizacao: form.localizacao.trim(),
      numero_serie: form.numero_serie.trim(),
      status: form.status,
      observacoes: form.observacoes.trim(),
    }
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.tag.trim() && !form.tipo) { setErro('Informe pelo menos a identificação ou o tipo do equipamento.'); return }

    const payload = montarPayload()

    if (mode === 'wizard') {
      // Editando um rascunho já adicionado: só atualiza os campos, não
      // mexe no _localId nem reseeda o checklist (evita duplicar itens).
      if (isEdit) {
        onSaved({ ...equipamento, ...payload })
        return
      }
      const draftEquipamento = { ...payload, _localId: crypto.randomUUID() }
      const draftItens = itensPadrao(form.tipo).map(item => ({
        _localId: crypto.randomUUID(),
        equipamento_local_id: draftEquipamento._localId,
        todos_do_tipo: false,
        tipo_alvo: null,
        descricao: item.descricao,
        periodicidade: item.periodicidade,
        periodicidade_dias: null,
        proxima_execucao_override: null,
        responsavel: '',
        observacoes: '',
      }))
      onSaved(draftEquipamento, draftItens)
      return
    }

    setSalvando(true)
    setErro('')

    if (isEdit) {
      const { error } = await supabase.from('pmoc_equipamentos').update(payload).eq('id', equipamento.id)
      setSalvando(false)
      if (error) { setErro('Não foi possível salvar. Tente novamente.'); return }
      onSaved()
      return
    }

    const { data: novoEquip, error } = await supabase
      .from('pmoc_equipamentos')
      .insert({ ...payload, pmoc_id: pmocId, tecnico_id: tecnicoId })
      .select()
      .single()

    if (error) { setSalvando(false); setErro('Não foi possível salvar. Tente novamente.'); return }

    const itens = itensPadrao(form.tipo).map((item, idx) => ({
      equipamento_id: novoEquip.id,
      tecnico_id: tecnicoId,
      descricao: item.descricao,
      periodicidade: item.periodicidade,
      ordem: idx,
    }))
    if (itens.length > 0) await supabase.from('pmoc_plano_itens').insert(itens)

    setSalvando(false)
    onSaved()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4 py-8 overflow-y-auto">
      <form onSubmit={handleSubmit} className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl my-auto">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-gray-800">{isEdit ? 'Editar equipamento' : 'Novo equipamento'}</h2>
          <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">&times;</button>
        </div>

        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Identificação</label>
              <input className="input-field" value={form.tag} onChange={set('tag')} placeholder="Ex: AC-01" autoFocus />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Patrimônio / código</label>
              <input className="input-field" value={form.codigo_interno} onChange={set('codigo_interno')} placeholder="Opcional" />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Tipo</label>
            <select className="input-field" value={form.tipo} onChange={set('tipo')}>
              {EQUIPAMENTO_TIPOS.map(t => <option key={t} value={t}>{t || 'Não informado'}</option>)}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Fabricante</label>
              <input className="input-field" value={form.fabricante} onChange={set('fabricante')} />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Modelo</label>
              <input className="input-field" value={form.modelo} onChange={set('modelo')} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Capacidade</label>
              <input type="number" step="0.01" className="input-field" value={form.capacidade_valor} onChange={set('capacidade_valor')} placeholder="Ex: 18000" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Unidade</label>
              <select className="input-field" value={form.capacidade_unidade} onChange={set('capacidade_unidade')}>
                {CAPACIDADE_UNIDADES.map(u => <option key={u.value} value={u.value}>{u.label}</option>)}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Fluido</label>
              <select className="input-field" value={form.fluido} onChange={set('fluido')}>
                {FLUIDOS.map(f => <option key={f} value={f}>{f || 'Não informado'}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Nº de série</label>
              <input className="input-field" value={form.numero_serie} onChange={set('numero_serie')} placeholder="Opcional" />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Localização</label>
            <input className="input-field" value={form.localizacao} onChange={set('localizacao')} placeholder="Ex: Recepção, Consultório 01..." />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Status</label>
            <div className="grid grid-cols-3 gap-2">
              {STATUS_EQUIPAMENTO.map(s => (
                <button
                  key={s.value}
                  type="button"
                  onClick={() => setForm(f => ({ ...f, status: s.value }))}
                  className={`py-2 rounded-xl text-xs font-medium border transition-colors ${
                    form.status === s.value ? 'ac-bg ac-text-tx ac-border' : 'bg-white text-gray-600 border-gray-200'
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Observações</label>
            <textarea className="input-field" rows={2} value={form.observacoes} onChange={set('observacoes')} placeholder="Opcional" />
          </div>
        </div>

        {!isEdit && (
          <p className="text-xs text-gray-400 mt-3">
            Ao salvar, um checklist padrão de manutenção será criado automaticamente para este equipamento (editável depois).
          </p>
        )}

        {erro && <p className="text-xs text-red-500 mt-3">{erro}</p>}

        <button type="submit" disabled={salvando} className="btn-primary mt-4 w-full disabled:opacity-60">
          {salvando ? 'Salvando...' : 'Salvar equipamento'}
        </button>
      </form>
    </div>
  )
}
