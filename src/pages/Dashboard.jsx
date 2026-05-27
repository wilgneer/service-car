import React, { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { FileText, Plus, Search, Car, Clock, CheckCircle, XCircle, Filter } from 'lucide-react'
import { useApp } from '../contexts/AppContext'
import { useAuth } from '../contexts/AuthContext'
import { formatCurrency, formatDate, statusLabel, statusClass } from '../utils/helpers'
import Button from '../components/ui/Button'
import EmptyState from '../components/ui/EmptyState'

const STATUS_FILTERS = [
  { value: 'todos', label: 'Todos' },
  { value: 'pendente', label: 'Pendentes' },
  { value: 'faturado', label: 'Faturados' },
  { value: 'cancelado', label: 'Cancelados' },
]

export default function Dashboard() {
  const { orcamentos, clientes, carros, loadingData } = useApp()
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('todos')

  const stats = useMemo(() => ({
    total: orcamentos.length,
    pendentes: orcamentos.filter((o) => o.status === 'pendente').length,
    faturados: orcamentos.filter((o) => o.status === 'faturado').length,
    cancelados: orcamentos.filter((o) => o.status === 'cancelado').length,
    totalFaturado: orcamentos.filter((o) => o.status === 'faturado').reduce((s, o) => s + (o.totalGeral || 0), 0),
  }), [orcamentos])

  const filtered = useMemo(() => {
    return orcamentos.filter((o) => {
      const cliente = clientes.find((c) => c.id === o.clienteId)
      const carro = carros.find((c) => c.id === o.carroId)
      const term = search.toLowerCase()
      const matchSearch =
        !term ||
        String(o.numero).includes(term) ||
        cliente?.nome?.toLowerCase().includes(term) ||
        carro?.nome?.toLowerCase().includes(term) ||
        carro?.placa?.toLowerCase().includes(term)
      const matchStatus = statusFilter === 'todos' || o.status === statusFilter
      return matchSearch && matchStatus
    })
  }, [orcamentos, clientes, carros, search, statusFilter])

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-brand-black">Orçamentos</h1>
          <p className="text-sm text-brand-gray-light">{stats.total} orçamentos no total</p>
        </div>
        <Button onClick={() => navigate('/orcamentos/novo')}>
          <Plus size={16} /> Novo Orçamento
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="Total" value={stats.total} icon={FileText} color="yellow" />
        <StatCard label="Pendentes" value={stats.pendentes} icon={Clock} color="amber" />
        <StatCard label="Faturados" value={stats.faturados} icon={CheckCircle} color="green" sub={formatCurrency(stats.totalFaturado)} />
        <StatCard label="Cancelados" value={stats.cancelados} icon={XCircle} color="red" />
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-gray-light" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por número, cliente, veículo ou placa..."
            className="input-field pl-9"
          />
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1">
          {STATUS_FILTERS.map((f) => (
            <button
              key={f.value}
              onClick={() => setStatusFilter(f.value)}
              className={`px-3 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                statusFilter === f.value
                  ? 'bg-brand-yellow text-brand-black'
                  : 'bg-white border border-brand-gray-border text-brand-gray-light hover:border-brand-yellow'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Cards */}
      {loadingData ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="card p-4 animate-pulse h-40">
              <div className="h-4 bg-brand-gray-border rounded w-1/3 mb-3" />
              <div className="h-3 bg-brand-gray-border rounded w-2/3 mb-2" />
              <div className="h-3 bg-brand-gray-border rounded w-1/2" />
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={FileText}
          title="Nenhum orçamento encontrado"
          description={search ? 'Tente outro termo de busca.' : 'Crie seu primeiro orçamento clicando em Novo Orçamento.'}
          action={
            !search && (
              <Button onClick={() => navigate('/orcamentos/novo')}>
                <Plus size={16} /> Novo Orçamento
              </Button>
            )
          }
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((o) => {
            const cliente = clientes.find((c) => c.id === o.clienteId)
            const carro = carros.find((c) => c.id === o.carroId)
            return (
              <OrcamentoCard
                key={o.id}
                orcamento={o}
                cliente={cliente}
                carro={carro}
                onClick={() => navigate(`/orcamentos/${o.id}`)}
              />
            )
          })}
        </div>
      )}
    </div>
  )
}

function StatCard({ label, value, icon: Icon, color, sub }) {
  const colors = {
    yellow: 'bg-brand-yellow-light text-brand-yellow-dark',
    amber: 'bg-amber-50 text-amber-600',
    green: 'bg-green-50 text-green-600',
    red: 'bg-red-50 text-red-600',
  }
  return (
    <div className="card p-4 flex items-center gap-3">
      <div className={`p-2.5 rounded-xl ${colors[color]}`}>
        <Icon size={18} />
      </div>
      <div>
        <p className="text-xl font-bold text-brand-black leading-tight">{value}</p>
        <p className="text-xs text-brand-gray-light">{label}</p>
        {sub && <p className="text-xs font-medium text-green-600">{sub}</p>}
      </div>
    </div>
  )
}

function OrcamentoCard({ orcamento, cliente, carro, onClick }) {
  const { numero, status, totalGeral, createdAt, itens } = orcamento
  const servicosCount = itens?.servicos?.length ?? 0
  const pecasCount = itens?.pecas?.length ?? 0

  return (
    <div
      onClick={onClick}
      className="card p-4 cursor-pointer hover:border-brand-yellow hover:shadow-md transition-all duration-150 group"
    >
      <div className="flex items-start justify-between mb-3">
        <div>
          <p className="text-xs text-brand-gray-light font-medium">#{String(numero).padStart(4, '0')}</p>
          <p className="font-semibold text-brand-black group-hover:text-brand-yellow-dark transition-colors">
            {cliente?.nome ?? 'Cliente não encontrado'}
          </p>
        </div>
        <span className={statusClass(status)}>{statusLabel(status)}</span>
      </div>

      <div className="flex items-center gap-2 text-sm text-brand-gray-light mb-3">
        <Car size={14} />
        <span className="truncate">
          {carro ? `${carro.nome} ${carro.placa ? `• ${carro.placa}` : ''}` : 'Veículo não encontrado'}
        </span>
      </div>

      <div className="flex items-center justify-between">
        <div className="flex gap-3 text-xs text-brand-gray-light">
          {servicosCount > 0 && <span>{servicosCount} serv.</span>}
          {pecasCount > 0 && <span>{pecasCount} peças</span>}
        </div>
        <p className="font-bold text-brand-black">{formatCurrency(totalGeral)}</p>
      </div>

      <p className="text-xs text-brand-gray-light mt-2">{formatDate(createdAt)}</p>
    </div>
  )
}
