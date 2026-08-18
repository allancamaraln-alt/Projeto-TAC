import { ATIVIDADES_CATALOGO, PERIODICIDADES } from '../../lib/pmocTemplates'

// Fieldset puro (sem Supabase) — compartilhado entre ItemPlanoModal
// (edição de item já persistido) e a Etapa 4 do wizard (item em memória).
export default function PlanoItemForm({ value, onChange, equipamentos = [], showEquipamentoPicker = false }) {
  const set = campo => e => onChange({ ...value, [campo]: e.target.value })
  const atividadeEhOutra = !ATIVIDADES_CATALOGO.includes(value.atividade) || value.atividade === 'Outra'

  return (
    <div className="space-y-3">
      {showEquipamentoPicker && (
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Equipamento</label>
          <select
            className="input-field"
            value={value.todos_do_tipo ? `tipo:${value.tipo_alvo || ''}` : (value.equipamento_local_id || value.equipamento_id || '')}
            onChange={e => {
              const v = e.target.value
              if (v.startsWith('tipo:')) {
                onChange({ ...value, todos_do_tipo: true, tipo_alvo: v.slice(5), equipamento_local_id: null, equipamento_id: null })
              } else {
                onChange({ ...value, todos_do_tipo: false, tipo_alvo: null, equipamento_local_id: v, equipamento_id: v })
              }
            }}
          >
            <option value="">Selecione</option>
            {equipamentos.map(eq => (
              <option key={eq._localId || eq.id} value={eq._localId || eq.id}>
                {eq.tag || eq.codigo_interno || eq.tipo || 'Equipamento'}
              </option>
            ))}
            {[...new Set(equipamentos.map(eq => eq.tipo).filter(Boolean))].map(tipo => (
              <option key={`tipo:${tipo}`} value={`tipo:${tipo}`}>Todos os equipamentos — {tipo}</option>
            ))}
          </select>
        </div>
      )}

      <div>
        <label className="block text-xs font-medium text-gray-500 mb-1">Atividade</label>
        <select
          className="input-field"
          value={atividadeEhOutra ? 'Outra' : value.atividade}
          onChange={e => {
            const atividade = e.target.value
            onChange({ ...value, atividade, descricao: atividade === 'Outra' ? '' : atividade })
          }}
        >
          {ATIVIDADES_CATALOGO.map(a => <option key={a} value={a}>{a}</option>)}
        </select>
        {atividadeEhOutra && (
          <input
            className="input-field mt-2"
            value={value.descricao}
            onChange={set('descricao')}
            placeholder="Descreva a atividade"
          />
        )}
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Periodicidade</label>
          <select className="input-field" value={value.periodicidade} onChange={set('periodicidade')}>
            {PERIODICIDADES.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
          </select>
        </div>
        {value.periodicidade === 'personalizada' && (
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">A cada quantos dias?</label>
            <input type="number" min="1" className="input-field" value={value.periodicidade_dias || ''} onChange={set('periodicidade_dias')} />
          </div>
        )}
      </div>

      <div>
        <label className="block text-xs font-medium text-gray-500 mb-1">Próxima execução (opcional)</label>
        <input type="date" className="input-field" value={value.proxima_execucao_override || ''} onChange={set('proxima_execucao_override')} />
        <p className="text-xs text-gray-400 mt-1">Calculada automaticamente se deixar em branco.</p>
      </div>

      <div>
        <label className="block text-xs font-medium text-gray-500 mb-1">Responsável</label>
        <input className="input-field" value={value.responsavel} onChange={set('responsavel')} />
      </div>

      <div>
        <label className="block text-xs font-medium text-gray-500 mb-1">Observações</label>
        <textarea className="input-field" rows={2} value={value.observacoes} onChange={set('observacoes')} placeholder="Opcional" />
      </div>
    </div>
  )
}
