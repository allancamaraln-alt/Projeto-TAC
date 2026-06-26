import { useState, useEffect, useRef } from 'react'
import { useAuth } from '../hooks/useAuth'
import { supabase } from '../lib/supabase'
import SocialProofToast from '../components/SocialProofToast'

const MP_PUBLIC_KEY = import.meta.env.VITE_MP_PUBLIC_KEY

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
    amount: 149.90,
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
    amount: 19.90,
  },
]

const BRAND_LABEL = {
  visa: 'Visa',
  master: 'Mastercard',
  amex: 'Amex',
  elo: 'Elo',
  hipercard: 'Hipercard',
}

function useRetornoMercadoPago() {
  const params = new URLSearchParams(window.location.search)
  return params.get('pagamento') === 'sucesso'
}

function CardBricksModal({ plan, amount, saveCard, onClose, onPago }) {
  const [brickLoaded, setBrickLoaded] = useState(false)
  const [erro, setErro] = useState('')
  const controllerRef = useRef(null)

  useEffect(() => {
    function initBrick() {
      const mp = new window.MercadoPago(MP_PUBLIC_KEY, { locale: 'pt-BR' })
      mp.bricks().create('cardPayment', 'mp-card-container', {
        initialization: { amount },
        customization: {
          paymentMethods: { maxInstallments: plan === 'annual' ? 6 : 1 },
          visual: { hideFormTitle: true },
        },
        callbacks: {
          onReady: () => setBrickLoaded(true),
          onSubmit: async (formData) => {
            setErro('')
            try {
              const { data, error } = await supabase.functions.invoke('process-card-payment', {
                body: { plan, cardFormData: formData, saveCard },
              })
              if (error) throw new Error(error.message)
              if (data?.error) throw new Error(data.error)
              if (data?.status === 'approved') {
                onPago()
              } else {
                throw new Error(data?.message || 'Pagamento não aprovado.')
              }
            } catch (err) {
              setErro(err.message)
            }
          },
          onError: (error) => console.error('Brick error:', error),
        },
      }).then(controller => { controllerRef.current = controller })
    }

    if (window.MercadoPago) {
      initBrick()
    } else {
      const existing = document.querySelector('script[src*="mercadopago"]')
      if (existing) {
        existing.addEventListener('load', initBrick)
      } else {
        const script = document.createElement('script')
        script.src = 'https://sdk.mercadopago.com/js/v2'
        script.onload = initBrick
        document.head.appendChild(script)
      }
    }

    return () => { if (controllerRef.current) controllerRef.current.unmount() }
  }, [])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
      <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl overflow-y-auto max-h-[90vh]">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-gray-800">Pagar com Cartão</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">&times;</button>
        </div>

        {!brickLoaded && (
          <div className="flex justify-center py-8">
            <span className="w-7 h-7 border-[3px] border-gray-200 border-t-sky-500 rounded-full animate-spin" />
          </div>
        )}

        <div id="mp-card-container" />

        {erro && (
          <p className="mt-3 text-sm bg-red-50 text-red-600 p-3 rounded-xl">{erro}</p>
        )}
      </div>
    </div>
  )
}

function SavedCardModal({ plan, cardLastFour, cardBrand, onClose, onPago }) {
  const [loading, setLoading] = useState(false)
  const [erro, setErro] = useState('')

  async function handleConfirmar() {
    setLoading(true)
    setErro('')
    try {
      const { data, error } = await supabase.functions.invoke('charge-saved-card', {
        body: { plan },
      })
      if (error) throw new Error(error.message)
      if (data?.error) throw new Error(data.error)
      if (data?.status === 'approved') {
        onPago()
      } else {
        throw new Error('Pagamento não aprovado.')
      }
    } catch (err) {
      setErro(err.message)
    } finally {
      setLoading(false)
    }
  }

  const brandLabel = BRAND_LABEL[cardBrand] ?? cardBrand ?? 'Cartão'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
      <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-gray-800">Renovar assinatura</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">&times;</button>
        </div>

        <div className="flex items-center gap-3 bg-gray-50 rounded-xl p-4 mb-5">
          <div className="w-10 h-10 bg-gray-200 rounded-lg flex items-center justify-center text-lg">💳</div>
          <div>
            <p className="text-sm font-semibold text-gray-800">{brandLabel} •••• {cardLastFour}</p>
            <p className="text-xs text-gray-400">Cartão salvo</p>
          </div>
        </div>

        <button
          onClick={handleConfirmar}
          disabled={loading}
          className="w-full py-3 rounded-xl text-sm font-bold text-white disabled:opacity-70 transition-opacity"
          style={{ background: 'rgb(var(--ac))' }}
        >
          {loading ? 'Processando...' : 'Confirmar cobrança'}
        </button>

        <button
          onClick={onClose}
          className="w-full py-2.5 mt-2 rounded-xl text-sm font-semibold text-gray-500 hover:bg-gray-50"
        >
          Usar outro cartão
        </button>

        {erro && (
          <p className="mt-3 text-sm bg-red-50 text-red-600 p-3 rounded-xl">{erro}</p>
        )}
      </div>
    </div>
  )
}

function PixModal({ pixData, onClose, onPago }) {
  const [copiado, setCopiado] = useState(false)

  useEffect(() => {
    let tentativas = 0
    const intervalo = setInterval(async () => {
      try {
        const { data } = await supabase.functions.invoke('verify-pix', {
          body: { payment_id: pixData.payment_id, plan: pixData.plan },
        })
        if (data?.authorized) {
          clearInterval(intervalo)
          onPago()
          return
        }
      } catch {
        // ignora erros pontuais
      }
      tentativas++
      if (tentativas >= 40) clearInterval(intervalo)
    }, 3000)

    return () => clearInterval(intervalo)
  }, [])

  async function copiar() {
    await navigator.clipboard.writeText(pixData.qr_code)
    setCopiado(true)
    setTimeout(() => setCopiado(false), 3000)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
      <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-gray-800">Pagar com Pix</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">&times;</button>
        </div>

        <p className="text-sm text-gray-500 mb-4 text-center">
          Escaneie o QR code ou copie o código Pix abaixo
        </p>

        {pixData.qr_code_base64 && (
          <div className="flex justify-center mb-4">
            <img
              src={`data:image/png;base64,${pixData.qr_code_base64}`}
              alt="QR Code Pix"
              className="w-48 h-48 rounded-xl border border-gray-100"
            />
          </div>
        )}

        <button
          onClick={copiar}
          className="w-full py-3 rounded-xl text-sm font-semibold border-2 border-green-500 text-green-600 hover:bg-green-50 transition-colors mb-3"
        >
          {copiado ? '✓ Código copiado!' : 'Copiar código Pix'}
        </button>

        <div className="flex items-center gap-2 justify-center text-xs text-gray-400">
          <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
          Aguardando pagamento...
        </div>

        <p className="text-xs text-gray-400 text-center mt-3">
          O QR code expira em 30 minutos
        </p>
      </div>
    </div>
  )
}

function preloadMpSdk() {
  if (window.MercadoPago || document.querySelector('script[src*="mercadopago"]')) return
  const script = document.createElement('script')
  script.src = 'https://sdk.mercadopago.com/js/v2'
  document.head.appendChild(script)
}

export default function Paywall() {
  const { signOut, subscriptionStatus, trialDaysLeft, refreshProfile, profile } = useAuth()
  const [loadingPix, setLoadingPix] = useState(null)
  const [erro, setErro] = useState('')
  const [verificando, setVerificando] = useState(false)
  const [pixData, setPixData] = useState(null)
  const [cardBricksData, setCardBricksData] = useState(null)
  const [savedCardData, setSavedCardData] = useState(null)
  const [saveCard, setSaveCard] = useState(true)

  useEffect(() => { preloadMpSdk() }, [])

  const expirado = subscriptionStatus === 'expired'
  const retornou = useRetornoMercadoPago()
  const temCartaoSalvo = !!(profile?.mp_customer_id && profile?.mp_card_last_four)

  useEffect(() => {
    if (!retornou) return
    setVerificando(true)

    let tentativas = 0
    const intervalo = setInterval(async () => {
      try {
        const { data } = await supabase.functions.invoke('verify-payment')
        if (data?.authorized) {
          clearInterval(intervalo)
          await refreshProfile()
          return
        }
      } catch {
        // ignora erros pontuais de rede e tenta novamente
      }
      tentativas++
      if (tentativas >= 15) {
        clearInterval(intervalo)
        setVerificando(false)
      }
    }, 3000)

    return () => clearInterval(intervalo)
  }, [])

  function handleAssinar(planId) {
    const plano = PLANOS.find(p => p.id === planId)
    setErro('')
    if (temCartaoSalvo) {
      setSavedCardData({ plan: planId, amount: plano.amount })
    } else {
      setCardBricksData({ plan: planId, amount: plano.amount })
    }
  }

  function handleNovoCartao(planId) {
    const plano = PLANOS.find(p => p.id === planId)
    setErro('')
    setSavedCardData(null)
    setCardBricksData({ plan: planId, amount: plano.amount })
  }

  async function handlePix(planId) {
    setLoadingPix(planId)
    setErro('')
    try {
      const { data, error } = await supabase.functions.invoke('create-pix', {
        body: { plan: planId },
      })
      if (error) throw new Error(error.message || 'Erro na função')
      if (!data?.qr_code) throw new Error(data?.error || 'Pix sem QR code')
      setPixData(data)
    } catch (err) {
      setErro(err.message)
    } finally {
      setLoadingPix(null)
    }
  }

  async function handlePagoPix() {
    await refreshProfile()
    setPixData(null)
  }

  async function handlePagoCard() {
    await refreshProfile()
    setCardBricksData(null)
    setSavedCardData(null)
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
    <>
      <SocialProofToast />

      {pixData && (
        <PixModal
          pixData={pixData}
          onClose={() => setPixData(null)}
          onPago={handlePagoPix}
        />
      )}

      {cardBricksData && (
        <CardBricksModal
          plan={cardBricksData.plan}
          amount={cardBricksData.amount}
          saveCard={saveCard}
          onClose={() => setCardBricksData(null)}
          onPago={handlePagoCard}
        />
      )}

      {savedCardData && (
        <SavedCardModal
          plan={savedCardData.plan}
          cardLastFour={profile?.mp_card_last_four}
          cardBrand={profile?.mp_card_brand}
          onClose={() => setSavedCardData(null)}
          onPago={handlePagoCard}
        />
      )}

      <div className="h-screen overflow-y-auto flex flex-col"
        style={{ background: 'linear-gradient(160deg, rgb(var(--ac)) 0%, rgb(var(--ac-dk)) 100%)' }}>
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-24 -right-24 w-72 h-72 rounded-full bg-white opacity-5" />
          <div className="absolute top-32 -left-16 w-48 h-48 rounded-full bg-white opacity-5" />
          <div className="absolute bottom-32 right-8 w-32 h-32 rounded-full bg-white opacity-5" />
        </div>

        <div className="flex flex-col items-center px-6 pt-14 pb-8 relative">
          <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center shadow-2xl mb-3">
            <span className="text-3xl">❄️</span>
          </div>
          <h1 className="text-white text-2xl font-extrabold tracking-tight">ClimaPro</h1>

          <div className="mt-5 text-center">
            {expirado ? (
              <>
                <p className="text-white text-lg font-bold">Assine para começar a usar</p>
                <p className="ac-text-sf text-sm mt-1">Escolha o plano ideal para você</p>
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

          {temCartaoSalvo && (
            <div className="w-full max-w-sm mt-5 flex items-center gap-2 bg-white/10 border border-white/20 rounded-xl px-4 py-2.5">
              <span className="text-base">💳</span>
              <p className="text-xs text-white/80 flex-1">
                {BRAND_LABEL[profile.mp_card_brand] ?? 'Cartão'} •••• {profile.mp_card_last_four} salvo
              </p>
              <button
                onClick={() => handleNovoCartao(PLANOS[0].id)}
                className="text-xs text-white/60 underline"
              >
                Trocar
              </button>
            </div>
          )}

          <div className="w-full max-w-sm mt-5 space-y-4">
            {PLANOS.map(plano => {
              const carregandoPix = loadingPix === plano.id
              return (
                <div
                  key={plano.id}
                  className={`w-full rounded-2xl p-5 shadow-xl ${
                    plano.destaque ? 'bg-white' : 'bg-white/10 border border-white/30'
                  }`}
                >
                  <div className="flex items-start justify-between mb-4">
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

                  <button
                    onClick={() => handleAssinar(plano.id)}
                    disabled={!!loadingPix}
                    className={`w-full py-2.5 rounded-xl text-center text-sm font-bold text-white mb-1 disabled:opacity-70 transition-opacity ${
                      plano.destaque ? 'btn-pulse' : 'bg-white/15'
                    }`}
                    style={plano.destaque ? { background: 'rgb(var(--ac))' } : {}}
                  >
                    {temCartaoSalvo
                      ? `Cartão •••• ${profile.mp_card_last_four}`
                      : 'Cartão de crédito'}
                  </button>

                  {!temCartaoSalvo && (
                    <label className={`flex items-center gap-2 mb-2 px-1 cursor-pointer select-none`}>
                      <input
                        type="checkbox"
                        checked={saveCard}
                        onChange={e => setSaveCard(e.target.checked)}
                        className="w-3.5 h-3.5 rounded accent-sky-500"
                      />
                      <span className={`text-xs ${plano.destaque ? 'text-gray-400' : 'text-white/60'}`}>
                        Salvar cartão para renovação automática
                      </span>
                    </label>
                  )}

                  <button
                    onClick={() => handlePix(plano.id)}
                    disabled={!!loadingPix}
                    className={`w-full py-2.5 rounded-xl text-center text-sm font-bold disabled:opacity-70 transition-opacity ${
                      plano.destaque
                        ? 'bg-green-500 text-white hover:bg-green-600 btn-pulse-green'
                        : 'bg-green-500/90 text-white hover:bg-green-500'
                    }`}
                    style={plano.destaque ? { animationDelay: '1s' } : {}}
                  >
                    {carregandoPix ? 'Gerando Pix...' : 'Pix'}
                  </button>
                </div>
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
    </>
  )
}
