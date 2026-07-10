import { formatDateTime } from '../../lib/format'

function formatarDuracao(msDelta) {
  if (msDelta == null) return null
  if (msDelta < 1000) return `${msDelta}ms`
  if (msDelta < 60000) return `${(msDelta / 1000).toFixed(1)}s`
  return `${Math.round(msDelta / 60000)}min`
}

const STATUS_COR = { ok: 'bg-green-500', success: 'bg-green-500', error: 'bg-red-500', partial: 'bg-amber-500', sem_dado: 'bg-gray-300' }

/** Etapas no formato { etapa, horario, status } vindas de admin-tracking (action detail). */
export default function PurchaseTimeline({ etapas }) {
  let anterior = null

  return (
    <div className="card">
      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-4">Timeline da compra</p>
      <div className="space-y-4">
        {etapas.map((e, i) => {
          const delta = e.horario && anterior ? new Date(e.horario).getTime() - new Date(anterior).getTime() : null
          if (e.horario) anterior = e.horario
          return (
            <div key={i} className="flex gap-3">
              <div className="flex flex-col items-center">
                <span className={`w-3 h-3 rounded-full flex-shrink-0 ${STATUS_COR[e.status] ?? 'bg-gray-300'}`} />
                {i < etapas.length - 1 && <span className="w-px flex-1 bg-gray-200 mt-1" />}
              </div>
              <div className="pb-4 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-medium text-gray-700">{e.etapa}</p>
                  {delta !== null && <span className="text-xs text-gray-400 whitespace-nowrap">+{formatarDuracao(delta)}</span>}
                </div>
                <p className="text-xs text-gray-400">{e.horario ? formatDateTime(e.horario) : 'sem dado registrado'}</p>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
