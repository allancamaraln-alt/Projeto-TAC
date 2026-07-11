import { useState } from 'react'
import { useAuth } from '../../hooks/useAuth'
import { AddonCardModal, AddonPixModal } from '../AddonCheckout'
import { SparklesIcon } from './icons'

// fixed=true: overlay de tela cheia (usado pelo modal do AIAssistant.jsx).
// fixed=false: conteúdo "solto" para ser encaixado dentro de outra página
// já em tela cheia (usado por ChatHome.jsx quando o técnico não tem o add-on).
export default function AddonUpsell({ onClose, fixed = true }) {
  const { refreshProfile } = useAuth()
  const [metodo, setMetodo] = useState(null) // 'pix' | 'cartao' | null

  function handlePago() {
    setMetodo(null)
    refreshProfile()
  }

  return (
    <div className={fixed ? 'fixed inset-0 z-[200] flex flex-col bg-gray-50' : 'flex flex-col'}>
      <div
        className="flex items-center gap-3 px-4 shrink-0"
        style={{
          background: 'linear-gradient(135deg, rgb(var(--ac)) 0%, rgb(var(--ac-dk)) 100%)',
          paddingTop: fixed ? 'max(16px, env(safe-area-inset-top))' : '16px',
          paddingBottom: '12px',
        }}
      >
        <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center">
          <SparklesIcon className="w-5 h-5 text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-white font-bold text-sm leading-tight">ClimaPro IA</p>
          <p className="text-white/70 text-xs">Assistente técnico e financeiro</p>
        </div>
        {onClose && (
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center text-white/80 hover:text-white">
            <span className="text-2xl leading-none">&times;</span>
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-8 flex flex-col items-center text-center">
        <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-5" style={{ background: 'rgb(var(--ac-lt, 224 242 254))' }}>
          <SparklesIcon className="w-8 h-8" style={{ color: 'rgb(var(--ac))' }} />
        </div>
        <h2 className="text-xl font-extrabold text-gray-800 mb-2">Desbloqueie o Assistente IA</h2>
        <p className="text-sm text-gray-500 max-w-xs leading-relaxed mb-6">
          Diagnóstico de defeitos, interpretação de código de erro, geração de OS e laudo técnico
          por voz ou foto, além de controle financeiro por conversa — tudo num único assistente.
        </p>

        <div className="w-full max-w-xs bg-white rounded-2xl border border-gray-100 shadow-sm p-5 mb-6">
          <p className="text-3xl font-extrabold text-gray-800">R$19,90<span className="text-base font-semibold text-gray-400">/mês</span></p>
          <p className="text-xs text-gray-400 mt-1">Cobrado sobre o seu plano atual · cancele quando quiser</p>
        </div>

        <div className="w-full max-w-xs space-y-2.5">
          <button
            onClick={() => setMetodo('cartao')}
            className="w-full py-3 rounded-xl text-sm font-bold text-white transition-opacity active:opacity-90"
            style={{ background: 'rgb(var(--ac))' }}
          >
            Assinar com Cartão
          </button>
          <button
            onClick={() => setMetodo('pix')}
            className="w-full py-3 rounded-xl text-sm font-semibold border-2 border-green-500 text-green-600 hover:bg-green-50 transition-colors"
          >
            Assinar com Pix
          </button>
        </div>
      </div>

      {metodo === 'cartao' && <AddonCardModal onClose={() => setMetodo(null)} onPago={handlePago} />}
      {metodo === 'pix' && <AddonPixModal onClose={() => setMetodo(null)} onPago={handlePago} />}
    </div>
  )
}
