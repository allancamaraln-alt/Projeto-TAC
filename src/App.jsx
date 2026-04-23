import * as Sentry from "@sentry/react"
import { lazy, Suspense, useEffect, useState } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './hooks/useAuth'
import { ToastProvider } from './hooks/useToast'
import { useBiometric } from './hooks/useBiometric'
import BottomNav from './components/BottomNav'
import { getTheme, applyTheme } from './lib/theme'
import Login from './pages/Login'

// Inicializar Sentry
Sentry.init({
  dsn: "https://39e93ed64894fb89acb4b451fdb4a136@o4511269979291648.ingest.us.sentry.io/4511270012846080",
  tracesSampleRate: 1.0,
  environment: "production"
})
Sentry.captureMessage("ClimaPro: Sentry conectado com sucesso")

const Dashboard    = lazy(() => import('./pages/Dashboard'))
const Clientes     = lazy(() => import('./pages/Clientes'))
const ClienteDetalhe = lazy(() => import('./pages/ClienteDetalhe'))
const ClienteForm  = lazy(() => import('./pages/ClienteForm'))
const OrdensList   = lazy(() => import('./pages/OrdensList'))
const OrdemForm    = lazy(() => import('./pages/OrdemForm'))
const OrdemDetalhe = lazy(() => import('./pages/OrdemDetalhe'))
const OrdemEdit    = lazy(() => import('./pages/OrdemEdit'))
const Perfil       = lazy(() => import('./pages/Perfil'))
const Relatorio    = lazy(() => import('./pages/Relatorio'))
const Lembretes    = lazy(() => import('./pages/Lembretes'))

function PageLoader() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <span className="w-7 h-7 border-[3px] border-gray-200 border-t-sky-500 rounded-full animate-spin" />
    </div>
  )
}

function IconDigital() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 11c0 3.517-1.009 6.799-2.753 9.571m-3.44-2.04l.054-.09A13.916 13.916 0 008 11a4 4 0 118 0c0 1.017-.07 2.019-.203 3m-2.118 6.844A21.88 21.88 0 0015.171 17m3.839 1.132c.645-2.266.99-4.659.99-7.132A8 8 0 008 4.07M3 15.364c.64-1.319 1-2.8 1-4.364 0-1.457.39-2.823 1.07-4" />
    </svg>
  )
}

function BiometricPrompt({ onDone }) {
  const biometric = useBiometric()
  const [loading, setLoading] = useState(false)
  const [erro, setErro] = useState('')

  async function handleEnable() {
    setLoading(true)
    setErro('')
    const { error } = await biometric.enable()
    if (error) {
      setErro(error)
      setLoading(false)
    } else {
      onDone()
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end" style={{ background: 'rgba(0,0,0,0.45)' }}>
      <div className="bg-white rounded-t-3xl px-6 pt-8 pb-10 w-full shadow-2xl">
        <div className="text-center mb-6">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-3 ac-bg-sf">
            <span className="ac-text"><IconDigital /></span>
          </div>
          <h2 className="text-xl font-bold text-gray-800">Ativar login biométrico</h2>
          <p className="text-gray-500 text-sm mt-2">
            Entre mais rápido com Face ID ou impressão digital nas próximas vezes.
          </p>
        </div>

        {erro && (
          <p className="text-red-600 text-sm p-3 bg-red-50 rounded-xl mb-4 text-center">{erro}</p>
        )}

        <button onClick={handleEnable} disabled={loading} className="btn-primary">
          {loading ? 'Ativando...' : 'Ativar agora'}
        </button>
        <button
          onClick={() => { localStorage.setItem('climapro_biometric_declined', '1'); onDone() }}
          className="w-full text-center text-gray-400 font-semibold text-sm mt-4 py-2"
        >
          Agora não
        </button>
      </div>
    </div>
  )
}

function AppContent() {
  const { user, loading } = useAuth()
  const biometric = useBiometric()
  const [showBioPrompt, setShowBioPrompt] = useState(false)

  useEffect(() => {
    if (user && sessionStorage.getItem('climapro_biometric_prompt')) {
      sessionStorage.removeItem('climapro_biometric_prompt')
      const declined = localStorage.getItem('climapro_biometric_declined')
      if (declined) return
      biometric.isAvailable().then(avail => {
        if (avail && !biometric.isEnabled()) setShowBioPrompt(true)
      })
    }
  }, [user])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'linear-gradient(160deg, rgb(var(--ac)) 0%, rgb(var(--ac-dk)) 100%)' }}>
        <div className="text-center animate-fade-in">
          <div className="w-20 h-20 bg-white rounded-3xl flex items-center justify-center shadow-2xl mx-auto mb-4">
            <span className="text-4xl">❄️</span>
          </div>
          <p className="text-white text-xl font-extrabold tracking-tight">ClimaPro</p>
          <p className="ac-text-sf text-sm mt-1 font-medium">Carregando...</p>
          <div className="mt-5 flex justify-center gap-1.5">
            <span className="w-2 h-2 ac-bg-md rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
            <span className="w-2 h-2 ac-bg-md rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
            <span className="w-2 h-2 ac-bg-md rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
          </div>
        </div>
      </div>
    )
  }

  if (!user) return <Login />

  return (
    <>
      <Suspense fallback={<PageLoader />}>
        <Routes>
          <Route path="/"                       element={<Dashboard />} />
          <Route path="/clientes"               element={<Clientes />} />
          <Route path="/clientes/novo"          element={<ClienteForm />} />
          <Route path="/clientes/:id"           element={<ClienteDetalhe />} />
          <Route path="/clientes/:id/editar"    element={<ClienteForm />} />
          <Route path="/ordens"                 element={<OrdensList />} />
          <Route path="/ordens/nova"            element={<OrdemForm />} />
          <Route path="/ordens/:id"             element={<OrdemDetalhe />} />
          <Route path="/ordens/:id/editar"      element={<OrdemEdit />} />
          <Route path="/relatorio"              element={<Relatorio />} />
          <Route path="/lembretes"              element={<Lembretes />} />
          <Route path="/perfil"                 element={<Perfil />} />
          <Route path="*"                       element={<Navigate to="/" />} />
        </Routes>
      </Suspense>
      <BottomNav />
      {showBioPrompt && <BiometricPrompt onDone={() => setShowBioPrompt(false)} />}
    </>
  )
}

export default Sentry.withErrorBoundary(function App() {
  useEffect(() => { applyTheme(getTheme()) }, [])

  return (
    <BrowserRouter>
      <AuthProvider>
        <ToastProvider>
          <AppContent />
        </ToastProvider>
      </AuthProvider>
    </BrowserRouter>
  )
}, { fallback: <div>Erro ao carregar a aplicação</div>, showDialog: false })
