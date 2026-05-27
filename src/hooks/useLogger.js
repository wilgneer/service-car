import { useCallback } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { logActivity, logError } from '../firebase/logger'

/**
 * Hook que fornece activity() e error() já com os dados do usuário logado.
 * Fire-and-forget — não precisa de await.
 *
 * Uso:
 *   const logger = useLogger()
 *   logger.activity('orcamento_criado', 'Orçamento #0001 criado')
 *   logger.error('erro_ao_salvar', 'Falha ao salvar cliente', { err: e.message })
 */
export function useLogger() {
  const { user } = useAuth()

  const getUser = () => ({
    userId:    user?.uid   ?? 'anon',
    userEmail: user?.email ?? '',
  })

  const activity = useCallback((action, message, details = {}) => {
    logActivity({ action, message, details, ...getUser() })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.uid])

  const error = useCallback((action, message, details = {}) => {
    logError({ action, message, details, ...getUser() })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.uid])

  return { activity, error }
}
