import React, { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { DollarSign, CheckCircle, XCircle, Car, TrendingUp } from 'lucide-react'
import { useApp } from '../contexts/AppContext'
import { formatCurrency, formatDate } from '../utils/helpers'

const TABS = [
  { value: 'faturado', label: 'Faturados', icon: CheckCircle, color: 'green' },
  { value: 'cancelado', label: 'Cancelados', icon: XCircle, color: 'red' },
]

export default function Financeiro() {
  const { orcamentos, clientes, carros } = useApp()
  const navigate = useNavigate()
  const [tab, setTab] = useState('faturado')

  const faturados = useMemo(() => orcamentos.filter((o) => o.status === 'faturado'), [orcamentos])
  const cancelados = useMemo(() => orcamentos.filter((o) => o.status === 'cancelado'), [orcamentos])

  const totalFaturado = useMemo(() => faturados.reduce((s, o) => s + (o.totalGeral || 0), 0), [faturados])
  const totalCancelado = useMemo(() => cancelados.reduce((s, o) => s + (o.totalGeral || 0), 0), [cancelados])

  const list = tab === 'faturado' ? faturados : cancelados

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-bold text-brand-black">Financeiro</h1>
        <p className="text-sm text-brand-gray-light">Visão dos orçamentos faturados e cancelados</p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="card p-5 flex items-center gap-4">
          <div className="p-3 bg-green-50 rounded-xl">
            <TrendingUp size={22} className="text-green-600" />
          </div>
          <div>
            <p className="text-sm text-brand-gray-light">Total Faturado</p>
            <p className="text-2xl font-bold text-green-600">{formatCurrency(totalFaturado)}</p>
            <p className="text-xs text-brand-gray-light">{faturados.length} orçamento(s)</p>
          </div>
        </div>
        <div className="card p-5 flex items-center gap-4">
          <div className="p-3 bg-red-50 rounded-xl">
            <XCircle size={22} className="text-red-500" />
          </div>
          <div>
            <p className="text-sm text-brand-gray-light">Total Cancelado</p>
            <p className="text-2xl font-bold text-red-500">{formatCurrency(totalCancelado)}</p>
            <p className="text-xs text-brand-gray-light">{cancelados.length} orçamento(s)</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-brand-gray-border">
        {TABS.map(({ value, label, icon: Icon, color }) => (
          <button
            key={value}
            onClick={() => setTab(value)}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px ${
              tab === value
                ? `border-brand-yellow text-brand-black`
                : 'border-transparent text-brand-gray-light hover:text-brand-black'
            }`}
          >
            <Icon size={15} className={tab === value ? (color === 'green' ? 'text-green-600' : 'text-red-500') : ''} />
            {label}
          </button>
        ))}
      </div>

      {/* List */}
      {list.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="p-4 bg-brand-yellow-light rounded-full mb-3">
            <DollarSign size={24} className="text-brand-yellow-dark" />
          </div>
          <p className="font-semibold text-brand-black">Nenhum orçamento {tab === 'faturado' ? 'faturado' : 'cancelado'}</p>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {list.map((o) => {
            const cliente = clientes.find((c) => c.id === o.clienteId)
            const carro = carros.find((c) => c.id === o.carroId)
            return (
              <div
                key={o.id}
                onClick={() => navigate(`/orcamentos/${o.id}`)}
                className="card p-4 flex items-center gap-4 cursor-pointer hover:border-brand-yellow transition-colors"
              >
                <div className={`p-2.5 rounded-xl ${tab === 'faturado' ? 'bg-green-50' : 'bg-red-50'}`}>
                  {tab === 'faturado' ? <CheckCircle size={18} className="text-green-600" /> : <XCircle size={18} className="text-red-500" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-brand-black">#{String(o.numero).padStart(4, '0')}</p>
                    <p className="text-sm text-brand-black truncate">{cliente?.nome}</p>
                  </div>
                  <div className="flex items-center gap-1 text-sm text-brand-gray-light">
                    <Car size={12} />
                    <span className="truncate">{carro?.nome} {carro?.placa ? `• ${carro.placa}` : ''}</span>
                  </div>
                  <p className="text-xs text-brand-gray-light">{formatDate(o.faturadoEm ?? o.canceladoEm ?? o.createdAt)}</p>
                </div>
                <p className="font-bold text-brand-black whitespace-nowrap">{formatCurrency(o.totalGeral)}</p>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
