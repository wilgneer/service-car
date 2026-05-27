import React, { useEffect, useState } from 'react'
import { Clock } from 'lucide-react'
import Button from './Button'

export default function InactivityWarning({ open, onStay, secondsLeft = 60 }) {
  const [count, setCount] = useState(secondsLeft)

  useEffect(() => {
    if (!open) { setCount(secondsLeft); return }
    setCount(secondsLeft)
    const interval = setInterval(() => {
      setCount((c) => {
        if (c <= 1) { clearInterval(interval); return 0 }
        return c - 1
      })
    }, 1000)
    return () => clearInterval(interval)
  }, [open, secondsLeft])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div className="relative bg-white rounded-2xl shadow-2xl p-6 w-full max-w-sm flex flex-col items-center text-center gap-4">
        <div className="p-4 bg-yellow-100 rounded-full">
          <Clock size={28} className="text-yellow-600" />
        </div>
        <div>
          <p className="font-bold text-brand-black text-lg">Ainda está aí?</p>
          <p className="text-sm text-brand-gray-light mt-1">
            Por inatividade, você será desconectado em
          </p>
          <p className="text-4xl font-bold text-brand-yellow-dark mt-2">{count}s</p>
        </div>
        <Button className="w-full justify-center" onClick={onStay}>
          Continuar conectado
        </Button>
      </div>
    </div>
  )
}
