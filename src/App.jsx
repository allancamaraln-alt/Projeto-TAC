import { lazy, Suspense, useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './hooks/useAuth'
import { ToastProvider } from './hooks/useToast'
import BottomNav from './components/BottomNav'
import { getTheme, applyTheme } from './lib/theme'
import Login from './pages/Login'

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

function AppContent() {
  const { user, loading } = useAuth()

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
    </>
  )
}

export default function App() {
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
}
