import React, { useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import {
  FileText, Users, Car, Wrench, Package,
  DollarSign, BarChart2, LogOut, Menu, X,
  Shield, ScrollText, MoreHorizontal,
} from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'

const navItems = [
  { to: '/',          label: 'Orçamentos', icon: FileText,  end: true },
  { to: '/clientes',  label: 'Clientes',   icon: Users },
  { to: '/carros',    label: 'Veículos',   icon: Car },
  { to: '/servicos',  label: 'Serviços',   icon: Wrench },
  { to: '/pecas',     label: 'Peças',      icon: Package },
  { to: '/financeiro',label: 'Financeiro', icon: DollarSign },
  { to: '/relatorios',label: 'Relatórios', icon: BarChart2 },
]

// Itens que aparecem no bottom nav mobile (os 4 principais + "Mais")
const bottomItems = [
  { to: '/',         label: 'Orçamentos', icon: FileText, end: true },
  { to: '/clientes', label: 'Clientes',   icon: Users },
  { to: '/carros',   label: 'Veículos',   icon: Car },
  { to: '/servicos', label: 'Serviços',   icon: Wrench },
]

const adminItems = [
  { to: '/logs', label: 'Logs', icon: ScrollText },
]

export default function Sidebar() {
  const { logout, isAdmin } = useAuth()
  const navigate = useNavigate()
  const [drawerOpen, setDrawerOpen] = useState(false)

  const handleLogout = async () => {
    await logout()
    navigate('/login')
  }

  const linkClass = ({ isActive }) =>
    `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
      isActive
        ? 'bg-brand-yellow text-brand-black'
        : 'text-brand-gray-light hover:bg-brand-gray-dark hover:text-white'
    }`

  const SideContent = () => (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="px-4 py-5 border-b border-brand-gray-mid">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-brand-yellow rounded-lg flex items-center justify-center">
            <Car size={16} className="text-brand-black" />
          </div>
          <div>
            <p className="text-white font-bold text-sm leading-tight">AutoOrçamento</p>
            {isAdmin && (
              <span className="inline-flex items-center gap-1 text-xs text-brand-yellow">
                <Shield size={10} /> Admin
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 flex flex-col gap-1 overflow-y-auto">
        {navItems.map(({ to, label, icon: Icon, end }) => (
          <NavLink key={to} to={to} end={end} className={linkClass} onClick={() => setDrawerOpen(false)}>
            <Icon size={17} />{label}
          </NavLink>
        ))}
        {isAdmin && (
          <>
            <div className="my-2 border-t border-brand-gray-mid" />
            {adminItems.map(({ to, label, icon: Icon }) => (
              <NavLink key={to} to={to} className={linkClass} onClick={() => setDrawerOpen(false)}>
                <Icon size={17} />{label}
              </NavLink>
            ))}
          </>
        )}
      </nav>

      {/* Logout */}
      <div className="px-3 py-4 border-t border-brand-gray-mid">
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-brand-gray-light hover:bg-brand-gray-dark hover:text-white transition-colors w-full"
        >
          <LogOut size={17} /> Sair
        </button>
      </div>
    </div>
  )

  return (
    <>
      {/* ── Desktop sidebar ─────────────────────────────────────────────── */}
      <aside className="hidden md:flex flex-col w-56 bg-brand-black-soft min-h-screen fixed left-0 top-0 z-30">
        <SideContent />
      </aside>

      {/* ── Mobile topbar ────────────────────────────────────────────────── */}
      <div className="mobile-topbar md:hidden fixed top-0 left-0 right-0 z-30 bg-brand-black-soft flex items-center justify-between px-4 h-14 shadow-lg">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 bg-brand-yellow rounded-lg flex items-center justify-center">
            <Car size={14} className="text-brand-black" />
          </div>
          <span className="text-white font-bold text-sm">AutoOrçamento</span>
          {isAdmin && <span className="text-xs text-brand-yellow ml-1 flex items-center gap-0.5"><Shield size={9} /> Admin</span>}
        </div>
        <button onClick={() => setDrawerOpen(true)} className="text-white p-1">
          <Menu size={22} />
        </button>
      </div>

      {/* ── Mobile bottom tab bar ────────────────────────────────────────── */}
      <nav className="mobile-bottom-nav md:hidden fixed bottom-0 left-0 right-0 z-30 bg-brand-black-soft border-t border-brand-gray-mid flex items-stretch h-16 safe-bottom">
        {bottomItems.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              `flex-1 flex flex-col items-center justify-center gap-0.5 text-[10px] font-medium transition-colors ${
                isActive ? 'text-brand-yellow' : 'text-brand-gray-light'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <div className={`p-1.5 rounded-lg transition-colors ${isActive ? 'bg-brand-yellow/20' : ''}`}>
                  <Icon size={20} />
                </div>
                <span>{label}</span>
              </>
            )}
          </NavLink>
        ))}
        {/* Botão "Mais" abre drawer */}
        <button
          onClick={() => setDrawerOpen(true)}
          className="flex-1 flex flex-col items-center justify-center gap-0.5 text-[10px] font-medium text-brand-gray-light"
        >
          <div className="p-1.5 rounded-lg">
            <MoreHorizontal size={20} />
          </div>
          <span>Mais</span>
        </button>
      </nav>

      {/* ── Mobile drawer (menu completo) ────────────────────────────────── */}
      {drawerOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          <div className="absolute inset-0 bg-black/60" onClick={() => setDrawerOpen(false)} />
          <aside className="relative w-64 bg-brand-black-soft flex flex-col h-full shadow-2xl">
            <button onClick={() => setDrawerOpen(false)} className="absolute top-4 right-4 text-brand-gray-light hover:text-white">
              <X size={20} />
            </button>
            <SideContent />
          </aside>
        </div>
      )}
    </>
  )
}
