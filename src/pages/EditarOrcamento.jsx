import React, { useState, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Plus, Trash2, ChevronLeft, Info } from 'lucide-react'
import { useApp } from '../contexts/AppContext'
import { useAuth } from '../contexts/AuthContext'
import { useToast } from '../contexts/ToastContext'
import * as svc from '../firebase/services'
import { formatCurrency, calcTotals } from '../utils/helpers'
import Button from '../components/ui/Button'
import Input, { Select } from '../components/ui/Input'

const emptyPeca    = () => ({ marca: '', descricao: '', valor: '', quantidade: 1 })
const emptyServico = () => ({ descricao: '', valor: '', quantidade: 1 })

export default function EditarOrcamento() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { orcamentos, clientes, carros, servicos, pecas, editOrcamento } = useApp()
  const { isAdmin } = useAuth()
  const toast = useToast()

  const orcamento = orcamentos.find((o) => o.id === id)

  const [clienteId,      setClienteId]      = useState(orcamento?.clienteId ?? '')
  const [carroId,        setCarroId]        = useState(orcamento?.carroId ?? '')
  const [servicosItens,  setServicosItens]  = useState(
    orcamento?.itens?.servicos?.length ? orcamento.itens.servicos : [emptyServico()]
  )
  const [pecasItens,     setPecasItens]     = useState(
    orcamento?.itens?.pecas?.length ? orcamento.itens.pecas : [emptyPeca()]
  )
  const [markup,         setMarkup]         = useState(orcamento?.extras?.markup ?? 20)
  const [rastreamento,   setRastreamento]   = useState(orcamento?.extras?.rastreamento ?? '')
  const [loading,        setLoading]        = useState(false)

  if (!orcamento) return null

  // Bloqueia edição de concluído para não-admin
  if (orcamento.status === 'concluido' && !isAdmin) {
    navigate(`/orcamentos/${id}`)
    return null
  }

  const totals = useMemo(() =>
    calcTotals(
      { servicos: servicosItens, pecas: pecasItens },
      { markup, rastreamento: Number(rastreamento) || 0 }
    ),
    [servicosItens, pecasItens, markup, rastreamento]
  )

  const updateItem = (list, setList, index, field, value) =>
    setList((prev) => prev.map((item, i) => i === index ? { ...item, [field]: value } : item))

  const addItem    = (setList, empty) => setList((prev) => [...prev, empty()])
  const removeItem = (setList, index) => setList((prev) => prev.filter((_, i) => i !== index))

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      const itens = {
        servicos: servicosItens.filter((i) => i.descricao || i.valor),
        pecas:    pecasItens.filter((i) => i.descricao || i.valor),
      }
      const extras = { markup: Number(markup) || 20, rastreamento: Number(rastreamento) || 0 }
      const t = calcTotals(itens, extras)

      const cliente = clientes.find((c) => c.id === clienteId)
      const carro   = carros.find((c) => c.id === carroId)

      const payload = {
        clienteId,
        carroId,
        itens,
        extras,
        clienteNome:         cliente?.nome  ?? orcamento.clienteNome  ?? '',
        veiculoModelo:       carro?.nome    ?? orcamento.veiculoModelo ?? '',
        veiculoPlaca:        carro?.placa   ?? orcamento.veiculoPlaca  ?? '',
        veiculoAno:          carro?.ano     ?? orcamento.veiculoAno    ?? '',
        totalMaoDeObra:      t.totalMaoDeObra,
        totalPecasSemMarkup: t.totalPecasSemMarkup,
        totalMarkup:         t.totalMarkup,
        totalPecas:          t.totalPecas,
        rastreamento:        t.rastreamento,
        totalGeral:          t.totalGeral,
      }

      await svc.updateOrcamento(id, payload)
      editOrcamento(id, payload)
      toast.success('Orçamento atualizado!')
      navigate(`/orcamentos/${id}`)
    } catch {
      toast.error('Erro ao salvar orçamento.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col gap-5 max-w-2xl">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={() => navigate(`/orcamentos/${id}`)} className="p-2 rounded-lg hover:bg-brand-gray-border transition-colors">
          <ChevronLeft size={20} />
        </button>
        <div>
          <h1 className="text-xl font-bold text-brand-black">
            Editar Orçamento #{String(orcamento.numero).padStart(4, '0')}
          </h1>
          <p className="text-sm text-brand-gray-light">Altere os dados do orçamento</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-5">

        {/* Cliente e Veículo */}
        <div className="card p-4 flex flex-col gap-4">
          <h2 className="font-semibold text-sm uppercase tracking-wide text-brand-black">Cliente e Veículo</h2>
          <Select label="Cliente" value={clienteId} onChange={(e) => { setClienteId(e.target.value); setCarroId('') }}>
            <option value="">Selecione um cliente</option>
            {clientes.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
          </Select>
          <Select label="Veículo" value={carroId} onChange={(e) => setCarroId(e.target.value)}>
            <option value="">Selecione um veículo</option>
            {carros
              .filter((c) => !clienteId || c.clienteId === clienteId)
              .map((c) => <option key={c.id} value={c.id}>{c.nome} {c.placa ? `(${c.placa})` : ''}</option>)
            }
          </Select>
        </div>

        {/* Peças */}
        <div className="card p-4 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-sm uppercase tracking-wide text-brand-black">Peças / Produtos</h2>
            <button type="button" onClick={() => addItem(setPecasItens, emptyPeca)} className="btn-secondary px-2.5 py-1.5 text-xs">
              <Plus size={13} /> Adicionar
            </button>
          </div>

          {/* Markup config */}
          <div className="flex items-center gap-3 bg-brand-yellow-light rounded-lg px-3 py-2">
            <Info size={14} className="text-brand-yellow-dark shrink-0" />
            <span className="text-xs text-brand-yellow-dark flex-1">Markup aplicado ao custo das peças</span>
            <div className="flex items-center gap-1">
              <input
                type="number"
                value={markup}
                onChange={(e) => setMarkup(e.target.value)}
                className="w-14 text-center border border-brand-yellow-dark rounded px-1 py-0.5 text-xs font-bold bg-white text-brand-black"
                min={0}
                max={100}
              />
              <span className="text-xs font-bold text-brand-yellow-dark">%</span>
            </div>
          </div>

          {pecasItens.map((item, i) => (
            <PecaRow
              key={i}
              item={item}
              catalog={pecas}
              markup={markup}
              onChange={(field, val) => updateItem(pecasItens, setPecasItens, i, field, val)}
              onRemove={() => removeItem(setPecasItens, i)}
              canRemove={pecasItens.length > 1}
            />
          ))}

          <div className="border-t border-brand-gray-border pt-2 flex flex-col gap-1">
            <div className="flex justify-between text-xs text-brand-gray-light">
              <span>Subtotal peças (custo)</span>
              <span>{formatCurrency(totals.totalPecasSemMarkup)}</span>
            </div>
            <div className="flex justify-between text-xs text-brand-gray-light">
              <span>Markup {markup}%</span>
              <span>+ {formatCurrency(totals.totalMarkup)}</span>
            </div>
            <div className="flex justify-between text-sm font-semibold text-brand-black">
              <span>Total peças</span>
              <span>{formatCurrency(totals.totalPecas)}</span>
            </div>
          </div>
        </div>

        {/* Mão de Obra */}
        <div className="card p-4 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-sm uppercase tracking-wide text-brand-black">Mão de Obra</h2>
            <button type="button" onClick={() => addItem(setServicosItens, emptyServico)} className="btn-secondary px-2.5 py-1.5 text-xs">
              <Plus size={13} /> Adicionar
            </button>
          </div>
          {servicosItens.map((item, i) => (
            <ServicoRow
              key={i}
              item={item}
              catalog={servicos}
              onChange={(field, val) => updateItem(servicosItens, setServicosItens, i, field, val)}
              onRemove={() => removeItem(setServicosItens, i)}
              canRemove={servicosItens.length > 1}
            />
          ))}
          <div className="flex justify-between text-sm font-semibold text-brand-black border-t border-brand-gray-border pt-2">
            <span>Total mão de obra</span>
            <span>{formatCurrency(totals.totalMaoDeObra)}</span>
          </div>
        </div>

        {/* Rastreamento */}
        <div className="card p-4 flex items-center gap-4">
          <div className="flex-1">
            <p className="text-sm font-semibold text-brand-black mb-1">Rastreamento</p>
            <p className="text-xs text-brand-gray-light">Valor do serviço de rastreamento (opcional)</p>
          </div>
          <input
            type="number"
            value={rastreamento}
            onChange={(e) => setRastreamento(e.target.value)}
            placeholder="0,00"
            step="0.01"
            className="input-field w-36 text-right"
          />
        </div>

        {/* Resumo */}
        <div className="card p-4 flex flex-col gap-2">
          <h2 className="font-semibold text-sm uppercase tracking-wide text-brand-black mb-1">Resumo</h2>
          <TotalRow label="Peças (com markup)"  value={totals.totalPecas} />
          <TotalRow label="Mão de Obra"          value={totals.totalMaoDeObra} />
          {totals.rastreamento > 0 && <TotalRow label="Rastreamento" value={totals.rastreamento} />}
          <div className="border-t border-brand-gray-border pt-2 mt-1">
            <TotalRow label="Total Geral" value={totals.totalGeral} bold />
          </div>
        </div>

        <div className="flex gap-3 pb-4">
          <Button variant="secondary" type="button" className="flex-1 justify-center" onClick={() => navigate(`/orcamentos/${id}`)}>
            Cancelar
          </Button>
          <Button type="submit" className="flex-1 justify-center" loading={loading}>
            Salvar Alterações
          </Button>
        </div>
      </form>
    </div>
  )
}

function PecaRow({ item, catalog, markup, onChange, onRemove, canRemove }) {
  const custo = (Number(item.valor) || 0) * (Number(item.quantidade) || 1)
  const total = custo * (1 + (Number(markup) || 0) / 100)

  return (
    <div className="border border-brand-gray-border rounded-lg p-3 flex flex-col gap-2 bg-brand-white-off">
      <div className="flex gap-2">
        <select
          onChange={(e) => {
            const found = catalog.find((s) => s.id === e.target.value)
            if (found) {
              onChange('descricao', found.tipoPeca ?? '')
              if (found.valor) onChange('valor', String(found.valor))
            }
          }}
          className="input-field flex-1 text-xs"
          defaultValue=""
        >
          <option value="">Selecionar do catálogo</option>
          {catalog.map((s) => <option key={s.id} value={s.id}>{s.tipoPeca}</option>)}
        </select>
        {canRemove && (
          <button type="button" onClick={onRemove} className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
            <Trash2 size={15} />
          </button>
        )}
      </div>
      <div className="grid grid-cols-2 gap-2">
        <input value={item.marca} onChange={(e) => onChange('marca', e.target.value)} placeholder="Marca (ex: NGK, Bosch...)" className="input-field col-span-2" />
        <input value={item.descricao} onChange={(e) => onChange('descricao', e.target.value)} placeholder="Descrição da peça" className="input-field col-span-2" />
        <input type="number" value={item.quantidade} onChange={(e) => onChange('quantidade', e.target.value)} placeholder="Qtd" min={1} className="input-field" />
        <input type="number" value={item.valor} onChange={(e) => onChange('valor', e.target.value)} placeholder="Custo unit." step="0.01" className="input-field" />
      </div>
      <div className="flex items-center justify-between text-xs bg-brand-yellow-light rounded px-2 py-1.5">
        <span className="text-brand-yellow-dark">Custo: {formatCurrency(custo)} + {markup}% = </span>
        <span className="font-bold text-brand-black">{formatCurrency(total)}</span>
      </div>
    </div>
  )
}

function ServicoRow({ item, catalog, onChange, onRemove, canRemove }) {
  const total = (Number(item.valor) || 0) * (Number(item.quantidade) || 1)
  return (
    <div className="border border-brand-gray-border rounded-lg p-3 flex flex-col gap-2 bg-brand-white-off">
      <div className="flex gap-2">
        <select
          onChange={(e) => {
            const found = catalog.find((s) => s.id === e.target.value)
            if (found) {
              onChange('descricao', found.tipoServico ?? found.descricao ?? '')
              if (found.valor) onChange('valor', String(found.valor))
            }
          }}
          className="input-field flex-1 text-xs"
          defaultValue=""
        >
          <option value="">Selecionar do catálogo</option>
          {catalog.map((s) => <option key={s.id} value={s.id}>{s.tipoServico}</option>)}
        </select>
        {canRemove && (
          <button type="button" onClick={onRemove} className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
            <Trash2 size={15} />
          </button>
        )}
      </div>
      <input value={item.descricao} onChange={(e) => onChange('descricao', e.target.value)} placeholder="Descrição do serviço" className="input-field" />
      <div className="flex gap-2">
        <input type="number" value={item.quantidade} onChange={(e) => onChange('quantidade', e.target.value)} placeholder="Qtd" min={1} className="input-field w-20" />
        <input type="number" value={item.valor} onChange={(e) => onChange('valor', e.target.value)} placeholder="Valor unitário" step="0.01" className="input-field flex-1" />
        <div className="input-field w-28 bg-brand-gray-border text-sm font-medium text-right pointer-events-none">
          {formatCurrency(total)}
        </div>
      </div>
    </div>
  )
}

function TotalRow({ label, value, bold }) {
  return (
    <div className={`flex items-center justify-between ${bold ? 'font-bold text-base' : 'text-sm'}`}>
      <span className={bold ? 'text-brand-black' : 'text-brand-gray-light'}>{label}</span>
      <span className={bold ? 'text-brand-black text-lg' : 'text-brand-black'}>{formatCurrency(value)}</span>
    </div>
  )
}
