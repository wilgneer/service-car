import React, { useState, useMemo, useRef, useEffect } from 'react'
import { Search, X } from 'lucide-react'

/**
 * Campo de busca com autocomplete.
 * Props:
 *  - label, placeholder, error
 *  - items[]
 *  - value (id do item selecionado)
 *  - onChange(id)
 *  - getKey(item) → id
 *  - getLabel(item) → string principal
 *  - getSub(item) → string secundária (opcional)
 */
export default function SearchSelect({ label, items = [], value, onChange, getKey, getLabel, getSub, placeholder = 'Buscar...', error }) {
  const [query, setQuery] = useState('')
  const [open,  setOpen]  = useState(false)
  const ref = useRef(null)

  const selected = items.find((i) => getKey(i) === value)

  const filtered = useMemo(() => {
    const term = query.toLowerCase()
    return items.filter((i) =>
      getLabel(i).toLowerCase().includes(term) ||
      getSub?.(i)?.toLowerCase().includes(term)
    ).slice(0, 8)
  }, [items, query])

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const handleSelect = (item) => { onChange(getKey(item)); setQuery(''); setOpen(false) }
  const handleClear  = () => { onChange(''); setQuery(''); setOpen(false) }

  return (
    <div className="flex flex-col gap-1" ref={ref}>
      {label && <label className="text-sm font-medium text-brand-black">{label}</label>}
      <div className="relative">
        {selected ? (
          <div className={`input-field flex items-center justify-between gap-2 cursor-default ${error ? 'border-red-400' : ''}`}>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-brand-black truncate">{getLabel(selected)}</p>
              {getSub && <p className="text-xs text-brand-gray-light truncate">{getSub(selected)}</p>}
            </div>
            <button type="button" onClick={handleClear} className="shrink-0 text-brand-gray-light hover:text-red-500 transition-colors">
              <X size={14} />
            </button>
          </div>
        ) : (
          <>
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-gray-light pointer-events-none" />
            <input
              value={query}
              onChange={(e) => { setQuery(e.target.value); setOpen(true) }}
              onFocus={() => setOpen(true)}
              placeholder={placeholder}
              className={`input-field pl-9 ${error ? 'border-red-400' : ''}`}
            />
          </>
        )}

        {open && !selected && filtered.length > 0 && (
          <div className="absolute z-50 top-full mt-1 left-0 right-0 bg-white border border-brand-gray-border rounded-xl shadow-lg overflow-hidden">
            {filtered.map((item) => (
              <button key={getKey(item)} type="button" onMouseDown={() => handleSelect(item)}
                className="w-full text-left px-4 py-2.5 hover:bg-brand-yellow-light transition-colors flex flex-col">
                <span className="text-sm font-medium text-brand-black">{getLabel(item)}</span>
                {getSub && <span className="text-xs text-brand-gray-light">{getSub(item)}</span>}
              </button>
            ))}
          </div>
        )}
        {open && !selected && query.length > 0 && filtered.length === 0 && (
          <div className="absolute z-50 top-full mt-1 left-0 right-0 bg-white border border-brand-gray-border rounded-xl shadow-lg px-4 py-3 text-sm text-brand-gray-light">
            Nenhum resultado para "{query}"
          </div>
        )}
      </div>
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  )
}
