import React, { useState, useEffect, useMemo } from 'react'
import { Activity, AlertTriangle, Clock, User, Filter, RefreshCw, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { getLogs } from '../firebase/logger'
import { useNavigate } from 'react-router-dom'

const FILTERS = [
  { key: 'all',      label: 'Todos'     },
  { key: 'activity', label: 'Atividade' },
  { key: 'error',    label: 'Erros'     },
]

const ACTION_LABELS = {
  orcamento_criado:    'Orçamento criado',
  orcamento_editado:   'Orçamento editado',
  orcamento_aprovado:  'Orçamento aprovado',
  orcamento_reprovado: 'Orçamento reprovado',
  orcamento_concluido: 'Orçamento concluído',
  orcamento_excluido:  'Orçamento excluído',
  cliente_criado:      'Cliente criado',
  cliente_editado:     'Cliente editado',
  cliente_excluido:    'Cliente excluído',
  carro_criado:        'Veículo criado',
  carro_editado:       'Veículo editado',
  carro_excluido:      'Veículo excluído',
  servico_criado:      'Serviço criado',
  servico_editado:     'Serviço editado',
  servico_excluido:    'Serviço excluído',
  peca_criada:         'Peça criada',
  peca_editada:        'Peça editada',
  peca_excluida:       'Peça excluída',
}

const PER_PAGE = 20

function formatTs(ts) {
  if (!ts) return '—'
  try {
    const d = ts?.toDate ? ts.toDate() : new Date(ts)
    return d.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
  } catch { return '—' }
}

function LogBadge({ type, action }) {
  if (type === 'error') {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-red-100 text-red-700">
        <AlertTriangle size={11} /> Erro
      </span>
    )
  }
  const isDelete  = action?.includes('exclu') || action?.includes('remov')
  const isApprove = action?.includes('aprovado') || action?.includes('concluido')
  const isReject  = action?.includes('reprovado')
  const cls = isDelete ? 'bg-red-50 text-red-600' : isApprove ? 'bg-green-100 text-green-700' : isReject ? 'bg-orange-100 text-orange-700' : 'bg-brand-yellow-light text-brand-yellow-dark'
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${cls}`}>
      <Activity size={11} />
      {ACTION_LABELS[action] ?? action ?? 'Atividade'}
    </span>
  )
}

function PageBtn({ onClick, disabled, children }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="w-8 h-8 rounded-lg flex items-center justify-center text-brand-gray-light hover:bg-brand-gray-border hover:text-brand-black transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
    >
      {children}
    </button>
  )
}

export default function Logs() {
  const { isAdmin, isDemo } = useAuth()
  const navigate = useNavigate()
  const [logs,    setLogs]    = useState([])
  const [loading, setLoading] = useState(true)
  const [filter,  setFilter]  = useState('all')
  const [search,  setSearch]  = useState('')
  const [page,    setPage]    = useState(1)

  useEffect(() => {
    if (!isAdmin) { navigate('/'); return }
    load()
  }, [isAdmin])

  // Reset página ao mudar filtro/busca
  useEffect(() => { setPage(1) }, [filter, search])

  const load = async () => {
    setLoading(true)
    const data = await getLogs(500)
    setLogs(data)
    setLoading(false)
  }

  const filtered = useMemo(() => logs.filter((l) => {
    if (filter !== 'all' && l.type !== filter) return false
    if (search) {
      const term = search.toLowerCase()
      return l.message?.toLowerCase().includes(term) || l.userEmail?.toLowerCase().includes(term) || l.action?.toLowerCase().includes(term)
    }
    return true
  }), [logs, filter, search])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PER_PAGE))
  const safePage   = Math.min(page, totalPages)
  const start      = (safePage - 1) * PER_PAGE
  const paginated  = filtered.slice(start, start + PER_PAGE)

  const errorCount    = logs.filter((l) => l.type === 'error').length
  const activityCount = logs.filter((l) => l.type === 'activity').length

  return (
    <div className="flex flex-col gap-5">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-xl font-bold text-brand-black">Logs do Sistema</h1>
          <p className="text-sm text-brand-gray-light">
            {activityCount} atividade{activityCount !== 1 ? 's' : ''} · {errorCount} erro{errorCount !== 1 ? 's' : ''}
          </p>
        </div>
        <button
          onClick={load}
          disabled={loading}
          className="flex items-center gap-2 px-3 py-2 rounded-lg border border-brand-gray-border text-sm text-brand-gray-light hover:text-brand-black hover:bg-brand-gray-border transition-colors disabled:opacity-50"
        >
          <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
          Atualizar
        </button>
      </div>

      {isDemo && (
        <div className="card p-4 bg-brand-yellow-light border border-brand-yellow">
          <p className="text-sm text-brand-yellow-dark font-medium">
            Modo demo — os logs abaixo são apenas de exemplo.
          </p>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="card p-3 flex flex-col gap-1">
          <p className="text-xs text-brand-gray-light uppercase tracking-wide">Total</p>
          <p className="text-2xl font-bold text-brand-black">{logs.length}</p>
        </div>
        <div className="card p-3 flex flex-col gap-1">
          <p className="text-xs text-brand-gray-light uppercase tracking-wide">Atividades</p>
          <p className="text-2xl font-bold text-brand-black">{activityCount}</p>
        </div>
        <div className="card p-3 flex flex-col gap-1">
          <p className="text-xs text-brand-gray-light uppercase tracking-wide">Erros</p>
          <p className={`text-2xl font-bold ${errorCount > 0 ? 'text-red-500' : 'text-brand-black'}`}>{errorCount}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex gap-1 p-1 bg-brand-gray-border rounded-lg shrink-0">
          {FILTERS.map((f) => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                filter === f.key ? 'bg-brand-black text-white' : 'text-brand-gray-light hover:text-brand-black'
              }`}
            >
              {f.label}
              {f.key === 'error' && errorCount > 0 && (
                <span className="ml-1 bg-red-500 text-white text-xs rounded-full px-1.5">{errorCount}</span>
              )}
            </button>
          ))}
        </div>
        <div className="relative flex-1">
          <Filter size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-gray-light" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por mensagem, usuário ou ação..."
            className="input-field pl-8 w-full"
          />
        </div>
      </div>

      {/* List */}
      {loading ? (
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 border-4 border-brand-yellow border-t-transparent rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="card p-10 flex flex-col items-center gap-3 text-center">
          <Activity size={36} className="text-brand-gray-border" />
          <p className="text-brand-gray-light">
            {logs.length === 0 ? 'Nenhum log registrado ainda.' : 'Nenhum resultado para os filtros aplicados.'}
          </p>
        </div>
      ) : (
        <>
          <div className="text-sm text-brand-gray-light -mb-2">
            Mostrando <strong className="text-brand-black">{start + 1}–{Math.min(start + PER_PAGE, filtered.length)}</strong> de <strong className="text-brand-black">{filtered.length}</strong>
          </div>

          <div className="flex flex-col gap-2">
            {paginated.map((log) => (
              <div
                key={log.id}
                className={`card p-4 flex flex-col gap-2 ${log.type === 'error' ? 'border-l-2 border-red-400' : ''}`}
              >
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <LogBadge type={log.type} action={log.action} />
                  <div className="flex items-center gap-1 text-xs text-brand-gray-light">
                    <Clock size={11} />
                    {formatTs(log.createdAt)}
                  </div>
                </div>
                <p className={`text-sm ${log.type === 'error' ? 'text-red-700 font-medium' : 'text-brand-black'}`}>
                  {log.message || '—'}
                </p>
                <div className="flex items-center gap-1 text-xs text-brand-gray-light">
                  <User size={11} />
                  {log.userEmail || log.userId || 'desconhecido'}
                </div>
                {log.details && Object.keys(log.details).length > 0 && (
                  <details className="text-xs text-brand-gray-light cursor-pointer">
                    <summary className="select-none hover:text-brand-black transition-colors">ver detalhes</summary>
                    <pre className="mt-1 bg-brand-gray-border rounded p-2 overflow-x-auto text-xs leading-relaxed">
                      {JSON.stringify(log.details, null, 2)}
                    </pre>
                  </details>
                )}
              </div>
            ))}
          </div>

          {/* Paginação */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-1 pt-2 pb-4">
              <PageBtn onClick={() => setPage(1)} disabled={safePage === 1}><ChevronsLeft size={14} /></PageBtn>
              <PageBtn onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={safePage === 1}><ChevronLeft size={14} /></PageBtn>
              <span className="px-3 py-1 text-sm text-brand-gray-light">
                {safePage} / {totalPages}
              </span>
              <PageBtn onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={safePage === totalPages}><ChevronRight size={14} /></PageBtn>
              <PageBtn onClick={() => setPage(totalPages)} disabled={safePage === totalPages}><ChevronsRight size={14} /></PageBtn>
            </div>
          )}
        </>
      )}
    </div>
  )
}
