import React, { useMemo, useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  FileText, Plus, Search, Car, Clock,
  CheckCircle, XCircle, ChevronLeft, ChevronRight,
  ChevronsLeft, ChevronsRight, Loader2,
} from 'lucide-react'
import { useApp } from '../contexts/AppContext'
import { formatCurrency, formatDate, statusLabel, statusClass } from '../utils/helpers'
import Button from '../components/ui/Button'
import EmptyState from '../components/ui/EmptyState'

const STATUS_FILTERS = [
  { value: 'todos',      label: 'Todos'       },
  { value: 'rascunho',   label: 'Rascunho'    },
  { value: 'em_analise', label: 'Em Análise'  },
  { value: 'aprovado',   label: 'Aprovados'   },
  { value: 'reprovado',  label: 'Reprovados'  },
  { value: 'concluido',  label: 'Concluídos'  },
]

const PER_PAGE = 12

export default function Dashboard() {
  const { orcamentos, clientes, carros, loadingData, orcamentosHasMore, loadingMore, loadMoreOrcamentos } = useApp()
  const navigate = useNavigate()
  const [search,       setSearch]       = useState('')
  const [statusFilter, setStatusFilter] = useState('todos')
  const [page,         setPage]         = useState(1)

  // Reset para página 1 quando filtros mudam
  useEffect(() => { setPage(1) }, [search, statusFilter])

  const stats = useMemo(() => ({
    total:     orcamentos.length,
    abertos:   orcamentos.filter((o) => ['rascunho','em_analise'].includes(o.status)).length,
    aprovados: orcamentos.filter((o) => o.status === 'aprovado').length,
    concluidos: orcamentos.filter((o) => o.status === 'concluido').length,
    totalAprovado: orcamentos
      .filter((o) => ['aprovado','concluido'].includes(o.status))
      .reduce((s, o) => s + (o.totalGeral || o.total || 0), 0),
  }), [orcamentos])

  const filtered = useMemo(() => {
    return orcamentos.filter((o) => {
      const term = search.toLowerCase()
      const matchSearch =
        !term ||
        String(o.numero).includes(term) ||
        o.clienteNome?.toLowerCase().includes(term) ||
        o.veiculoModelo?.toLowerCase().includes(term) ||
        o.veiculoPlaca?.toLowerCase().includes(term) ||
        clientes.find((c) => c.id === o.clienteId)?.nome?.toLowerCase().includes(term)
      const matchStatus = statusFilter === 'todos' || o.status === statusFilter
      return matchSearch && matchStatus
    })
  }, [orcamentos, clientes, search, statusFilter])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PER_PAGE))
  const safePage   = Math.min(page, totalPages)
  const start      = (safePage - 1) * PER_PAGE
  const paginated  = filtered.slice(start, start + PER_PAGE)

  const goTo    = (p) => setPage(Math.max(1, Math.min(p, totalPages)))
  const canPrev = safePage > 1
  const canNext = safePage < totalPages

  // Gera lista de páginas visíveis (com "..." para muitas páginas)
  const pageNumbers = useMemo(() => {
    if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i + 1)
    const pages = []
    pages.push(1)
    if (safePage > 3) pages.push('...')
    for (let i = Math.max(2, safePage - 1); i <= Math.min(totalPages - 1, safePage + 1); i++) {
      pages.push(i)
    }
    if (safePage < totalPages - 2) pages.push('...')
    pages.push(totalPages)
    return pages
  }, [totalPages, safePage])

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-brand-black">Orçamentos</h1>
          <p className="text-sm text-brand-gray-light">{stats.total} carregados</p>
        </div>
        <Button onClick={() => navigate('/orcamentos/novo')}>
          <Plus size={16} /> Novo Orçamento
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="Total"      value={stats.total}      icon={FileText}     color="yellow" />
        <StatCard label="Em aberto"  value={stats.abertos}    icon={Clock}        color="amber"  />
        <StatCard label="Aprovados"  value={stats.aprovados}  icon={CheckCircle}  color="green"  sub={formatCurrency(stats.totalAprovado)} />
        <StatCard label="Concluídos" value={stats.concluidos} icon={XCircle}      color="blue"   />
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
        <div className="flex gap-2 overflow-x-auto pb-1 shrink-0">
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
        <SkeletonGrid />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={FileText}
          title="Nenhum orçamento encontrado"
          description={search ? 'Tente outro termo de busca.' : 'Crie seu primeiro orçamento.'}
          action={
            !search && (
              <Button onClick={() => navigate('/orcamentos/novo')}>
                <Plus size={16} /> Novo Orçamento
              </Button>
            )
          }
        />
      ) : (
        <>
          {/* Info da página */}
          <div className="flex items-center justify-between text-sm text-brand-gray-light -mb-2">
            <span>
              Mostrando <strong className="text-brand-black">{start + 1}–{Math.min(start + PER_PAGE, filtered.length)}</strong> de <strong className="text-brand-black">{filtered.length}</strong>
              {orcamentosHasMore && !search && statusFilter === 'todos' && ' (há mais no banco)'}
            </span>
            {totalPages > 1 && (
              <span>Página {safePage} de {totalPages}</span>
            )}
          </div>

          {/* Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {paginated.map((o) => {
              const cliente = clientes.find((c) => c.id === o.clienteId)
              const carro   = carros.find((c) => c.id === o.carroId)
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

          {/* Paginação */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-1 pt-2">
              <PageBtn onClick={() => goTo(1)} disabled={!canPrev} title="Primeira">
                <ChevronsLeft size={15} />
              </PageBtn>
              <PageBtn onClick={() => goTo(safePage - 1)} disabled={!canPrev} title="Anterior">
                <ChevronLeft size={15} />
              </PageBtn>

              {pageNumbers.map((p, i) =>
                p === '...'
                  ? <span key={`ellipsis-${i}`} className="px-2 text-brand-gray-light select-none">…</span>
                  : (
                    <button
                      key={p}
                      onClick={() => goTo(p)}
                      className={`w-9 h-9 rounded-lg text-sm font-medium transition-colors ${
                        p === safePage
                          ? 'bg-brand-yellow text-brand-black font-bold'
                          : 'text-brand-gray-light hover:bg-brand-gray-border hover:text-brand-black'
                      }`}
                    >
                      {p}
                    </button>
                  )
              )}

              <PageBtn onClick={() => goTo(safePage + 1)} disabled={!canNext} title="Próxima">
                <ChevronRight size={15} />
              </PageBtn>
              <PageBtn onClick={() => goTo(totalPages)} disabled={!canNext} title="Última">
                <ChevronsRight size={15} />
              </PageBtn>
            </div>
          )}

          {/* Carregar mais do Firestore */}
          {orcamentosHasMore && statusFilter === 'todos' && !search && safePage === totalPages && (
            <div className="flex justify-center pt-2 pb-4">
              <button
                onClick={loadMoreOrcamentos}
                disabled={loadingMore}
                className="flex items-center gap-2 px-5 py-2.5 rounded-lg border border-brand-gray-border text-sm font-medium text-brand-gray-light hover:text-brand-black hover:border-brand-yellow transition-colors disabled:opacity-50"
              >
                {loadingMore
                  ? <><Loader2 size={15} className="animate-spin" /> Carregando...</>
                  : 'Carregar mais orçamentos'
                }
              </button>
            </div>
          )}
        </>
      )}
    </div>
  )
}

// ── Sub-components ────────────────────────────────────────────────────────────

function PageBtn({ onClick, disabled, children, title }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title}
      className="w-9 h-9 rounded-lg flex items-center justify-center text-brand-gray-light hover:bg-brand-gray-border hover:text-brand-black transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
    >
      {children}
    </button>
  )
}

function SkeletonGrid() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {[...Array(6)].map((_, i) => (
        <div key={i} className="card p-4 animate-pulse">
          <div className="flex justify-between mb-3">
            <div>
              <div className="h-3 bg-brand-gray-border rounded w-12 mb-1.5" />
              <div className="h-4 bg-brand-gray-border rounded w-36" />
            </div>
            <div className="h-5 bg-brand-gray-border rounded-full w-20" />
          </div>
          <div className="h-3 bg-brand-gray-border rounded w-2/3 mb-4" />
          <div className="flex justify-between">
            <div className="h-3 bg-brand-gray-border rounded w-20" />
            <div className="h-4 bg-brand-gray-border rounded w-24" />
          </div>
        </div>
      ))}
    </div>
  )
}

function StatCard({ label, value, icon: Icon, color, sub }) {
  const colors = {
    yellow: 'bg-brand-yellow-light text-brand-yellow-dark',
    amber:  'bg-amber-50 text-amber-600',
    green:  'bg-green-50 text-green-600',
    blue:   'bg-blue-50 text-blue-600',
  }
  return (
    <div className="card p-4 flex items-center gap-3">
      <div className={`p-2.5 rounded-xl ${colors[color] ?? colors.yellow}`}>
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
  const { numero, status, totalGeral, total, createdAt, itens, clienteNome, veiculoModelo, veiculoPlaca } = orcamento
  const servicosCount = itens?.servicos?.length ?? 0
  const pecasCount    = itens?.pecas?.length    ?? 0
  const nomeCliente   = clienteNome || cliente?.nome || 'Cliente não encontrado'
  const nomeVeiculo   = veiculoModelo || carro?.nome  || 'Veículo não encontrado'
  const placaVeiculo  = veiculoPlaca  || carro?.placa || ''

  return (
    <div
      onClick={onClick}
      className="card p-4 cursor-pointer hover:border-brand-yellow hover:shadow-md transition-all duration-150 group"
    >
      <div className="flex items-start justify-between mb-3">
        <div>
          <p className="text-xs text-brand-gray-light font-medium">#{String(numero).padStart(4, '0')}</p>
          <p className="font-semibold text-brand-black group-hover:text-brand-yellow-dark transition-colors truncate max-w-[160px]">
            {nomeCliente}
          </p>
        </div>
        <span className={statusClass(status)}>{statusLabel(status)}</span>
      </div>

      <div className="flex items-center gap-2 text-sm text-brand-gray-light mb-3">
        <Car size={14} className="shrink-0" />
        <span className="truncate">
          {nomeVeiculo}{placaVeiculo ? ` • ${placaVeiculo}` : ''}
        </span>
      </div>

      <div className="flex items-center justify-between">
        <div className="flex gap-3 text-xs text-brand-gray-light">
          {servicosCount > 0 && <span>{servicosCount} serv.</span>}
          {pecasCount    > 0 && <span>{pecasCount} peças</span>}
        </div>
        <p className="font-bold text-brand-black">{formatCurrency(totalGeral ?? total ?? 0)}</p>
      </div>

      <p className="text-xs text-brand-gray-light mt-2">{formatDate(createdAt)}</p>
    </div>
  )
}
