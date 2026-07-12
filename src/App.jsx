import * as Sentry from "@sentry/react"
import { lazy, Suspense, useEffect, useState } from 'react'
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { AuthProvider, useAuth } from './hooks/useAuth'
import { ToastProvider } from './hooks/useToast'
import { AIProvider } from './hooks/useAI'
import BottomNav from './components/BottomNav'
import InstallPrompt from './components/InstallPrompt'
import AIAssistant from './components/AIAssistant'
import { getTheme, applyTheme } from './lib/theme'
import Login from './pages/Login'
import Paywall from './pages/Paywall'
import Landing from './pages/Landing'
import PlanoPlus from './pages/PlanoPlus'

// Inicializar Sentry
Sentry.init({
  dsn: "https://39e93ed64894fb89acb4b451fdb4a136@o4511269979291648.ingest.us.sentry.io/4511270012846080",
  tracesSampleRate: 1.0,
  environment: "production",
  ignoreErrors: [
    /ServiceWorker/i,
    /Failed to register/i,
  ],
})

const ChatHome     = lazy(() => import('./pages/ChatHome'))
const Painel       = lazy(() => import('./pages/Painel'))
const Clientes     = lazy(() => import('./pages/Clientes'))
const ClienteDetalhe = lazy(() => import('./pages/ClienteDetalhe'))
const ClienteForm  = lazy(() => import('./pages/ClienteForm'))
const OrdensList   = lazy(() => import('./pages/OrdensList'))
const OrdemForm    = lazy(() => import('./pages/OrdemForm'))
const OrdemDetalhe = lazy(() => import('./pages/OrdemDetalhe'))
const OrdemEdit    = lazy(() => import('./pages/OrdemEdit'))
const AtendimentoIA = lazy(() => import('./pages/AtendimentoIA'))
const Perfil       = lazy(() => import('./pages/Perfil'))
const Relatorio    = lazy(() => import('./pages/Relatorio'))
const Lembretes    = lazy(() => import('./pages/Lembretes'))
const Privacidade  = lazy(() => import('./pages/Privacidade'))
const ExcluirConta = lazy(() => import('./pages/ExcluirConta'))
const Afiliados    = lazy(() => import('./pages/Afiliados'))
const AdminTrackingDebug = lazy(() => import('./pages/AdminTrackingDebug'))
const AdminAnalytics = lazy(() => import('./pages/AdminAnalytics'))
const AdminPurchaseDetail = lazy(() => import('./pages/AdminPurchaseDetail'))

function PageLoader() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <span className="w-7 h-7 border-[3px] border-gray-200 border-t-sky-500 rounded-full animate-spin" />
    </div>
  )
}


function OfflineBanner() {
  const [offline, setOffline] = useState(!navigator.onLine)
  useEffect(() => {
    const on  = () => setOffline(false)
    const off = () => setOffline(true)
    window.addEventListener('online', on)
    window.addEventListener('offline', off)
    return () => { window.removeEventListener('online', on); window.removeEventListener('offline', off) }
  }, [])
  if (!offline) return null
  return (
    <div className="fixed top-0 left-0 right-0 z-[300] bg-amber-500 text-white text-xs font-semibold text-center py-1.5 flex items-center justify-center gap-1.5">
      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 5.636a9 9 0 010 12.728M15.536 8.464a5 5 0 010 7.072M12 12h.01M8.464 15.536a5 5 0 010-7.072M5.636 18.364a9 9 0 010-12.728" />
      </svg>
      Sem conexão — exibindo dados em cache
    </div>
  )
}

function TrialBanner() {
  const { subscriptionStatus, trialDaysLeft } = useAuth()
  if (subscriptionStatus !== 'trial' || trialDaysLeft > 3) return null
  return (
    <div className="fixed top-0 left-0 right-0 z-[300] text-white text-xs font-semibold text-center py-1.5"
      style={{ background: 'rgb(var(--ac))' }}>
      {trialDaysLeft === 1
        ? 'Último dia gratuito — assine para não perder o acesso'
        : `${trialDaysLeft} dias restantes no período gratuito`}
    </div>
  )
}

function AppContent() {
  const { user, loading, isActive, isAdmin } = useAuth()
  const location = useLocation()

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

  if (!user) {
    if (location.pathname === '/entrar') return <Login />
    if (location.pathname === '/plano-plus') return <PlanoPlus />
    if (location.pathname === '/privacidade') return <Suspense fallback={<PageLoader />}><Privacidade /></Suspense>
    if (location.pathname === '/excluir-conta') return <Suspense fallback={<PageLoader />}><ExcluirConta /></Suspense>
    return <Landing />
  }

  // Páginas de admin ficam acima do gate de assinatura (Paywall): quem é admin
  // precisa acessá-las mesmo com trial expirado/sem plano ativo na própria conta.
  if (location.pathname === '/admin/tracking-debug') {
    if (!isAdmin) return <Navigate to="/" />
    return (
      <Suspense fallback={<PageLoader />}>
        <AdminTrackingDebug />
      </Suspense>
    )
  }

  if (location.pathname === '/admin/analytics') {
    if (!isAdmin) return <Navigate to="/" />
    return (
      <Suspense fallback={<PageLoader />}>
        <AdminAnalytics />
      </Suspense>
    )
  }

  if (location.pathname.startsWith('/admin/purchase/')) {
    if (!isAdmin) return <Navigate to="/" />
    return (
      <Suspense fallback={<PageLoader />}>
        <AdminPurchaseDetail />
      </Suspense>
    )
  }

  if (!isActive) return <Paywall />

  return (
    <>
      <TrialBanner />
      <Suspense fallback={<PageLoader />}>
        <Routes>
          <Route path="/"                       element={<Painel />} />
          <Route path="/chat"                   element={<ChatHome />} />
          <Route path="/clientes"               element={<Clientes />} />
          <Route path="/clientes/novo"          element={<ClienteForm />} />
          <Route path="/clientes/:id"           element={<ClienteDetalhe />} />
          <Route path="/clientes/:id/editar"    element={<ClienteForm />} />
          <Route path="/ordens"                 element={<OrdensList />} />
          <Route path="/ordens/nova"            element={<OrdemForm />} />
          <Route path="/ordens/:id"             element={<OrdemDetalhe />} />
          <Route path="/ordens/:id/editar"      element={<OrdemEdit />} />
          <Route path="/ordens/:id/atendimento" element={<AtendimentoIA />} />
          <Route path="/relatorio"              element={<Relatorio />} />
          <Route path="/lembretes"              element={<Lembretes />} />
          <Route path="/perfil"                 element={<Perfil />} />
          <Route path="/privacidade"            element={<Privacidade />} />
          <Route path="/afiliados"              element={<Afiliados />} />
          <Route path="*"                       element={<Navigate to="/" />} />
        </Routes>
      </Suspense>
      <AIAssistant />
      <InstallPrompt />
      <OfflineBanner />
      <BottomNav />
    </>
  )
}

export default Sentry.withErrorBoundary(function App() {
  useEffect(() => { applyTheme(getTheme()) }, [])

  return (
    <BrowserRouter>
      <AuthProvider>
        <ToastProvider>
          <AIProvider>
            <AppContent />
          </AIProvider>
        </ToastProvider>
      </AuthProvider>
    </BrowserRouter>
  )
}, { fallback: <div>Erro ao carregar a aplicação</div>, showDialog: false })
