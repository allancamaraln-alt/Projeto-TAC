import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './hooks/useAuth'
import BottomNav from './components/BottomNav'

import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Clientes from './pages/Clientes'
import ClienteDetalhe from './pages/ClienteDetalhe'
import ClienteForm from './pages/ClienteForm'
import OrdensList from './pages/OrdensList'
import OrdemForm from './pages/OrdemForm'
import OrdemDetalhe from './pages/OrdemDetalhe'
import OrdemEdit from './pages/OrdemEdit'
import Perfil from './pages/Perfil'
import Relatorio from './pages/Relatorio'

function AppContent() {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="text-4xl mb-3">❄️</div>
          <p className="text-gray-400">Carregando...</p>
        </div>
      </div>
    )
  }

  if (!user) return <Login />

  return (
    <>
      <Routes>
        <Route path="/" element={<Dashboard />} />

        {/* Clientes */}
        <Route path="/clientes" element={<Clientes />} />
        <Route path="/clientes/novo" element={<ClienteForm />} />
        <Route path="/clientes/:id" element={<ClienteDetalhe />} />
        <Route path="/clientes/:id/editar" element={<ClienteForm />} />

        {/* Ordens de serviço */}
        <Route path="/ordens" element={<OrdensList />} />
        <Route path="/ordens/nova" element={<OrdemForm />} />
        <Route path="/ordens/:id" element={<OrdemDetalhe />} />
        <Route path="/ordens/:id/editar" element={<OrdemEdit />} />

        {/* Relatório */}
        <Route path="/relatorio" element={<Relatorio />} />

        {/* Perfil */}
        <Route path="/perfil" element={<Perfil />} />

        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
      <BottomNav />
    </>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </BrowserRouter>
  )
}
