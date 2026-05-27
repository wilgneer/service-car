import React, { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Trash2, ChevronLeft, UserPlus, Car as CarIcon } from 'lucide-react'
import { useApp } from '../contexts/AppContext'
import * as svc from '../firebase/services'
import { formatCurrency, calcTotals } from '../utils/helpers'
import Button from '../components/ui/Button'
import Input, { Select } from '../components/ui/Input'
import Modal from '../components/ui/Modal'

const emptyItem = () => ({ descricao: '', valor: '', quantidade: 1 })

export default function NovoOrcamento() {
  const navigate = useNavigate()
  const { clientes, carros, servicos, pecas, refresh } = useApp()

  const [clienteId, setClienteId] = useState('')
  const [carroId, setCarroId] = useState('')
  const [servicosItens, setServicosItens] = useState([emptyItem()])
  const [pecasItens, setPecasItens] = useState([])
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState({})

  // Quick-create modals
  const [showNovoCliente, setShowNovoCliente] = useState(false)
  const [showNovoCarro, setShowNovoCarro] = useState(false)
  const [newCliente, setNewCliente] = useState({ nome: '', celular: '' })
  const [newCarro, setNewCarro] = useState({ nome: '', marca: '', cor: '', ano: '', placa: '' })
  const [savingModal, setSavingModal] = useState(false)

  const carrosFiltrados = useMemo(() =>
    clienteId ? carros.filter((c) => c.clienteId === clienteId) : carros,
    [carros, clienteId]
  )

  const { totalServicos, totalPecas, totalGeral } = useMemo(() =>
    calcTotals({ servicos: servicosItens, pecas: pecasItens }),
    [servicosItens, pecasItens]
  )

  const updateItem = (list, setList, index, field, value) => {
    setList((prev) => prev.map((item, i) => i === index ? { ...item, [field]: value } : item))
  }

  const addItem = (setList) => setList((prev) => [...prev, emptyItem()])
  const removeItem = (setList, index) => setList((prev) => prev.filter((_, i) => i !== index))

  const fillFromCatalog = (list, setList, index, catalog) => (e) => {
    const item = catalog.find((s) => s.id === e.target.value)
    if (item) updateItem(list, setList, index, 'descricao', item.descricao ?? item.tipoPeca ?? item.tipoServico ?? '')
    if (item?.valor) updateItem(list, setList, index, 'valor', String(item.valor))
  }

  const validate = () => {
    const e = {}
    if (!clienteId) e.clienteId = 'Selecione um cliente'
    if (!carroId) e.carroId = 'Selecione um veículo'
    if (servicosItens.length === 0 && pecasItens.length === 0) e.itens = 'Adicione pelo menos um item'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!validate()) return
    setLoading(true)
    try {
      const itens = {
        servicos: servicosItens.filter((i) => i.descricao || i.valor),
        pecas: pecasItens.filter((i) => i.descricao || i.valor),
      }
      const { totalServicos: ts, totalPecas: tp, totalGeral: tg } = calcTotals(itens)
      await svc.createOrcamento({ clienteId, carroId, itens, totalServicos: ts, totalPecas: tp, totalGeral: tg })
      await refresh()
      navigate('/')
    } finally {
      setLoading(false)
    }
  }

  const handleSaveCliente = async () => {
    if (!newCliente.nome) return
    setSavingModal(true)
    try {
      const id = await svc.createCliente(newCliente)
      await refresh()
      setClienteId(id)
      setShowNovoCliente(false)
      setNewCliente({ nome: '', celular: '' })
    } finally {
      setSavingModal(false)
    }
  }

  const handleSaveCarro = async () => {
    if (!newCarro.nome) return
    setSavingModal(true)
    try {
      const id = await svc.createCarro({ ...newCarro, clienteId: clienteId || null })
      await refresh()
      setCarroId(id)
      setShowNovoCarro(false)
      setNewCarro({ nome: '', marca: '', cor: '', ano: '', placa: '' })
    } finally {
      setSavingModal(false)
    }
  }

  return (
    <div className="flex flex-col gap-6 max-w-2xl">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={() => navigate('/')} className="p-2 rounded-lg hover:bg-brand-gray-border transition-colors">
          <ChevronLeft size={20} />
        </button>
        <div>
          <h1 className="text-xl font-bold text-brand-black">Novo Orçamento</h1>
          <p className="text-sm text-brand-gray-light">Preencha os dados do orçamento</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-5">
        {/* Cliente */}
        <div className="card p-4 flex flex-col gap-4">
          <h2 className="font-semibold text-brand-black text-sm uppercase tracking-wide">Cliente e Veículo</h2>
          <div className="flex gap-2 items-end">
            <div className="flex-1">
              <Select label="Cliente" value={clienteId} onChange={(e) => { setClienteId(e.target.value); setCarroId('') }} error={errors.clienteId}>
                <option value="">Selecione um cliente</option>
                {clientes.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
              </Select>
            </div>
            <button type="button" onClick={() => setShowNovoCliente(true)} className="btn-secondary px-3 py-2 mb-0.5" title="Novo cliente">
              <UserPlus size={16} />
            </button>
          </div>
          <div className="flex gap-2 items-end">
            <div className="flex-1">
              <Select label="Veículo" value={carroId} onChange={(e) => setCarroId(e.target.value)} error={errors.carroId}>
                <option value="">Selecione um veículo</option>
                {carrosFiltrados.map((c) => (
                  <option key={c.id} value={c.id}>{c.nome} {c.placa ? `(${c.placa})` : ''}</option>
                ))}
              </Select>
            </div>
            <button type="button" onClick={() => setShowNovoCarro(true)} className="btn-secondary px-3 py-2 mb-0.5" title="Novo veículo">
              <CarIcon size={16} />
            </button>
          </div>
        </div>

        {/* Serviços */}
        <div className="card p-4 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-brand-black text-sm uppercase tracking-wide">Serviços</h2>
            <button type="button" onClick={() => addItem(setServicosItens)} className="btn-secondary px-2.5 py-1.5 text-xs">
              <Plus size={13} /> Adicionar
            </button>
          </div>
          {servicosItens.map((item, i) => (
            <ItemRow
              key={i}
              item={item}
              index={i}
              catalog={servicos}
              catalogLabel="Selecionar serviço"
              onCatalog={fillFromCatalog(servicosItens, setServicosItens, i, servicos)}
              onChange={(field, val) => updateItem(servicosItens, setServicosItens, i, field, val)}
              onRemove={() => removeItem(setServicosItens, i)}
              canRemove={servicosItens.length > 1}
            />
          ))}
        </div>

        {/* Peças */}
        <div className="card p-4 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-brand-black text-sm uppercase tracking-wide">Peças / Produtos</h2>
            <button type="button" onClick={() => addItem(setPecasItens)} className="btn-secondary px-2.5 py-1.5 text-xs">
              <Plus size={13} /> Adicionar
            </button>
          </div>
          {pecasItens.length === 0 ? (
            <p className="text-sm text-brand-gray-light text-center py-3">Nenhuma peça adicionada</p>
          ) : (
            pecasItens.map((item, i) => (
              <ItemRow
                key={i}
                item={item}
                index={i}
                catalog={pecas}
                catalogLabel="Selecionar peça"
                onCatalog={fillFromCatalog(pecasItens, setPecasItens, i, pecas)}
                onChange={(field, val) => updateItem(pecasItens, setPecasItens, i, field, val)}
                onRemove={() => removeItem(setPecasItens, i)}
                canRemove
              />
            ))
          )}
        </div>

        {errors.itens && <p className="text-sm text-red-500">{errors.itens}</p>}

        {/* Totais */}
        <div className="card p-4 flex flex-col gap-2">
          <h2 className="font-semibold text-brand-black text-sm uppercase tracking-wide mb-1">Resumo</h2>
          <TotalRow label="Serviços" value={totalServicos} />
          <TotalRow label="Peças / Produtos" value={totalPecas} />
          <div className="border-t border-brand-gray-border pt-2 mt-1">
            <TotalRow label="Total Geral" value={totalGeral} bold />
          </div>
        </div>

        <div className="flex gap-3 pb-4">
          <Button variant="secondary" type="button" className="flex-1 justify-center" onClick={() => navigate('/')}>
            Cancelar
          </Button>
          <Button type="submit" className="flex-1 justify-center" loading={loading}>
            Salvar Orçamento
          </Button>
        </div>
      </form>

      {/* Modal Novo Cliente */}
      <Modal open={showNovoCliente} onClose={() => setShowNovoCliente(false)} title="Novo Cliente">
        <div className="flex flex-col gap-4">
          <Input label="Nome *" value={newCliente.nome} onChange={(e) => setNewCliente((p) => ({ ...p, nome: e.target.value }))} placeholder="Nome completo" />
          <Input label="Celular / WhatsApp" value={newCliente.celular} onChange={(e) => setNewCliente((p) => ({ ...p, celular: e.target.value }))} placeholder="(00) 00000-0000" />
          <div className="flex gap-3 mt-2">
            <Button variant="secondary" className="flex-1 justify-center" onClick={() => setShowNovoCliente(false)}>Cancelar</Button>
            <Button className="flex-1 justify-center" loading={savingModal} onClick={handleSaveCliente}>Salvar</Button>
          </div>
        </div>
      </Modal>

      {/* Modal Novo Carro */}
      <Modal open={showNovoCarro} onClose={() => setShowNovoCarro(false)} title="Novo Veículo">
        <div className="flex flex-col gap-4">
          <Input label="Modelo *" value={newCarro.nome} onChange={(e) => setNewCarro((p) => ({ ...p, nome: e.target.value }))} placeholder="Ex: Civic, Corolla..." />
          <div className="grid grid-cols-2 gap-3">
            <Input label="Marca" value={newCarro.marca} onChange={(e) => setNewCarro((p) => ({ ...p, marca: e.target.value }))} placeholder="Honda, Toyota..." />
            <Input label="Cor" value={newCarro.cor} onChange={(e) => setNewCarro((p) => ({ ...p, cor: e.target.value }))} placeholder="Branco, Preto..." />
            <Input label="Ano" value={newCarro.ano} onChange={(e) => setNewCarro((p) => ({ ...p, ano: e.target.value }))} placeholder="2020" />
            <Input label="Placa" value={newCarro.placa} onChange={(e) => setNewCarro((p) => ({ ...p, placa: e.target.value.toUpperCase() }))} placeholder="ABC-1234" />
          </div>
          <div className="flex gap-3 mt-2">
            <Button variant="secondary" className="flex-1 justify-center" onClick={() => setShowNovoCarro(false)}>Cancelar</Button>
            <Button className="flex-1 justify-center" loading={savingModal} onClick={handleSaveCarro}>Salvar</Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}

function ItemRow({ item, catalog, catalogLabel, onCatalog, onChange, onRemove, canRemove }) {
  return (
    <div className="border border-brand-gray-border rounded-lg p-3 flex flex-col gap-2 bg-brand-white-off">
      <div className="flex gap-2">
        <select onChange={onCatalog} className="input-field flex-1 text-xs" defaultValue="">
          <option value="">{catalogLabel}</option>
          {catalog.map((s) => <option key={s.id} value={s.id}>{s.descricao ?? s.tipoPeca ?? s.tipoServico}</option>)}
        </select>
        {canRemove && (
          <button type="button" onClick={onRemove} className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
            <Trash2 size={15} />
          </button>
        )}
      </div>
      <input
        value={item.descricao}
        onChange={(e) => onChange('descricao', e.target.value)}
        placeholder="Descrição do item"
        className="input-field"
      />
      <div className="flex gap-2">
        <input
          type="number"
          value={item.quantidade}
          onChange={(e) => onChange('quantidade', e.target.value)}
          placeholder="Qtd"
          min={1}
          className="input-field w-20"
        />
        <input
          type="number"
          value={item.valor}
          onChange={(e) => onChange('valor', e.target.value)}
          placeholder="Valor unitário"
          step="0.01"
          className="input-field flex-1"
        />
        <div className="input-field w-28 bg-brand-gray-border text-sm font-medium text-right pointer-events-none">
          {formatCurrency((Number(item.valor) || 0) * (Number(item.quantidade) || 1))}
        </div>
      </div>
    </div>
  )
}

function TotalRow({ label, value, bold }) {
  return (
    <div className={`flex items-center justify-between text-sm ${bold ? 'font-bold text-base' : ''}`}>
      <span className={bold ? 'text-brand-black' : 'text-brand-gray-light'}>{label}</span>
      <span className={bold ? 'text-brand-black text-lg' : 'text-brand-black'}>{formatCurrency(value)}</span>
    </div>
  )
}
