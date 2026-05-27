import React, { createContext, useContext, useState, useCallback } from 'react'

const ToastContext = createContext(null)

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])

  const add = useCallback((message, type = 'info', duration = 4000) => {
    const id = Date.now() + Math.random()
    setToasts((prev) => [...prev, { id, message, type, duration }])
    if (duration > 0) {
      setTimeout(() => remove(id), duration)
    }
    return id
  }, [])

  const remove = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  const success = useCallback((msg, dur)  => add(msg, 'success', dur), [add])
  const error   = useCallback((msg, dur)  => add(msg, 'error',   dur ?? 6000), [add])
  const warning = useCallback((msg, dur)  => add(msg, 'warning', dur), [add])
  const info    = useCallback((msg, dur)  => add(msg, 'info',    dur), [add])

  return (
    <ToastContext.Provider value={{ success, error, warning, info, remove }}>
      {children}
      <ToastContainer toasts={toasts} onRemove={remove} />
    </ToastContext.Provider>
  )
}

export const useToast = () => useContext(ToastContext)

// ── Container + Toast ────────────────────────────────────────────────────────

const ICONS = {
  success: (
    <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5" stroke="currentColor" strokeWidth={2.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  error: (
    <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5" stroke="currentColor" strokeWidth={2.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
    </svg>
  ),
  warning: (
    <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5" stroke="currentColor" strokeWidth={2.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
    </svg>
  ),
  info: (
    <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5" stroke="currentColor" strokeWidth={2.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" />
    </svg>
  ),
}

const STYLES = {
  success: {
    bar:  'bg-green-500',
    icon: 'text-green-500 bg-green-50',
    title: 'Sucesso',
  },
  error: {
    bar:  'bg-red-500',
    icon: 'text-red-500 bg-red-50',
    title: 'Erro',
  },
  warning: {
    bar:  'bg-brand-yellow',
    icon: 'text-yellow-600 bg-yellow-50',
    title: 'Atenção',
  },
  info: {
    bar:  'bg-blue-500',
    icon: 'text-blue-500 bg-blue-50',
    title: 'Informação',
  },
}

function ToastContainer({ toasts, onRemove }) {
  if (!toasts.length) return null
  return (
    <div className="fixed top-4 right-4 z-[9999] flex flex-col gap-3 w-full max-w-sm pointer-events-none">
      {toasts.map((t) => (
        <Toast key={t.id} toast={t} onRemove={onRemove} />
      ))}
    </div>
  )
}

function Toast({ toast, onRemove }) {
  const s = STYLES[toast.type] ?? STYLES.info

  return (
    <div
      className="pointer-events-auto w-full bg-white rounded-2xl shadow-2xl border border-brand-gray-border overflow-hidden animate-slide-in"
      style={{ animation: 'slideIn 0.3s cubic-bezier(0.34,1.56,0.64,1)' }}
    >
      {/* Barra colorida no topo */}
      <div className={`h-1 w-full ${s.bar}`} />

      <div className="flex items-start gap-3 p-4">
        {/* Ícone */}
        <div className={`p-2 rounded-xl shrink-0 ${s.icon}`}>
          {ICONS[toast.type]}
        </div>

        {/* Texto */}
        <div className="flex-1 min-w-0 pt-0.5">
          <p className="text-xs font-semibold uppercase tracking-wide text-brand-gray-light mb-0.5">
            {s.title}
          </p>
          <p className="text-sm text-brand-black leading-snug">{toast.message}</p>
        </div>

        {/* Fechar */}
        <button
          onClick={() => onRemove(toast.id)}
          className="shrink-0 p-1 rounded-lg text-brand-gray-light hover:text-brand-black hover:bg-brand-gray-border transition-colors mt-0.5"
        >
          <svg viewBox="0 0 24 24" fill="none" className="w-4 h-4" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Barra de progresso */}
      {toast.duration > 0 && (
        <div className="mx-4 mb-3 h-1 bg-brand-gray-border rounded-full overflow-hidden">
          <div
            className={`h-full ${s.bar} opacity-40 rounded-full`}
            style={{
              animation: `shrink ${toast.duration}ms linear forwards`,
              transformOrigin: 'left',
            }}
          />
        </div>
      )}
    </div>
  )
}
