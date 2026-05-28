import React, { useMemo } from 'react'
import { BarChart2, TrendingUp, FileText, XCircle, CheckCircle, Users, Car, DollarSign } from 'lucide-react'
import { useApp } from '../contexts/AppContext'
import { formatCurrency } from '../utils/helpers'

export default function Relatorios() {
  const { orcamentos, clientes, carros } = useApp()

  const stats = useMemo(() => {
    const total      = orcamentos.length
    const pendentes  = orcamentos.filter((o) => ['rascunho', 'em_analise'].includes(o.status)).length
    const aprovados  = orcamentos.filter((o) => o.status === 'aprovado').length
    const concluidos = orcamentos.filter((o) => o.status === 'concluido').length
    const reprovados = orcamentos.filter((o) => o.status === 'reprovado').length

    const totalConcluido = orcamentos
      .filter((o) => ['aprovado', 'concluido'].includes(o.status))
      .reduce((s, o) => s + (o.totalGeral || o.total || 0), 0)
    const totalPendente = orcamentos
      .filter((o) => ['rascunho', 'em_analise'].includes(o.status))
      .reduce((s, o) => s + (o.totalGeral || o.total || 0), 0)
    const ticketMedio = concluidos > 0
      ? orcamentos.filter((o) => o.status === 'concluido').reduce((s, o) => s + (o.totalGeral || 0), 0) / concluidos
      : 0

    // Top clientes por valor (aprovado + concluído)
    const porCliente = {}
    orcamentos
      .filter((o) => ['aprovado', 'concluido'].includes(o.status))
      .forEach((o) => {
        const key = o.clienteId || o.clienteNome || 'desconhecido'
        porCliente[key] = (porCliente[key] || 0) + (o.totalGeral || 0)
      })
    const topClientes = Object.entries(porCliente)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([id, valor]) => ({
        cliente: clientes.find((c) => c.id === id) ?? { nome: id },
        valor,
      }))

    return { total, pendentes, aprovados, concluidos, reprovados, totalConcluido, totalPendente, ticketMedio, topClientes }
  }, [orcamentos, clientes])

  const pctAprovado  = stats.total > 0 ? ((stats.aprovados + stats.concluidos) / stats.total) * 100 : 0
  const pctReprovado = stats.total > 0 ? (stats.reprovados / stats.total) * 100 : 0

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-bold text-brand-black">Relatórios</h1>
        <p className="text-sm text-brand-gray-light">Visão geral do desempenho</p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KpiCard label="Total de Orçamentos"   value={stats.total}      icon={FileText}     />
        <KpiCard label="Pend. Aprovação"        value={stats.pendentes}  icon={FileText}     color="yellow" sub={formatCurrency(stats.totalPendente)} />
        <KpiCard label="Aprovados / Concluídos" value={stats.aprovados + stats.concluidos} icon={CheckCircle} color="green" sub={formatCurrency(stats.totalConcluido)} />
        <KpiCard label="Reprovados"             value={stats.reprovados} icon={XCircle}      color="red" />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Taxa de conversão */}
        <div className="card p-5">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp size={18} className="text-brand-yellow-dark" />
            <h2 className="font-semibold text-brand-black">Taxa de Conversão</h2>
          </div>
          <div className="flex flex-col gap-3">
            <ProgressBar label="Aprovados / Concluídos" pct={pctAprovado}  color="bg-green-500" value={`${pctAprovado.toFixed(1)}%`}  />
            <ProgressBar label="Reprovados"              pct={pctReprovado} color="bg-red-400"   value={`${pctReprovado.toFixed(1)}%`} />
          </div>
        </div>

        {/* Financeiro */}
        <div className="card p-5">
          <div className="flex items-center gap-2 mb-4">
            <DollarSign size={18} className="text-brand-yellow-dark" />
            <h2 className="font-semibold text-brand-black">Resumo Financeiro</h2>
          </div>
          <div className="flex flex-col gap-3">
            <FinRow label="Receita (Aprov. + Concluídos)" value={formatCurrency(stats.totalConcluido)} bold green />
            <FinRow label="Em Aberto (Pend. Aprovação)"   value={formatCurrency(stats.totalPendente)} />
            <FinRow label="Ticket Médio (Concluídos)"     value={formatCurrency(stats.ticketMedio)} />
            <FinRow label="Clientes Ativos"               value={clientes.length} />
            <FinRow label="Veículos Cadastrados"          value={carros.length} />
          </div>
        </div>
      </div>

      {/* Top clientes */}
      {stats.topClientes.length > 0 && (
        <div className="card p-5">
          <div className="flex items-center gap-2 mb-4">
            <Users size={18} className="text-brand-yellow-dark" />
            <h2 className="font-semibold text-brand-black">Top Clientes por Faturamento</h2>
          </div>
          <div className="flex flex-col divide-y divide-brand-gray-border">
            {stats.topClientes.map(({ cliente, valor }, i) => (
              <div key={i} className="flex items-center justify-between py-3 gap-4">
                <div className="flex items-center gap-3">
                  <span className="w-6 h-6 bg-brand-yellow rounded-full flex items-center justify-center text-xs font-bold text-brand-black">{i + 1}</span>
                  <p className="font-medium text-brand-black">{cliente?.nome ?? 'Cliente removido'}</p>
                </div>
                <p className="font-bold text-brand-black">{formatCurrency(valor)}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function KpiCard({ label, value, icon: Icon, color, sub }) {
  const colors = { green: 'bg-green-50 text-green-600', red: 'bg-red-50 text-red-500', yellow: 'bg-brand-yellow-light text-brand-yellow-dark', default: 'bg-brand-yellow-light text-brand-yellow-dark' }
  return (
    <div className="card p-4 flex items-center gap-3">
      <div className={`p-2.5 rounded-xl ${colors[color ?? 'default']}`}><Icon size={18} /></div>
      <div>
        <p className="text-xl font-bold text-brand-black leading-tight">{value}</p>
        <p className="text-xs text-brand-gray-light">{label}</p>
        {sub && <p className="text-xs font-medium text-green-600">{sub}</p>}
      </div>
    </div>
  )
}

function ProgressBar({ label, pct, color, value }) {
  return (
    <div>
      <div className="flex justify-between text-sm mb-1">
        <span className="text-brand-gray-light">{label}</span>
        <span className="font-medium text-brand-black">{value}</span>
      </div>
      <div className="h-2 bg-brand-gray-border rounded-full overflow-hidden">
        <div className={`h-full ${color} rounded-full transition-all`} style={{ width: `${Math.min(pct, 100)}%` }} />
      </div>
    </div>
  )
}

function FinRow({ label, value, bold, green }) {
  return (
    <div className={`flex justify-between text-sm ${bold ? 'font-semibold' : ''}`}>
      <span className="text-brand-gray-light">{label}</span>
      <span className={green ? 'text-green-600 font-bold' : 'text-brand-black'}>{value}</span>
    </div>
  )
}
