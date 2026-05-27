import React from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import { AppProvider } from './contexts/AppContext'
import Layout from './components/layout/Layout'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import NovoOrcamento from './pages/NovoOrcamento'
import OrcamentoDetalhe from './pages/OrcamentoDetalhe'
import EditarOrcamento from './pages/EditarOrcamento'
import Clientes from './pages/Clientes'
import Carros from './pages/Carros'
import Servicos from './pages/Servicos'
import Pecas from './pages/Pecas'
import Financeiro from './pages/Financeiro'
import Relatorios from './pages/Relatorios'

function PrivateRoute({ children }) {
  const { user, loading } = useAuth()
  if (loading) return <LoadingScreen />
  if (!user) return <Navigate to="/login" replace />
  return (
    <AppProvider>
      <Layout>{children}</Layout>
    </AppProvider>
  )
}

function LoadingScreen() {
  return (
    <div className="min-h-screen bg-brand-black flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="w-12 h-12 border-4 border-brand-yellow border-t-transparent rounded-full animate-spin" />
        <p className="text-brand-gray-light text-sm">Carregando...</p>
      </div>
    </div>
  )
}

function AppRoutes() {
  const { user, loading } = useAuth()
  if (loading) return <LoadingScreen />
  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/" replace /> : <Login />} />
      <Route path="/" element={<PrivateRoute><Dashboard /></PrivateRoute>} />
      <Route path="/orcamentos/novo" element={<PrivateRoute><NovoOrcamento /></PrivateRoute>} />
      <Route path="/orcamentos/:id" element={<PrivateRoute><OrcamentoDetalhe /></PrivateRoute>} />
      <Route path="/orcamentos/:id/editar" element={<PrivateRoute><EditarOrcamento /></PrivateRoute>} />
      <Route path="/clientes" element={<PrivateRoute><Clientes /></PrivateRoute>} />
      <Route path="/carros" element={<PrivateRoute><Carros /></PrivateRoute>} />
      <Route path="/servicos" element={<PrivateRoute><Servicos /></PrivateRoute>} />
      <Route path="/pecas" element={<PrivateRoute><Pecas /></PrivateRoute>} />
      <Route path="/financeiro" element={<PrivateRoute><Financeiro /></PrivateRoute>} />
      <Route path="/relatorios" element={<PrivateRoute><Relatorios /></PrivateRoute>} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  )
}
