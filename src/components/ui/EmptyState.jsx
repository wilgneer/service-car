import React from 'react'

export default function EmptyState({ icon: Icon, title, description, action }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
      {Icon && (
        <div className="p-4 bg-brand-yellow-light rounded-full">
          <Icon size={28} className="text-brand-yellow-dark" />
        </div>
      )}
      <p className="font-semibold text-brand-black">{title}</p>
      {description && <p className="text-sm text-brand-gray-light max-w-xs">{description}</p>}
      {action}
    </div>
  )
}
