/** Converte um preset de período em { desde, ate } ISO. `ate: null` = até agora. */
export function periodoParaDatas(periodo) {
  const agora = new Date()
  if (periodo === 'hoje') return { desde: new Date(agora.getFullYear(), agora.getMonth(), agora.getDate()).toISOString(), ate: null }
  if (periodo === '7d') return { desde: new Date(agora.getTime() - 7 * 86400000).toISOString(), ate: null }
  if (periodo === '30d') return { desde: new Date(agora.getTime() - 30 * 86400000).toISOString(), ate: null }
  if (periodo === 'mes') return { desde: new Date(agora.getFullYear(), agora.getMonth(), 1).toISOString(), ate: null }
  return { desde: null, ate: null } // 'tudo'
}

const PLANOS = ['monthly', 'plus', 'professional', 'annual']
const ORIGENS = ['Facebook', 'Instagram', 'Google', 'Direto', 'Orgânico', 'Outros']
const STATUS = [
  { value: 'success', label: 'Sucesso' },
  { value: 'partial', label: 'Parcial' },
  { value: 'failed', label: 'Falhou' },
]

/** Barra de filtros — cada filtro só aparece se o handler correspondente for passado. */
export default function FilterBar({
  periodo, onPeriodoChange,
  campanha, onCampanhaChange, campanhasDisponiveis,
  origem, onOrigemChange,
  plano, onPlanoChange,
  status, onStatusChange,
  busca, onBuscaChange,
}) {
  return (
    <div className="card flex flex-wrap gap-2 items-center">
      <select value={periodo} onChange={(e) => onPeriodoChange(e.target.value)} className="input !w-auto text-sm">
        <option value="hoje">Hoje</option>
        <option value="7d">Últimos 7 dias</option>
        <option value="30d">Últimos 30 dias</option>
        <option value="mes">Mês atual</option>
        <option value="tudo">Tudo</option>
      </select>

      {onCampanhaChange && (
        <select value={campanha ?? ''} onChange={(e) => onCampanhaChange(e.target.value || null)} className="input !w-auto text-sm">
          <option value="">Todas as campanhas</option>
          {(campanhasDisponiveis ?? []).map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
      )}

      {onOrigemChange && (
        <select value={origem ?? ''} onChange={(e) => onOrigemChange(e.target.value || null)} className="input !w-auto text-sm">
          <option value="">Todas as origens</option>
          {ORIGENS.map((o) => <option key={o} value={o}>{o}</option>)}
        </select>
      )}

      {onPlanoChange && (
        <select value={plano ?? ''} onChange={(e) => onPlanoChange(e.target.value || null)} className="input !w-auto text-sm">
          <option value="">Todos os planos</option>
          {PLANOS.map((p) => <option key={p} value={p}>{p}</option>)}
        </select>
      )}

      {onStatusChange && (
        <select value={status ?? ''} onChange={(e) => onStatusChange(e.target.value || null)} className="input !w-auto text-sm">
          <option value="">Todos os status</option>
          {STATUS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
        </select>
      )}

      {onBuscaChange && (
        <input
          type="text"
          value={busca ?? ''}
          onChange={(e) => onBuscaChange(e.target.value)}
          placeholder="Buscar usuário..."
          className="input !w-auto text-sm flex-1 min-w-[160px]"
        />
      )}
    </div>
  )
}
