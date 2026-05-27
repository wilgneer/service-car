import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Car, Eye, EyeOff } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import Button from '../components/ui/Button'
import Input from '../components/ui/Input'
import { FlaskConical } from 'lucide-react'

export default function Login() {
  const { login, loginDemo } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({ email: '', password: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [showPwd, setShowPwd] = useState(false)

  const set = (k) => (e) => setForm((p) => ({ ...p, [k]: e.target.value }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await login(form.email, form.password)
      navigate('/')
    } catch (err) {
      setError('E-mail ou senha incorretos.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-brand-black flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="flex flex-col items-center gap-3 mb-8">
          <div className="w-14 h-14 bg-brand-yellow rounded-2xl flex items-center justify-center shadow-lg">
            <Car size={28} className="text-brand-black" />
          </div>
          <div className="text-center">
            <h1 className="text-white text-2xl font-bold tracking-tight">AutoOrçamento</h1>
            <p className="text-brand-gray-light text-sm mt-0.5">Sistema de Orçamentos Automotivos</p>
          </div>
        </div>

        {/* Card */}
        <div className="bg-brand-black-soft rounded-2xl p-6 border border-brand-gray-mid shadow-xl">
          <h2 className="text-white font-semibold mb-5">Entrar na sua conta</h2>
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-brand-gray-border">E-mail</label>
              <input
                type="email"
                value={form.email}
                onChange={set('email')}
                placeholder="seu@email.com"
                required
                className="w-full border border-brand-gray-mid rounded-lg px-3 py-2.5 text-sm text-white bg-brand-gray-dark focus:outline-none focus:ring-2 focus:ring-brand-yellow placeholder:text-brand-gray-light"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-brand-gray-border">Senha</label>
              <div className="relative">
                <input
                  type={showPwd ? 'text' : 'password'}
                  value={form.password}
                  onChange={set('password')}
                  placeholder="••••••••"
                  required
                  className="w-full border border-brand-gray-mid rounded-lg px-3 py-2.5 text-sm text-white bg-brand-gray-dark focus:outline-none focus:ring-2 focus:ring-brand-yellow placeholder:text-brand-gray-light pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPwd((p) => !p)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-brand-gray-light hover:text-white"
                >
                  {showPwd ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
            {error && <p className="text-red-400 text-sm bg-red-900/20 rounded-lg px-3 py-2">{error}</p>}
            <Button type="submit" className="w-full justify-center py-2.5 mt-1" loading={loading}>
              Entrar
            </Button>
          </form>
        </div>

        {/* Demo mode */}
        <div className="mt-4">
          <div className="flex items-center gap-3 mb-4">
            <div className="flex-1 h-px bg-brand-gray-mid" />
            <span className="text-xs text-brand-gray-light">ou</span>
            <div className="flex-1 h-px bg-brand-gray-mid" />
          </div>
          <button
            onClick={() => { loginDemo(); navigate('/') }}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border border-brand-gray-mid text-brand-gray-border text-sm font-medium hover:bg-brand-gray-dark transition-colors"
          >
            <FlaskConical size={16} className="text-brand-yellow" />
            Entrar em modo demo (sem Firebase)
          </button>
        </div>

        <p className="text-center text-brand-gray-light text-xs mt-5">
          AutoOrçamento &mdash; Gestao automotiva simplificada
        </p>
      </div>
    </div>
  )
}
