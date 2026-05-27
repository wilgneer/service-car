import { useEffect, useRef, useCallback } from 'react'

const INACTIVITY_MS = 30 * 60 * 1000  // 30 min sem atividade → logout
const WARNING_MS    =  1 * 60 * 1000  // avisa 60s antes
const RELOAD_MS     = 10 * 60 * 1000  // recarrega dados a cada 10 min

const EVENTS = ['mousemove', 'mousedown', 'keydown', 'touchstart', 'scroll', 'click']

/**
 * useInactivityTimeout
 * - Monitora atividade do usuário
 * - Dispara onWarning 60s antes de deslogar
 * - Dispara onLogout após INACTIVITY_MS de inatividade
 * - Dispara onRefresh a cada RELOAD_MS para manter dados atualizados
 */
export function useInactivityTimeout({ onLogout, onWarning, onCancelWarning, onRefresh }) {
  const logoutTimer = useRef(null)
  const warnTimer   = useRef(null)
  const reloadTimer = useRef(null)

  const clearAll = () => {
    clearTimeout(logoutTimer.current)
    clearTimeout(warnTimer.current)
  }

  const reset = useCallback(() => {
    clearAll()
    onCancelWarning?.()

    // Avisa faltando WARNING_MS para o logout
    warnTimer.current = setTimeout(() => {
      onWarning?.()
    }, INACTIVITY_MS - WARNING_MS)

    // Desloga após INACTIVITY_MS
    logoutTimer.current = setTimeout(() => {
      onLogout?.()
    }, INACTIVITY_MS)
  }, [onLogout, onWarning, onCancelWarning])

  useEffect(() => {
    // Escuta qualquer atividade do usuário
    EVENTS.forEach((e) => window.addEventListener(e, reset, { passive: true }))
    reset() // inicia o timer imediatamente

    // Recarrega dados periodicamente em background
    reloadTimer.current = setInterval(() => {
      onRefresh?.()
    }, RELOAD_MS)

    return () => {
      EVENTS.forEach((e) => window.removeEventListener(e, reset))
      clearAll()
      clearInterval(reloadTimer.current)
    }
  }, [reset, onRefresh])
}
