import React from 'react'

export default function Input({ label, error, className = '', ...props }) {
  return (
    <div className="flex flex-col gap-1.5">
      {label && <label className="text-sm font-semibold text-brand-black">{label}</label>}
      <input className={`input-field ${error ? 'border-red-400 focus:ring-red-400' : ''} ${className}`} {...props} />
      {error && <p className="text-xs text-red-500 mt-0.5">{error}</p>}
    </div>
  )
}

export function Select({ label, error, className = '', children, ...props }) {
  return (
    <div className="flex flex-col gap-1">
      {label && <label className="text-sm font-medium text-brand-black">{label}</label>}
      <select className={`input-field ${error ? 'border-red-400' : ''} ${className}`} {...props}>
        {children}
      </select>
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  )
}

export function Textarea({ label, error, className = '', ...props }) {
  return (
    <div className="flex flex-col gap-1">
      {label && <label className="text-sm font-medium text-brand-black">{label}</label>}
      <textarea className={`input-field resize-none ${error ? 'border-red-400' : ''} ${className}`} rows={3} {...props} />
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  )
}
