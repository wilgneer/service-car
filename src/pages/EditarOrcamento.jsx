import React, { useState, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Plus, Trash2, ChevronLeft } from 'lucide-react'
import { useApp } from '../contexts/AppContext'
import { useAuth } from '../contexts/AuthContext'
import * as svc from '../firebase/services'
import { formatCurrency, calcTotals } from '../utils/helpers'
import Button from '../components/ui/Button'
import { Select } from '../components/ui/Input'

const emptyItem = () => ({ descricao: '', valor: '', quantidade: 1 })

export default function EditarOrcamento() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { orcamentos, clientes, carros, servicos, pecas, refresh } = useApp()
  const { isAdmin } = useAuth()

  const orcamento = orcamentos.find((o) => o.id === id)

  const [clienteId, setClienteId] = useState(orcamento?.clienteId ?? '')
  const [carroId, setCarroId] = useState(orcamento?.carroId ?? '')
  const [servicosItens, setServicosItens] = useState(orcamento?.itens?.servicos ?? [emptyItem()])
  const [pecasItens, setPecasItens] = useState(orcamento?.itens?.pecas ?? [])
  const [loading, setLoading] = useState(false)

  if (!orcamento) return null
  if (orcamento.status === 'faturado' && !isAdmin) {
    navigate(`/orcamentos/${id}`)
    return null
  }

  const { totalServicos, totalPecas, totalGeral } = useMemo(() =>
    calcTotals({ servicos: servicosItens, pecas: pecasItens }),
    [servicosItens, pecasItens]
  )

  const updateItem = (list, setList, index, field, value) =>
    setList((prev) => prev.map((item, i) => i === index ? { ...item, [field]: value } : item))

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      const itens = {
        servicos: servicosItens.filter((i) => i.descricao || i.valor),
        pecas: pecasItens.filter((i) => i.descricao || i.valor),
      }
      const { totalServicos: ts, totalPecas: tp, totalGeral: tg } = calcTotals(itens)
      await svc.updateOrcamento(id, { clienteId, carroId, itens, totalServicos: ts, totalPecas: tp, totalGeral: tg })
      await refresh()
      navigate(`/orcamentos/${id}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col gap-6 max-w-2xl">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate(`/orcamentos/${id}`)} className="p-2 rounded-lg hover:bg-brand-gray-border transition-colors">
          <ChevronLeft size={20} />
        </button>
        <h1 className="text-xl font-bold text-brand-black">Editar Orçamento #{String(orcamento.numero).padStart(4, '0')}</h1>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-5">
        <div className="card p-4 flex flex-col gap-4">
          <h2 className="font-semibold text-sm uppercase tracking-wide text-brand-black">Cliente e Veículo</h2>
          <Select label="Cliente" value={clienteId} onChange={(e) => setClienteId(e.target.value)}>
            <option value="">Selecione</option>
            {clientes.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
          </Select>
          <Select label="Veículo" value={carroId} onChange={(e) => setCarroId(e.target.value)}>
            <option value="">Selecione</option>
            {carros.map((c) => <option key={c.id} value={c.id}>{c.nome} {c.placa ? `(${c.placa})` : ''}</option>)}
          </Select>
        </div>

        <ItemsSection title="Serviços" items={servicosItens} setItems={setServicosItens} catalog={servicos} updateItem={updateItem} />
        <ItemsSection title="Peças / Produtos" items={pecasItens} setItems={setPecasItens} catalog={pecas} updateItem={updateItem} />

        <div className="card p-4 flex flex-col gap-2">
          <div className="flex justify-between text-sm"><span className="text-brand-gray-light">Serviços</span><span>{formatCurrency(totalServicos)}</span></div>
          <div className="flex justify-between text-sm"><span className="text-brand-gray-light">Peças</span><span>{formatCurrency(totalPecas)}</span></div>
          <div className="flex justify-between font-bold text-base border-t border-brand-gray-border pt-2 mt-1">
            <span>Total Geral</span><span>{formatCurrency(totalGeral)}</span>
          </div>
        </div>

        <div className="flex gap-3 pb-4">
          <Button variant="secondary" type="button" className="flex-1 justify-center" onClick={() => navigate(`/orcamentos/${id}`)}>Cancelar</Button>
          <Button type="submit" className="flex-1 justify-center" loading={loading}>Salvar Alterações</Button>
        </div>
      </form>
    </div>
  )
}

function ItemsSection({ title, items, setItems, catalog, updateItem }) {
  const addItem = () => setItems((p) => [...p, emptyItem()])
  const removeItem = (i) => setItems((p) => p.filter((_, idx) => idx !== i))

  return (
    <div className="card p-4 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold text-sm uppercase tracking-wide text-brand-black">{title}</h2>
        <button type="button" onClick={addItem} className="btn-secondary px-2.5 py-1.5 text-xs"><Plus size={13} /> Adicionar</button>
      </div>
      {items.length === 0 ? (
        <p className="text-sm text-brand-gray-light text-center py-3">Nenhum item</p>
      ) : items.map((item, i) => (
        <div key={i} className="border border-brand-gray-border rounded-lg p-3 flex flex-col gap-2 bg-brand-white-off">
          <div className="flex gap-2">
            <select
              className="input-field flex-1 text-xs"
              defaultValue=""
              onChange={(e) => {
                const found = catalog.find((s) => s.id === e.target.value)
                if (found) {
                  updateItem(items, setItems, i, 'descricao', found.descricao ?? found.tipoPeca ?? found.tipoServico ?? '')
                  if (found.valor) updateItem(items, setItems, i, 'valor', String(found.valor))
                }
              }}
            >
              <option value="">Selecionar do catálogo</option>
              {catalog.map((s) => <option key={s.id} value={s.id}>{s.descricao ?? s.tipoPeca ?? s.tipoServico}</option>)}
            </select>
            <button type="button" onClick={() => removeItem(i)} className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
              <Trash2 size={15} />
            </button>
          </div>
          <input value={item.descricao} onChange={(e) => updateItem(items, setItems, i, 'descricao', e.target.value)} placeholder="Descrição" className="input-field" />
          <div className="flex gap-2">
            <input type="number" value={item.quantidade} onChange={(e) => updateItem(items, setItems, i, 'quantidade', e.target.value)} placeholder="Qtd" min={1} className="input-field w-20" />
            <input type="number" value={item.valor} onChange={(e) => updateItem(items, setItems, i, 'valor', e.target.value)} placeholder="Valor unitário" step="0.01" className="input-field flex-1" />
          </div>
        </div>
      ))}
    </div>
  )
}
