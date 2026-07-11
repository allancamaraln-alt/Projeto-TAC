import { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { getTracking } from '../lib/tracking'

const MP_PUBLIC_KEY = import.meta.env.VITE_MP_PUBLIC_KEY
const ADDON_AMOUNT = 19.90

export function AddonCardModal({ onClose, onPago }) {
  const [brickLoaded, setBrickLoaded] = useState(false)
  const [erro, setErro] = useState('')
  const controllerRef = useRef(null)

  useEffect(() => {
    function initBrick() {
      const mp = new window.MercadoPago(MP_PUBLIC_KEY, { locale: 'pt-BR' })
      mp.bricks().create('cardPayment', 'mp-addon-card-container', {
        initialization: { amount: ADDON_AMOUNT },
        customization: {
          paymentMethods: { maxInstallments: 1 },
          visual: { hideFormTitle: true },
        },
        callbacks: {
          onReady: () => setBrickLoaded(true),
          onSubmit: async (formData) => {
            setErro('')
            try {
              const { data, error } = await supabase.functions.invoke('process-addon-card-payment', {
                body: { cardFormData: formData, saveCard: true, utms: getTracking() },
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
          onError: (error) => console.error('Brick error (addon):', error),
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
    <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/60 px-4">
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

        <div id="mp-addon-card-container" />

        {erro && (
          <p className="mt-3 text-sm bg-red-50 text-red-600 p-3 rounded-xl">{erro}</p>
        )}
      </div>
    </div>
  )
}

export function AddonPixModal({ onClose, onPago }) {
  const [pixData, setPixData] = useState(null)
  const [erro, setErro] = useState('')
  const [copiado, setCopiado] = useState(false)

  useEffect(() => {
    async function iniciar() {
      const { data, error } = await supabase.functions.invoke('create-addon-pix', {
        body: { utms: getTracking() },
      })
      if (error) { setErro(error.message); return }
      if (data?.error) { setErro(data.error); return }
      setPixData(data)
    }
    iniciar()
  }, [])

  useEffect(() => {
    if (!pixData) return
    let tentativas = 0
    const intervalo = setInterval(async () => {
      try {
        const { data } = await supabase.functions.invoke('verify-addon-pix', {
          body: { payment_id: pixData.payment_id },
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
  }, [pixData])

  async function copiar() {
    await navigator.clipboard.writeText(pixData.qr_code)
    setCopiado(true)
    setTimeout(() => setCopiado(false), 3000)
  }

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/60 px-4">
      <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-gray-800">Pagar com Pix</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">&times;</button>
        </div>

        {erro && (
          <p className="mb-3 text-sm bg-red-50 text-red-600 p-3 rounded-xl">{erro}</p>
        )}

        {!pixData && !erro && (
          <div className="flex justify-center py-8">
            <span className="w-7 h-7 border-[3px] border-gray-200 border-t-sky-500 rounded-full animate-spin" />
          </div>
        )}

        {pixData && (
          <>
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
          </>
        )}
      </div>
    </div>
  )
}
