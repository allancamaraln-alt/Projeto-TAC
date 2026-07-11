import { useNavigate } from 'react-router-dom'
import { useAI } from '../../hooks/useAI'
import LaudoResultCard from './LaudoResultCard'

// Renderiza o que a IA já executou de fato (via tool-calling), em vez do
// antigo padrão "clique aqui para criar" baseado em parsing de texto.
// Nem toda action tem representação visual própria (ex: expense_registered/
// income_registered/order_paid só existem para alimentar a linha do tempo
// do Modo Atendimento — ver src/hooks/useAtendimento.js), então o card só
// aparece quando sobra algo de fato renderizável.
export default function ActionResultCard({ actions }) {
  const navigate = useNavigate()
  const { setOpen } = useAI()

  if (!actions?.length) return null

  const goToOrdem = (id) => {
    setOpen(false)
    navigate(`/ordens/${id}`)
  }

  const rendered = actions.map((action, i) => {
    if (action.type === 'os_created') {
      return (
        <div key={i}>
          <button
            onClick={() => goToOrdem(action.id)}
            className="w-full flex items-center justify-between gap-2 py-2.5 px-3.5 rounded-xl text-sm font-semibold text-white active:scale-95 transition-transform"
            style={{ background: 'rgb(var(--ac))' }}
          >
            <span>✅ OS #{action.numero} criada</span>
            <span className="text-xs font-medium opacity-90">Ver OS →</span>
          </button>
          {action.cliente_criado && (
            <p className="text-xs text-amber-600 mt-1.5">⚠️ Cliente cadastrado automaticamente — lembre de adicionar telefone e endereço.</p>
          )}
        </div>
      )
    }

    if (action.type === 'os_updated') {
      return (
        <button
          key={i}
          onClick={() => goToOrdem(action.id)}
          className="w-full flex items-center justify-between gap-2 py-2.5 px-3.5 rounded-xl text-sm font-semibold text-white active:scale-95 transition-transform"
          style={{ background: 'rgb(var(--ac))' }}
        >
          <span>✅ OS #{action.numero} atualizada</span>
          <span className="text-xs font-medium opacity-90">Ver OS →</span>
        </button>
      )
    }

    if (action.type === 'laudo_generated') {
      return <LaudoResultCard key={i} laudo={action.laudo} />
    }

    return null
  }).filter(Boolean)

  if (!rendered.length) return null

  return <div className="mt-3 space-y-2">{rendered}</div>
}
