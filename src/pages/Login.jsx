import { useState, useEffect, useRef } from 'react'
import { useAuth } from '../hooks/useAuth'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { getTracking } from '../lib/tracking'

const EMAIL_KEY = 'climapro_email'
const MP_PUBLIC_KEY = import.meta.env.VITE_MP_PUBLIC_KEY

const PLANOS_SIGNUP = [
  {
    id: 'monthly',
    label: 'Básico',
    destaque: false,
    preco: 'R$ 19,90',
    periodo: '/mês',
    equivalente: null,
    economia: null,
    descricao: 'Cancele quando quiser',
    amount: 19.90,
  },
  {
    id: 'plus',
    label: 'Técnico Plus',
    destaque: true,
    preco: 'R$ 29,90',
    periodo: '/mês',
    equivalente: null,
    economia: 'Recomendado',
    descricao: 'Tudo do Básico + muito mais por só R$10 a mais',
    features: [
      'Relatório de faturamento mensal',
      'Histórico completo de OS por cliente',
      'Notificações com som de alerta',
      'Lembretes avançados de atendimento',
    ],
    amount: 29.90,
  },
  {
    id: 'professional',
    label: 'Profissional',
    destaque: true,
    preco: 'R$ 39,90',
    periodo: '/mês',
    equivalente: null,
    economia: 'Mais vendido',
    descricao: 'Recursos completos + relatório',
    amount: 39.90,
  },
  {
    id: 'annual',
    label: 'Anual',
    destaque: false,
    preco: 'R$ 149,90',
    periodo: '/ano',
    equivalente: 'R$ 12,49/mês',
    economia: 'Economize 37%',
    descricao: 'Melhor custo-benefício',
    amount: 149.90,
  },
  {
    id: 'monthly_saida50',
    label: 'Básico',
    destaque: false,
    preco: 'R$ 9,95',
    precoOriginal: 'R$ 19,90',
    periodo: '/mês',
    equivalente: null,
    economia: '50% OFF',
    descricao: 'Cancele quando quiser',
    amount: 9.95,
    ofertaEspecial: true,
  },
]

function AppIcon({ size = 64, rounded = 'rounded-2xl', className = '' }) {
  return (
    <div className={`${rounded} overflow-hidden shadow-2xl ${className}`} style={{ width: size, height: size, flexShrink: 0 }}>
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024" width={size} height={size}>
        <defs>
          <linearGradient id="aibg" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#38bdf8"/>
            <stop offset="100%" stopColor="#0369a1"/>
          </linearGradient>
        </defs>
        <rect width="1024" height="1024" fill="url(#aibg)"/>
        <g stroke="white" strokeLinecap="round" fill="none">
          <line x1="512" y1="232" x2="512" y2="792" strokeWidth="52"/>
          <line x1="754" y1="372" x2="270" y2="652" strokeWidth="52"/>
          <line x1="270" y1="372" x2="754" y2="652" strokeWidth="52"/>
          <line x1="512" y1="232" x2="434" y2="187" strokeWidth="40"/>
          <line x1="512" y1="232" x2="590" y2="187" strokeWidth="40"/>
          <line x1="512" y1="792" x2="434" y2="837" strokeWidth="40"/>
          <line x1="512" y1="792" x2="590" y2="837" strokeWidth="40"/>
          <line x1="754" y1="372" x2="832" y2="417" strokeWidth="40"/>
          <line x1="754" y1="372" x2="754" y2="282" strokeWidth="40"/>
          <line x1="270" y1="652" x2="190" y2="607" strokeWidth="40"/>
          <line x1="270" y1="652" x2="270" y2="742" strokeWidth="40"/>
          <line x1="270" y1="372" x2="270" y2="282" strokeWidth="40"/>
          <line x1="270" y1="372" x2="190" y2="417" strokeWidth="40"/>
          <line x1="754" y1="652" x2="754" y2="742" strokeWidth="40"/>
          <line x1="754" y1="652" x2="832" y2="607" strokeWidth="40"/>
        </g>
        <circle cx="512" cy="512" r="34" fill="white"/>
      </svg>
    </div>
  )
}

function IconOlhoAberto() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
    </svg>
  )
}

function IconOlhoFechado() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
    </svg>
  )
}

function SignupUpsellModal({ method, onEscolha }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70">
      <div className="bg-white rounded-t-3xl w-full max-w-sm mx-auto shadow-2xl overflow-hidden">
        {/* Cabeçalho em gradiente */}
        <div className="px-6 pt-5 pb-6 text-white" style={{ background: 'linear-gradient(135deg, rgb(var(--ac)) 0%, rgb(var(--ac-dk)) 100%)' }}>
          <div className="w-10 h-1 bg-white/30 rounded-full mx-auto mb-4" />
          <div className="inline-flex items-center gap-1.5 bg-white/20 rounded-full px-3 py-1 mb-3">
            <span className="text-xs font-bold tracking-wide">⚡ OFERTA ESPECIAL</span>
          </div>
          <h2 className="text-xl font-extrabold leading-tight mb-1">
            Upgrade para o Técnico Plus?
          </h2>
          <p className="text-white/80 text-sm">
            Por apenas <strong className="text-white">R$10 a mais</strong> você desbloqueia recursos que economizam horas de trabalho.
          </p>
        </div>

        {/* Corpo */}
        <div className="px-6 py-5">
          {/* Preço */}
          <div className="flex items-center justify-between mb-4 bg-gray-50 rounded-2xl px-4 py-3">
            <div>
              <p className="font-bold text-gray-800 text-base">Técnico Plus</p>
              <p className="text-xs text-gray-400 mt-0.5">antes <span className="line-through">R$ 39,90/mês</span></p>
            </div>
            <div className="text-right">
              <p className="text-3xl font-extrabold text-gray-900 leading-none">R$ 29,90</p>
              <p className="text-xs text-gray-400">/mês</p>
              <span className="inline-block bg-emerald-100 text-emerald-700 text-xs font-bold px-2 py-0.5 rounded-full mt-1">
                só +R$10 vs Básico
              </span>
            </div>
          </div>

          {/* Features */}
          <ul className="space-y-3 mb-5">
            {[
              { icon: '📊', text: 'Relatório de faturamento' },
              { icon: '📋', text: 'Histórico completo de OS por cliente' },
              { icon: '🔔', text: 'Notificações com som' },
              { icon: '✅', text: 'Cancele quando quiser' },
            ].map(({ icon, text }) => (
              <li key={text} className="flex items-center gap-3">
                <span className="text-base w-6 text-center flex-shrink-0">{icon}</span>
                <span className="text-sm text-gray-700 font-medium">{text}</span>
              </li>
            ))}
          </ul>

          {/* CTAs */}
          <button
            onClick={() => onEscolha('plus', method)}
            className="w-full py-3.5 rounded-2xl text-sm font-bold text-white shadow-lg mb-2"
            style={{ background: 'linear-gradient(135deg, rgb(var(--ac)), rgb(var(--ac-dk)))' }}
          >
            Assinar Técnico Plus — R$ 29,90/mês
          </button>
          <button
            onClick={() => onEscolha('monthly', method)}
            className="w-full py-2.5 text-sm text-gray-400 font-medium"
          >
            Não, continuar com o Básico (R$ 19,90)
          </button>
        </div>
      </div>
    </div>
  )
}

function SignupCardBricksModal({ plan, amount, pendingSignup, utms, onClose, onPago }) {
  const [brickLoaded, setBrickLoaded] = useState(false)
  const [erro, setErro] = useState('')
  const controllerRef = useRef(null)

  useEffect(() => {
    function initBrick() {
      const mp = new window.MercadoPago(MP_PUBLIC_KEY, { locale: 'pt-BR' })
      mp.bricks().create('cardPayment', 'signup-card-container', {
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
              const { data, error } = await supabase.functions.invoke('signup-subscribe-card', {
                body: { ...pendingSignup, plan, cardFormData: formData, saveCard: true, utms, page_url: window.location.href },
              })
              if (error) throw new Error(error.message)
              if (data?.error) throw new Error(data.error)
              if (data?.status === 'approved') {
                onPago(data.payment_id)
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

        <div id="signup-card-container" />

        {erro && (
          <p className="mt-3 text-sm bg-red-50 text-red-600 p-3 rounded-xl">{erro}</p>
        )}
      </div>
    </div>
  )
}

function SignupPixModal({ pixData, onClose, onPago }) {
  const [copiado, setCopiado] = useState(false)

  useEffect(() => {
    let tentativas = 0
    const intervalo = setInterval(async () => {
      try {
        const { data } = await supabase.functions.invoke('verify-pix-anon', {
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

export default function Login() {
  const { signIn, resetPassword } = useAuth()
  const navigate = useNavigate()

  const searchParams = new URLSearchParams(window.location.search)
  const initialModo = searchParams.get('modo') === 'cadastro' ? 'cadastro' : 'login'
  const cupom = searchParams.get('cupom')
  const planoPre = (() => {
    const raw = searchParams.get('plano')
    if (cupom === 'SAIDA50' && raw === 'monthly') return 'monthly_saida50'
    return raw
  })()
  const [modo, setModo] = useState(initialModo)
  const [form, setForm] = useState(() => ({
    nome: '',
    telefone: '',
    email:    localStorage.getItem(EMAIL_KEY) || '',
    password: '',
  }))
  const [erro, setErro] = useState('')
  const [loading, setLoading] = useState(false)
  const [senhaVisivel, setSenhaVisivel] = useState(false)
  const [lembrarEmail, setLembrarEmail] = useState(() => !!localStorage.getItem(EMAIL_KEY))

  // Estado do fluxo de cadastro com pagamento antecipado
  const [pendingSignup, setPendingSignup] = useState(null) // { nome, email, password, telefone }
  const [signupPixData, setSignupPixData] = useState(null)
  const [showSignupPixModal, setShowSignupPixModal] = useState(false)
  const [signupCardData, setSignupCardData] = useState(null)
  const [loadingSignupPix, setLoadingSignupPix] = useState(null)
  const [signupUpsellMethod, setSignupUpsellMethod] = useState(null)

  // Pré-carrega o SDK do MP assim que entra na tela de planos
  useEffect(() => {
    if (modo !== 'planos') return
    if (window.MercadoPago || document.querySelector('script[src*="mercadopago"]')) return
    const script = document.createElement('script')
    script.src = 'https://sdk.mercadopago.com/js/v2'
    document.head.appendChild(script)
  }, [modo])

  function toggleLembrarEmail(checked) {
    setLembrarEmail(checked)
    if (!checked) localStorage.removeItem(EMAIL_KEY)
  }

  const set = (campo) => (e) => setForm(f => ({ ...f, [campo]: e.target.value }))

  async function handleSubmit(e) {
    e.preventDefault()
    setErro('')
    setLoading(true)

    if (modo === 'recuperar') {
      if (!form.email.includes('@')) {
        setErro('Para recuperar a senha, informe seu email.')
        setLoading(false)
        return
      }
      const { error } = await resetPassword(form.email)
      if (error) setErro('Não foi possível enviar o email. Verifique o endereço.')
      else setErro('✅ Email de recuperação enviado! Verifique sua caixa de entrada.')
      setLoading(false)
      return
    }

    if (modo === 'login') {
      const { error } = await signIn(form.email, form.password)
      if (error) {
        const msg = error.message || ''
        if (msg === 'phone_not_found') {
          setErro('Telefone não encontrado. Verifique o número ou use seu email.')
        } else if (msg.includes('fetch') || msg.includes('network') || msg.includes('NetworkError') || msg.includes('Failed')) {
          setErro('Sem conexão com a internet. Verifique sua rede.')
        } else {
          setErro('Email/telefone ou senha incorretos.')
        }
      } else {
        if (lembrarEmail) localStorage.setItem(EMAIL_KEY, form.email)
        else localStorage.removeItem(EMAIL_KEY)
      }
      setLoading(false)
      return
    }

    // modo === 'cadastro': valida e vai para seleção de plano (sem criar conta ainda)
    if (!form.nome.trim()) { setErro('Digite seu nome.'); setLoading(false); return }
    if (!form.email.includes('@')) { setErro('Email inválido.'); setLoading(false); return }
    if (form.password.length < 8) { setErro('A senha deve ter no mínimo 8 caracteres.'); setLoading(false); return }

    const ref_code = localStorage.getItem('climapro_ref') || undefined
    setPendingSignup({
      nome:     form.nome.trim(),
      email:    form.email.trim().toLowerCase(),
      password: form.password,
      telefone: form.telefone,
      ref_code,
    })
    setModo('planos')
    setLoading(false)
  }

  function trocarModo(novoModo) {
    setModo(novoModo)
    setErro('')
    setSenhaVisivel(false)
    if (novoModo !== 'planos') {
      setPendingSignup(null)
      setSignupPixData(null)
      setShowSignupPixModal(false)
    }
  }

  // Dispara no momento em que o usuário escolhe uma forma de pagamento para um
  // plano — o InitiateCheckout do Meta Pixel não existia antes desta correção.
  function dispararInitiateCheckout(planId) {
    const plano = PLANOS_SIGNUP.find(p => p.id === planId)
    if (window.fbq) {
      window.fbq('track', 'InitiateCheckout', { value: plano?.amount ?? 0, currency: 'BRL', content_name: planId })
    }
  }

  function handleSignupUpsellEscolha(planId, method) {
    setSignupUpsellMethod(null)
    dispararInitiateCheckout(planId)
    if (method === 'card') {
      const plano = PLANOS_SIGNUP.find(p => p.id === planId)
      setErro('')
      setSignupCardData({ plan: planId, amount: plano.amount })
    } else {
      iniciarSignupPix(planId)
    }
  }

  async function handleSignupCard(planId) {
    const plano = PLANOS_SIGNUP.find(p => p.id === planId)
    setErro('')
    dispararInitiateCheckout(planId)
    setSignupCardData({ plan: planId, amount: plano.amount })
  }

  function handleSignupPix(planId) {
    iniciarSignupPix(planId)
  }

  async function iniciarSignupPix(planId) {
    if (!pendingSignup) return
    dispararInitiateCheckout(planId)
    // Se já tem QR code para este plano, só reabre o modal sem chamar o backend
    if (signupPixData?.plan === planId) {
      setShowSignupPixModal(true)
      return
    }
    setLoadingSignupPix(planId)
    setErro('')
    try {
      const body = { ...pendingSignup, plan: planId, utms: getTracking(), page_url: window.location.href }
      // Se o usuário já foi criado numa tentativa anterior, passa o ID para evitar erro de duplicidade
      if (signupPixData?.user_id) body.existing_user_id = signupPixData.user_id
      const { data, error } = await supabase.functions.invoke('signup-create-pix', { body })
      if (error) throw new Error(error.message || 'Erro na função')
      if (data?.error) throw new Error(data.error)
      if (!data?.qr_code) throw new Error('Pix sem QR code')
      setSignupPixData(data)
      setShowSignupPixModal(true)
    } catch (err) {
      setErro(err.message)
    } finally {
      setLoadingSignupPix(null)
    }
  }

  async function handleSignupPixPago() {
    if (!pendingSignup) return
    const plano = PLANOS_SIGNUP.find(p => p.id === signupPixData?.plan)
    const paymentId = signupPixData?.payment_id
    setSignupPixData(null)
    setShowSignupPixModal(false)
    if (window.fbq) {
      window.fbq('track', 'Lead')
      // eventID = payment_id: permite a Meta deduplicar com o evento equivalente
      // enviado pelo servidor via Conversions API no webhook do Mercado Pago.
      window.fbq('track', 'Purchase', { value: plano?.amount ?? 0, currency: 'BRL' }, { eventID: String(paymentId) })
    }
    if (window.ttq) window.ttq.track('CompleteRegistration')
    if (window.utmify) window.utmify('track', 'Purchase', { value: plano?.amount ?? 0, currency: 'BRL', paymentMethod: 'pix', installments: 1 })
    const { error } = await signIn(pendingSignup.email, pendingSignup.password)
    if (error) {
      trocarModo('login')
      setForm(f => ({ ...f, email: pendingSignup.email, password: '' }))
      setErro('✅ Pagamento confirmado! Faça login para continuar.')
    }
    setPendingSignup(null)
  }

  async function handleSignupCardPago(paymentId) {
    if (!pendingSignup) return
    const plano = PLANOS_SIGNUP.find(p => p.id === signupCardData?.plan)
    setSignupCardData(null)
    if (window.fbq) {
      window.fbq('track', 'Lead')
      window.fbq('track', 'Purchase', { value: plano?.amount ?? 0, currency: 'BRL' }, { eventID: String(paymentId) })
    }
    if (window.ttq) window.ttq.track('CompleteRegistration')
    if (window.utmify) window.utmify('track', 'Purchase', { value: plano?.amount ?? 0, currency: 'BRL', paymentMethod: 'credit_card', installments: 1 })
    const { error } = await signIn(pendingSignup.email, pendingSignup.password)
    if (error) {
      trocarModo('login')
      setForm(f => ({ ...f, email: pendingSignup.email, password: '' }))
      setErro('✅ Pagamento confirmado! Faça login para continuar.')
    }
    setPendingSignup(null)
  }

  // ──────────────────────────────────────────────
  // Tela de seleção de plano (pós-preenchimento do cadastro)
  // ──────────────────────────────────────────────
  if (modo === 'planos') {
    return (
      <>
        {signupUpsellMethod && (
          <SignupUpsellModal
            method={signupUpsellMethod}
            onEscolha={handleSignupUpsellEscolha}
            onFechar={() => setSignupUpsellMethod(null)}
          />
        )}

        {signupPixData && showSignupPixModal && (
          <SignupPixModal
            pixData={signupPixData}
            onClose={() => setShowSignupPixModal(false)}
            onPago={handleSignupPixPago}
          />
        )}

        {signupCardData && (
          <SignupCardBricksModal
            plan={signupCardData.plan}
            amount={signupCardData.amount}
            pendingSignup={pendingSignup}
            utms={getTracking()}
            onClose={() => setSignupCardData(null)}
            onPago={handleSignupCardPago}
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
            <button
              onClick={() => trocarModo('cadastro')}
              className="self-start text-white/70 text-sm font-semibold flex items-center gap-1 mb-6"
            >
              ← Voltar
            </button>

            <AppIcon size={64} rounded="rounded-2xl" className="mb-3" />
            <h1 className="text-white text-2xl font-extrabold tracking-tight">ClimaPro</h1>

            <div className="mt-4 text-center">
              <p className="text-white text-lg font-bold">Escolha seu plano</p>
              <p className="ac-text-sf text-sm mt-1">Assine agora e comece a usar imediatamente</p>
            </div>

            <div className="w-full max-w-sm mt-8 space-y-4">
              {[...PLANOS_SIGNUP]
                .filter(p => {
                  if (planoPre === 'monthly') return p.id === 'plus' || p.id === 'monthly'
                  if (planoPre) return p.id === planoPre
                  if (p.id === 'plus') return false
                  return p.id !== 'monthly_saida50'
                })
                .sort((a, b) => {
                  if (planoPre === 'monthly') return a.id === 'plus' ? -1 : 1
                  return planoPre ? (a.id === planoPre ? -1 : 1) : 0
                })
                .map(plano => {
                const carregandoPix = loadingSignupPix === plano.id
                const isEscolhido = planoPre && plano.id === planoPre
                return (
                  <div
                    key={plano.id}
                    className={`w-full rounded-2xl p-5 shadow-xl ${
                      plano.destaque ? 'bg-white' : 'bg-white/10 border border-white/30'
                    }`}
                    style={isEscolhido && !plano.destaque ? { background: 'rgba(255,255,255,0.18)', borderColor: 'rgba(255,255,255,0.6)' } : {}}
                  >
                    {plano.ofertaEspecial && (
                      <div className="flex items-center gap-1.5 mb-3 text-yellow-300 text-xs font-bold">
                        <span>🏷️</span>
                        <span>Oferta exclusiva de saída — apenas agora</span>
                      </div>
                    )}
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`text-base font-bold ${plano.destaque ? 'text-gray-800' : 'text-white'}`}>
                            {plano.label}
                          </span>
                          {plano.economia && (
                            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full text-white ${plano.ofertaEspecial ? 'bg-green-500' : ''}`}
                              style={!plano.ofertaEspecial ? { background: 'rgb(var(--ac))' } : {}}>
                              {plano.economia}
                            </span>
                          )}
                          {isEscolhido && (
                            <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-emerald-500 text-white">
                              ✓ Sua escolha
                            </span>
                          )}
                        </div>
                        <p className={`text-xs mt-0.5 ${plano.destaque ? 'text-gray-500' : 'text-white/70'}`}>
                          {plano.descricao}
                        </p>
                      </div>
                      <div className="text-right">
                        {plano.precoOriginal && (
                          <p className="text-xs text-white/50 line-through mb-0.5">{plano.precoOriginal}/mês</p>
                        )}
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

                    {plano.features && (
                      <ul className="mb-4 space-y-1.5">
                        {plano.features.map(f => (
                          <li key={f} className="flex items-center gap-2">
                            <span className="w-4 h-4 rounded-full bg-green-500 flex items-center justify-center flex-shrink-0">
                              <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5"/></svg>
                            </span>
                            <span className="text-sm text-gray-600">{f}</span>
                          </li>
                        ))}
                      </ul>
                    )}

                    <button
                      onClick={() => handleSignupCard(plano.id)}
                      disabled={!!loadingSignupPix}
                      className={`w-full py-2.5 rounded-xl text-center text-sm font-bold text-white mb-2 disabled:opacity-70 transition-opacity ${
                        plano.destaque ? '' : 'bg-white/15'
                      }`}
                      style={plano.destaque ? { background: 'rgb(var(--ac))' } : {}}
                    >
                      Cartão de crédito
                    </button>

                    <button
                      onClick={() => handleSignupPix(plano.id)}
                      disabled={!!loadingSignupPix}
                      className={`w-full py-2.5 rounded-xl text-center text-sm font-bold disabled:opacity-70 transition-opacity ${
                        plano.destaque
                          ? 'bg-green-500 text-white hover:bg-green-600'
                          : 'bg-green-500/90 text-white hover:bg-green-500'
                      }`}
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
          </div>
        </div>
      </>
    )
  }

  // ──────────────────────────────────────────────
  // Telas de login / cadastro / recuperar senha
  // ──────────────────────────────────────────────
  return (
    <div className="h-screen flex flex-col" style={{ background: 'linear-gradient(160deg, rgb(var(--ac)) 0%, rgb(var(--ac-dk)) 100%)' }}>
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-24 -right-24 w-72 h-72 rounded-full bg-white opacity-5" />
        <div className="absolute top-32 -left-16 w-48 h-48 rounded-full bg-white opacity-5" />
        <div className="absolute bottom-32 right-8 w-32 h-32 rounded-full bg-white opacity-5" />
      </div>

      <div className="flex flex-col items-center justify-center px-6 pt-16 pb-8 relative">
        <button
          onClick={() => navigate('/')}
          className="absolute top-6 left-6 text-white/70 text-sm font-semibold flex items-center gap-1"
        >
          ← Voltar
        </button>
        <AppIcon size={80} rounded="rounded-3xl" className="mb-4" />
        <h1 className="text-white text-3xl font-extrabold tracking-tight">ClimaPro</h1>
        <p className="ac-text-sf text-sm mt-1 font-medium">Ordens de Serviço para Técnicos</p>
      </div>

      <div className="bg-white rounded-t-3xl px-6 pt-8 pb-10 shadow-2xl relative flex-1 min-h-0 overflow-y-auto">
        <h2 className="text-xl font-bold text-gray-800 mb-6">
          {modo === 'login' && 'Entrar na conta'}
          {modo === 'cadastro' && 'Criar conta'}
          {modo === 'recuperar' && 'Recuperar senha'}
        </h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          {modo === 'cadastro' && (
            <>
              <div>
                <label className="block text-sm font-semibold text-gray-600 mb-1.5">Seu nome</label>
                <input
                  type="text"
                  className="input-field"
                  placeholder="Ex: João Silva"
                  value={form.nome}
                  onChange={set('nome')}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-600 mb-1.5">
                  WhatsApp <span className="text-gray-400 font-normal">(opcional)</span>
                </label>
                <input
                  type="tel"
                  inputMode="tel"
                  className="input-field"
                  placeholder="(11) 99999-9999"
                  value={form.telefone}
                  onChange={set('telefone')}
                  autoComplete="tel"
                />
                <p className="text-xs text-gray-400 mt-1">Permite fazer login pelo número de telefone</p>
              </div>
            </>
          )}

          <div>
            <label className="block text-sm font-semibold text-gray-600 mb-1.5">
              {modo === 'login' ? 'Email ou telefone' : 'Email'}
            </label>
            <input
              type="text"
              inputMode={modo === 'login' && /^[\d(+]/.test(form.email) ? 'tel' : 'email'}
              className="input-field"
              placeholder={modo === 'login' ? 'email@exemplo.com ou (11) 99999-9999' : 'seu@email.com'}
              value={form.email}
              onChange={set('email')}
              autoCapitalize="none"
              required
            />
          </div>

          {modo !== 'recuperar' && (
            <div>
              <label className="block text-sm font-semibold text-gray-600 mb-1.5">Senha</label>
              <div className="relative">
                <input
                  type={senhaVisivel ? 'text' : 'password'}
                  className="input-field pr-12"
                  placeholder="••••••••"
                  value={form.password}
                  onChange={set('password')}
                  autoComplete={modo === 'cadastro' ? 'new-password' : 'current-password'}
                  minLength={8}
                  required
                />
                <button
                  type="button"
                  onClick={() => setSenhaVisivel(v => !v)}
                  aria-label={senhaVisivel ? 'Ocultar senha' : 'Mostrar senha'}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                  tabIndex={-1}
                >
                  {senhaVisivel ? <IconOlhoFechado /> : <IconOlhoAberto />}
                </button>
              </div>

              <div className="flex items-center justify-between mt-2.5">
                {modo === 'login' && (
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={lembrarEmail}
                      onChange={e => toggleLembrarEmail(e.target.checked)}
                      className="w-4 h-4 rounded"
                      style={{ accentColor: 'rgb(var(--ac))' }}
                    />
                    <span className="text-sm text-gray-500">Lembrar email</span>
                  </label>
                )}
                {modo === 'login' && (
                  <button
                    type="button"
                    onClick={() => trocarModo('recuperar')}
                    className="text-xs ac-text font-semibold"
                  >
                    Esqueci minha senha
                  </button>
                )}
              </div>
            </div>
          )}

          {erro && (
            <p className={`text-sm p-3 rounded-xl ${erro.startsWith('✅') ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'}`}>
              {erro}
            </p>
          )}

          <button type="submit" className="btn-primary mt-2" disabled={loading}>
            {loading
              ? 'Aguarde...'
              : modo === 'login'
                ? 'Entrar'
                : modo === 'cadastro'
                  ? 'Ver planos →'
                  : 'Enviar email de recuperação'}
          </button>
        </form>

        {modo === 'recuperar' ? (
          <button
            onClick={() => trocarModo('login')}
            className="w-full text-center ac-text font-semibold text-sm mt-5 py-2"
          >
            ← Voltar para o login
          </button>
        ) : (
          <button
            onClick={() => trocarModo(modo === 'login' ? 'cadastro' : 'login')}
            className="w-full text-center ac-text font-semibold text-sm mt-5 py-2"
          >
            {modo === 'login' ? 'Não tem conta? Cadastre-se' : 'Já tem conta? Entrar'}
          </button>
        )}
      </div>
    </div>
  )
}
