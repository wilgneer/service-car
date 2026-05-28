import React, { lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import { AppProvider } from './contexts/AppContext'
import { ToastProvider } from './contexts/ToastContext'
import Layout from './components/layout/Layout'

// ── Lazy loading — cada página só carrega quando acessada ─────────────────────
const Login           = lazy(() => import('./pages/Login'))
const Dashboard       = lazy(() => import('./pages/Dashboard'))
const NovoOrcamento   = lazy(() => import('./pages/NovoOrcamento'))
const OrcamentoDetalhe = lazy(() => import('./pages/OrcamentoDetalhe'))
const EditarOrcamento = lazy(() => import('./pages/EditarOrcamento'))
const Clientes        = lazy(() => import('./pages/Clientes'))
const Carros          = lazy(() => import('./pages/Carros'))
const Servicos        = lazy(() => import('./pages/Servicos'))
const Pecas           = lazy(() => import('./pages/Pecas'))
const Financeiro      = lazy(() => import('./pages/Financeiro'))
const Relatorios      = lazy(() => import('./pages/Relatorios'))
const Logs            = lazy(() => import('./pages/Logs'))
const Fornecedores    = lazy(() => import('./pages/Fornecedores'))
const Configuracoes   = lazy(() => import('./pages/Configuracoes'))

// ── Loading inline (dentro do layout, não substitui a tela toda) ──────────────
function PageLoader() {
  return (
    <div className="flex items-center justify-center h-48">
      <div className="w-8 h-8 border-4 border-brand-yellow border-t-transparent rounded-full animate-spin" />
    </div>
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

function PrivateRoute({ children }) {
  const { user, loading } = useAuth()
  if (loading) return <LoadingScreen />
  if (!user) return <Navigate to="/login" replace />
  return (
    <AppProvider>
      <Layout>
        <Suspense fallback={<PageLoader />}>
          {children}
        </Suspense>
      </Layout>
    </AppProvider>
  )
}

function AppRoutes() {
  const { user, loading } = useAuth()
  if (loading) return <LoadingScreen />
  return (
    <Routes>
      <Route path="/login" element={
        <Suspense fallback={<LoadingScreen />}>
          {user ? <Navigate to="/" replace /> : <Login />}
        </Suspense>
      } />
      <Route path="/"                        element={<PrivateRoute><Dashboard /></PrivateRoute>} />
      <Route path="/orcamentos/novo"         element={<PrivateRoute><NovoOrcamento /></PrivateRoute>} />
      <Route path="/orcamentos/:id"          element={<PrivateRoute><OrcamentoDetalhe /></PrivateRoute>} />
      <Route path="/orcamentos/:id/editar"   element={<PrivateRoute><EditarOrcamento /></PrivateRoute>} />
      <Route path="/clientes"                element={<PrivateRoute><Clientes /></PrivateRoute>} />
      <Route path="/carros"                  element={<PrivateRoute><Carros /></PrivateRoute>} />
      <Route path="/servicos"                element={<PrivateRoute><Servicos /></PrivateRoute>} />
      <Route path="/pecas"                   element={<PrivateRoute><Pecas /></PrivateRoute>} />
      <Route path="/financeiro"              element={<PrivateRoute><Financeiro /></PrivateRoute>} />
      <Route path="/relatorios"              element={<PrivateRoute><Relatorios /></PrivateRoute>} />
      <Route path="/logs"                    element={<PrivateRoute><Logs /></PrivateRoute>} />
      <Route path="/fornecedores"            element={<PrivateRoute><Fornecedores /></PrivateRoute>} />
      <Route path="/configuracoes"           element={<PrivateRoute><Configuracoes /></PrivateRoute>} />
      <Route path="*"                        element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <ToastProvider>
        <AuthProvider>
          <AppRoutes />
        </AuthProvider>
      </ToastProvider>
    </BrowserRouter>
  )
}
