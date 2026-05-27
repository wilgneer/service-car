import React, { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ChevronLeft, Edit, Trash2, CheckCircle, XCircle, Printer, Car } from 'lucide-react'
import { useApp } from '../contexts/AppContext'
import { useAuth } from '../contexts/AuthContext'
import * as svc from '../firebase/services'
import { formatCurrency, formatDate, formatDatetime, statusLabel, statusClass, calcTotals } from '../utils/helpers'
import Button from '../components/ui/Button'
import ConfirmDialog from '../components/ui/ConfirmDialog'

export default function OrcamentoDetalhe() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { orcamentos, clientes, carros, refresh } = useApp()
  const { isAdmin } = useAuth()

  const [confirm, setConfirm] = useState(null)
  const [loading, setLoading] = useState(false)

  const orcamento = orcamentos.find((o) => o.id === id)
  const cliente = clientes.find((c) => c.id === orcamento?.clienteId)
  const carro = carros.find((c) => c.id === orcamento?.carroId)

  useEffect(() => {
    if (!orcamento && orcamentos.length > 0) navigate('/')
  }, [orcamento, orcamentos])

  if (!orcamento) return <div className="flex items-center justify-center h-64"><div className="animate-spin w-8 h-8 border-4 border-brand-yellow border-t-transparent rounded-full" /></div>

  const isFaturado = orcamento.status === 'faturado'
  const canEdit = isAdmin || !isFaturado
  const { totalServicos, totalPecas, totalGeral } = calcTotals(orcamento.itens)

  const action = async (fn) => {
    setLoading(true)
    try { await fn(); await refresh() }
    finally { setLoading(false) }
  }

  const handleFaturar = () => action(() => svc.faturarOrcamento(id))
  const handleCancelar = () => action(() => svc.cancelarOrcamento(id))
  const handleDelete = () => action(async () => { await svc.deleteOrcamento(id); navigate('/') })

  return (
    <div className="flex flex-col gap-5 max-w-2xl">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={() => navigate('/')} className="p-2 rounded-lg hover:bg-brand-gray-border transition-colors">
          <ChevronLeft size={20} />
        </button>
        <div className="flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-xl font-bold text-brand-black">
              Orçamento #{String(orcamento.numero).padStart(4, '0')}
            </h1>
            <span className={statusClass(orcamento.status)}>{statusLabel(orcamento.status)}</span>
          </div>
          <p className="text-sm text-brand-gray-light">{formatDatetime(orcamento.createdAt)}</p>
        </div>
      </div>

      {/* Actions */}
      <div className="flex flex-wrap gap-2">
        {orcamento.status === 'pendente' && (
          <>
            <Button onClick={() => setConfirm('faturar')} variant="primary" size="sm">
              <CheckCircle size={15} /> Faturar
            </Button>
            <Button onClick={() => setConfirm('cancelar')} variant="secondary" size="sm">
              <XCircle size={15} /> Cancelar
            </Button>
          </>
        )}
        {canEdit && (
          <Button onClick={() => navigate(`/orcamentos/${id}/editar`)} variant="secondary" size="sm">
            <Edit size={15} /> Editar
          </Button>
        )}
        {canEdit && (
          <Button onClick={() => setConfirm('deletar')} variant="danger" size="sm">
            <Trash2 size={15} /> Excluir
          </Button>
        )}
        <Button onClick={() => window.print()} variant="secondary" size="sm">
          <Printer size={15} /> Imprimir
        </Button>
      </div>

      {/* Cliente / Carro */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="card p-4">
          <p className="text-xs text-brand-gray-light uppercase tracking-wide font-medium mb-2">Cliente</p>
          <p className="font-semibold text-brand-black">{cliente?.nome ?? '-'}</p>
          {cliente?.celular && <p className="text-sm text-brand-gray-light">{cliente.celular}</p>}
        </div>
        <div className="card p-4">
          <p className="text-xs text-brand-gray-light uppercase tracking-wide font-medium mb-2">Veículo</p>
          <div className="flex items-center gap-2">
            <Car size={16} className="text-brand-yellow-dark" />
            <p className="font-semibold text-brand-black">{carro?.nome ?? '-'}</p>
          </div>
          {carro && (
            <div className="text-sm text-brand-gray-light mt-1 flex flex-wrap gap-x-3 gap-y-0.5">
              {carro.marca && <span>{carro.marca}</span>}
              {carro.ano && <span>{carro.ano}</span>}
              {carro.cor && <span>{carro.cor}</span>}
              {carro.placa && <span className="font-medium text-brand-black">{carro.placa}</span>}
            </div>
          )}
        </div>
      </div>

      {/* Serviços */}
      {orcamento.itens?.servicos?.length > 0 && (
        <div className="card p-4">
          <p className="text-xs text-brand-gray-light uppercase tracking-wide font-medium mb-3">Serviços</p>
          <div className="flex flex-col divide-y divide-brand-gray-border">
            {orcamento.itens.servicos.map((item, i) => (
              <ItemLine key={i} item={item} />
            ))}
          </div>
          <div className="flex justify-between text-sm font-medium mt-3 pt-3 border-t border-brand-gray-border">
            <span className="text-brand-gray-light">Subtotal Serviços</span>
            <span>{formatCurrency(totalServicos)}</span>
          </div>
        </div>
      )}

      {/* Peças */}
      {orcamento.itens?.pecas?.length > 0 && (
        <div className="card p-4">
          <p className="text-xs text-brand-gray-light uppercase tracking-wide font-medium mb-3">Peças / Produtos</p>
          <div className="flex flex-col divide-y divide-brand-gray-border">
            {orcamento.itens.pecas.map((item, i) => (
              <ItemLine key={i} item={item} />
            ))}
          </div>
          <div className="flex justify-between text-sm font-medium mt-3 pt-3 border-t border-brand-gray-border">
            <span className="text-brand-gray-light">Subtotal Peças</span>
            <span>{formatCurrency(totalPecas)}</span>
          </div>
        </div>
      )}

      {/* Total */}
      <div className="card p-4">
        <div className="flex items-center justify-between">
          <p className="font-semibold text-brand-black">Total Geral</p>
          <p className="text-2xl font-bold text-brand-black">{formatCurrency(totalGeral)}</p>
        </div>
        {isFaturado && orcamento.faturadoEm && (
          <p className="text-xs text-green-600 mt-1">Faturado em {formatDatetime(orcamento.faturadoEm)}</p>
        )}
      </div>

      {/* Confirm dialogs */}
      <ConfirmDialog
        open={confirm === 'faturar'}
        onClose={() => setConfirm(null)}
        onConfirm={handleFaturar}
        title="Faturar orçamento?"
        message="O orçamento será marcado como faturado e não poderá ser editado por usuários comuns."
      />
      <ConfirmDialog
        open={confirm === 'cancelar'}
        onClose={() => setConfirm(null)}
        onConfirm={handleCancelar}
        title="Cancelar orçamento?"
        message="O orçamento será marcado como cancelado."
        danger
      />
      <ConfirmDialog
        open={confirm === 'deletar'}
        onClose={() => setConfirm(null)}
        onConfirm={handleDelete}
        title="Excluir orçamento?"
        message="Esta ação não pode ser desfeita."
        danger
      />
    </div>
  )
}

function ItemLine({ item }) {
  const qty = Number(item.quantidade) || 1
  const total = (Number(item.valor) || 0) * qty
  return (
    <div className="flex items-center justify-between py-2.5 gap-2">
      <div className="flex-1 min-w-0">
        <p className="text-sm text-brand-black truncate">{item.descricao || '-'}</p>
        {qty > 1 && <p className="text-xs text-brand-gray-light">{qty}x {formatCurrency(item.valor)}</p>}
      </div>
      <p className="text-sm font-medium text-brand-black whitespace-nowrap">{formatCurrency(total)}</p>
    </div>
  )
}
