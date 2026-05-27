import React, { useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import Sidebar from './Sidebar'
import InactivityWarning from '../ui/InactivityWarning'
import { useInactivityTimeout } from '../../hooks/useInactivityTimeout'
import { useAuth } from '../../contexts/AuthContext'
import { useApp } from '../../contexts/AppContext'

export default function Layout({ children }) {
  const { logout, isDemo } = useAuth()
  const { refresh } = useApp()
  const navigate = useNavigate()
  const [showWarning, setShowWarning] = useState(false)

  const handleLogout = useCallback(async () => {
    setShowWarning(false)
    await logout()
    navigate('/login')
  }, [logout, navigate])

  const handleWarning     = useCallback(() => setShowWarning(true),  [])
  const handleCancelWarn  = useCallback(() => setShowWarning(false), [])
  const handleRefresh     = useCallback(() => { if (!isDemo) refresh() }, [refresh, isDemo])

  useInactivityTimeout({
    onLogout:        handleLogout,
    onWarning:       handleWarning,
    onCancelWarning: handleCancelWarn,
    onRefresh:       handleRefresh,
  })

  return (
    <div className="min-h-screen bg-brand-white-off">
      <Sidebar />
      <main className="md:ml-56 pt-14 md:pt-0 min-h-screen">
        <div className="max-w-6xl mx-auto px-4 py-6">
          {children}
        </div>
      </main>

      <InactivityWarning
        open={showWarning}
        secondsLeft={60}
        onStay={handleCancelWarn}
      />
    </div>
  )
}
