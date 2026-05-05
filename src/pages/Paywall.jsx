import { useState, useEffect } from 'react'
import { useAuth } from '../hooks/useAuth'
import { supabase } from '../lib/supabase'

const PLANOS = [
  {
    id: 'annual',
    label: 'Anual',
    destaque: true,
    preco: 'R$ 149,90',
    periodo: '/ano',
    equivalente: 'R$ 12,49/mês',
    economia: 'Economize 37%',
    descricao: 'Melhor custo-benefício',
  },
  {
    id: 'monthly',
    label: 'Mensal',
    destaque: false,
    preco: 'R$ 19,90',
    periodo: '/mês',
    equivalente: null,
    economia: null,
    descricao: 'Cancele quando quiser',
  },
]

function useRetornoMercadoPago() {
  const params = new URLSearchParams(window.location.search)
  return params.get('pagamento') === 'sucesso'
}

export default function Paywall() {
  const { signOut, subscriptionStatus, trialDaysLeft, refreshProfile } = useAuth()
  const [loadingPlano, setLoadingPlano] = useState(null)
  const [erro, setErro] = useState('')
  const [verificando, setVerificando] = useState(false)

  const expirado = subscriptionStatus === 'expired'
  const retornou = useRetornoMercadoPago()

  // Quando o usuário volta do Mercado Pago, tenta confirmar o pagamento automaticamente
  useEffect(() => {
    if (!retornou) return
    setVerificando(true)

    let tentativas = 0
    const intervalo = setInterval(async () => {
      await refreshProfile()
      tentativas++
      if (tentativas >= 10) {
        clearInterval(intervalo)
        setVerificando(false)
      }
    }, 3000)

    return () => clearInterval(intervalo)
  }, [])

  async function handleAssinar(planId) {
    setLoadingPlano(planId)
    setErro('')
    try {
      const { data, error } = await supabase.functions.invoke('create-checkout', {
        body: { plan: planId },
      })
      if (error || !data?.url) throw new Error('Não foi possível iniciar o pagamento.')
      window.location.href = data.url
    } catch (err) {
      setErro(err.message)
      setLoadingPlano(null)
    }
  }

  if (verificando) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center"
        style={{ background: 'linear-gradient(160deg, rgb(var(--ac)) 0%, rgb(var(--ac-dk)) 100%)' }}>
        <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center shadow-2xl mb-5">
          <span className="text-3xl">❄️</span>
        </div>
        <p className="text-white text-lg font-bold">Verificando pagamento...</p>
        <p className="ac-text-sf text-sm mt-2">Isso pode levar alguns segundos</p>
        <div className="mt-5 flex justify-center gap-1.5">
          <span className="w-2 h-2 bg-white/50 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
          <span className="w-2 h-2 bg-white/50 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
          <span className="w-2 h-2 bg-white/50 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col"
      style={{ background: 'linear-gradient(160deg, rgb(var(--ac)) 0%, rgb(var(--ac-dk)) 100%)' }}>
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-24 -right-24 w-72 h-72 rounded-full bg-white opacity-5" />
        <div className="absolute top-32 -left-16 w-48 h-48 rounded-full bg-white opacity-5" />
        <div className="absolute bottom-32 right-8 w-32 h-32 rounded-full bg-white opacity-5" />
      </div>

      <div className="flex-1 flex flex-col items-center justify-center px-6 pt-14 pb-8 relative">
        <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center shadow-2xl mb-3">
          <span className="text-3xl">❄️</span>
        </div>
        <h1 className="text-white text-2xl font-extrabold tracking-tight">ClimaPro</h1>

        <div className="mt-5 text-center">
          {expirado ? (
            <>
              <p className="text-white text-lg font-bold">Período gratuito encerrado</p>
              <p className="ac-text-sf text-sm mt-1">Assine para continuar usando o app</p>
            </>
          ) : (
            <>
              <p className="text-white text-lg font-bold">
                {trialDaysLeft === 1 ? 'Último dia gratuito!' : `${trialDaysLeft} dias restantes`}
              </p>
              <p className="ac-text-sf text-sm mt-1">Garanta sua assinatura antes do prazo acabar</p>
            </>
          )}
        </div>

        <div className="w-full max-w-sm mt-8 space-y-4">
          {PLANOS.map(plano => {
            const carregando = loadingPlano === plano.id
            return (
              <button
                key={plano.id}
                onClick={() => handleAssinar(plano.id)}
                disabled={!!loadingPlano}
                className={`w-full text-left rounded-2xl p-5 shadow-xl transition-transform active:scale-[0.98] disabled:opacity-70 ${
                  plano.destaque ? 'bg-white' : 'bg-white/10 border border-white/30'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className={`text-base font-bold ${plano.destaque ? 'text-gray-800' : 'text-white'}`}>
                        {plano.label}
                      </span>
                      {plano.economia && (
                        <span className="text-xs font-semibold px-2 py-0.5 rounded-full text-white"
                          style={{ background: 'rgb(var(--ac))' }}>
                          {plano.economia}
                        </span>
                      )}
                    </div>
                    <p className={`text-xs mt-0.5 ${plano.destaque ? 'text-gray-500' : 'text-white/70'}`}>
                      {plano.descricao}
                    </p>
                  </div>
                  <div className="text-right">
                    <span className={`text-2xl font-extrabold ${plano.destaque ? 'text-gray-800' : 'text-white'}`}>
                      {plano.preco}
                    </span>
                    <span className={`text-sm ${plano.destaque ? 'text-gray-400' : 'text-white/60'}`}>
                      {plano.periodo}
                    </span>
                    {plano.equivalente && (
                      <p className="text-xs text-gray-400 mt-0.5">{plano.equivalente}</p>
                    )}
                  </div>
                </div>

                <div className={`mt-4 py-2.5 rounded-xl text-center text-sm font-bold text-white ${
                  plano.destaque ? '' : 'bg-white/15'
                }`}
                  style={plano.destaque ? { background: 'rgb(var(--ac))' } : {}}>
                  {carregando ? 'Aguarde...' : `Assinar ${plano.label}`}
                </div>
              </button>
            )
          })}
        </div>

        {erro && (
          <p className="mt-4 text-sm bg-red-500/20 text-white px-4 py-2.5 rounded-xl text-center max-w-sm w-full">
            {erro}
          </p>
        )}

        <div className="mt-8 text-center space-y-1">
          <p className="ac-text-sf text-xs">Pagamento seguro via Mercado Pago</p>
          <p className="ac-text-sf text-xs">Cancele a qualquer momento</p>
        </div>

        <button
          onClick={signOut}
          className="mt-8 text-sm ac-text-sf font-semibold py-2 px-4 rounded-lg"
        >
          Sair da conta
        </button>
      </div>
    </div>
  )
}
