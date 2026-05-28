import React, { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Trash2, ChevronLeft, UserPlus, Car as CarIcon, Info, Wrench, Palette } from 'lucide-react'
import { useApp } from '../contexts/AppContext'
import { useAuth } from '../contexts/AuthContext'
import { useToast } from '../contexts/ToastContext'
import { useLogger } from '../hooks/useLogger'
import * as svc from '../firebase/services'
import { formatCurrency, calcTotals } from '../utils/helpers'
import Button from '../components/ui/Button'
import Input from '../components/ui/Input'
import Modal from '../components/ui/Modal'
import SearchSelect from '../components/ui/SearchSelect'

const emptyPeca    = () => ({ marca: '', descricao: '', valor: '', quantidade: 1, fornecedorId: '', dataCompra: '' })
const emptyServico = () => ({ descricao: '', valor: '', quantidade: 1 })

const emptyMecanica = () => ({
  ultimaTrocaData: '',
  ultimaTrocaKm:   '',
  proximaTrocaData: '',
  proximaTrocaKm:  '',
})

// ── Tipos de orçamento ────────────────────────────────────────────────────────
const TIPOS = [
  {
    id:    'mecanica',
    label: 'Mecânica',
    sub:   'Troca de óleo, freios, suspensão, motor...',
    icon:  Wrench,
  },
  {
    id:    'funilaria',
    label: 'Funilaria & Estética',
    sub:   'Pintura, funilaria, lavagem, polimento...',
    icon:  Palette,
  },
]

export default function NovoOrcamento() {
  const navigate = useNavigate()
  const { clientes, carros, servicos, pecas, fornecedores, addOrcamento, addCliente, addCarro } = useApp()
  const { user } = useAuth()
  const toast  = useToast()
  const logger = useLogger()

  // Step 1: seleção do tipo
  const [tipoServico, setTipoServico] = useState(null) // null | 'mecanica' | 'funilaria'

  // Step 2: form
  const [clienteId,     setClienteId]     = useState('')
  const [carroId,       setCarroId]       = useState('')
  const [servicosItens, setServicosItens] = useState([emptyServico()])
  const [pecasItens,    setPecasItens]    = useState([emptyPeca()])
  const [markup,        setMarkup]        = useState(20)
  const [rastreamento,  setRastreamento]  = useState('')
  const [mecanica,      setMecanica]      = useState(emptyMecanica())
  const [loading,       setLoading]       = useState(false)
  const [errors,        setErrors]        = useState({})

  // Quick-create modals
  const [showNovoCliente, setShowNovoCliente] = useState(false)
  const [showNovoCarro,   setShowNovoCarro]   = useState(false)
  const [newCliente,  setNewCliente]  = useState({ nome: '', celular: '' })
  const [newCarro,    setNewCarro]    = useState({ nome: '', marca: '', cor: '', ano: '', placa: '' })
  const [savingModal, setSavingModal] = useState(false)

  const carrosFiltrados = useMemo(() =>
    clienteId ? carros.filter((c) => c.clienteId === clienteId) : carros,
    [carros, clienteId]
  )

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

  // Troca de óleo: auto-calcula próxima data (+6 meses) e km (+7000)
  const handleMecanicaChange = (field, value) => {
    setMecanica((prev) => {
      const updated = { ...prev, [field]: value }
      if (field === 'ultimaTrocaData' && value) {
        const d = new Date(value + 'T12:00:00')
        d.setMonth(d.getMonth() + 6)
        updated.proximaTrocaData = d.toISOString().split('T')[0]
      }
      if (field === 'ultimaTrocaKm' && value) {
        updated.proximaTrocaKm = String((Number(value) || 0) + 7000)
      }
      return updated
    })
  }

  const validate = () => {
    const e = {}
    if (!clienteId) e.clienteId = 'Selecione um cliente'
    if (!carroId)   e.carroId   = 'Selecione um veículo'
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
        tipoServico,
        ...(tipoServico === 'mecanica' ? { mecanica } : {}),
        clienteNome:         cliente?.nome  ?? '',
        veiculoModelo:       carro?.nome    ?? '',
        veiculoPlaca:        carro?.placa   ?? '',
        veiculoAno:          carro?.ano     ?? '',
        createdBy:           user?.uid      ?? '',
        totalMaoDeObra:      t.totalMaoDeObra,
        totalPecasSemMarkup: t.totalPecasSemMarkup,
        totalMarkup:         t.totalMarkup,
        totalPecas:          t.totalPecas,
        rastreamento:        t.rastreamento,
        totalGeral:          t.totalGeral,
      }
      const newId = await svc.createOrcamento(payload)
      addOrcamento({ id: newId, ...payload, status: 'rascunho' })
      logger.activity('orcamento_criado', `Orçamento criado para ${payload.clienteNome} — ${payload.veiculoModelo}`)
      toast.success('Orçamento criado com sucesso!')
      navigate('/')
    } catch (err) {
      console.error('[NovoOrcamento] Erro:', err)
      logger.error('erro_ao_salvar', 'Erro ao criar orçamento', { err: err?.message })
      toast.error(`Erro ao salvar: ${err?.message ?? 'verifique o console (F12)'}`)
    } finally { setLoading(false) }
  }

  const handleSaveCliente = async () => {
    if (!newCliente.nome) { toast.error('Informe o nome do cliente.'); return }
    if (newCliente.celular) {
      const cel = newCliente.celular.replace(/\D/g, '')
      const dup = clientes.find((c) => c.celular?.replace(/\D/g, '') === cel && cel.length >= 8)
      if (dup) { toast.error(`Esse número já está cadastrado para "${dup.nome}".`); return }
    }
    setSavingModal(true)
    try {
      const id = await svc.createCliente(newCliente)
      addCliente({ id, ...newCliente })
      logger.activity('cliente_criado', `Cliente "${newCliente.nome}" cadastrado via orçamento`)
      setClienteId(id)
      setShowNovoCliente(false)
      setNewCliente({ nome: '', celular: '' })
      toast.success(`Cliente "${newCliente.nome}" cadastrado!`)
    } catch { toast.error('Erro ao cadastrar cliente.')
    } finally { setSavingModal(false) }
  }

  const handleSaveCarro = async () => {
    if (!newCarro.nome)  { toast.error('Informe o modelo do veículo.'); return }
    if (!newCarro.placa) { toast.error('A placa é obrigatória.'); return }
    const placaNorm = newCarro.placa.replace(/[-\s]/g, '').toUpperCase()
    const dup = carros.find((c) => c.placa?.replace(/[-\s]/g, '').toUpperCase() === placaNorm)
    if (dup) {
      const dono = clientes.find((c) => c.id === dup.clienteId)
      toast.error(`Placa ${newCarro.placa} já cadastrada${dono ? ` para ${dono.nome}` : ''}.`)
      return
    }
    setSavingModal(true)
    try {
      const carroData = { ...newCarro, clienteId: clienteId || null }
      const id = await svc.createCarro(carroData)
      addCarro({ id, ...carroData })
      logger.activity('carro_criado', `Veículo "${newCarro.nome}" (${newCarro.placa}) cadastrado via orçamento`)
      setCarroId(id)
      setShowNovoCarro(false)
      setNewCarro({ nome: '', marca: '', cor: '', ano: '', placa: '' })
      toast.success(`Veículo "${newCarro.nome}" cadastrado!`)
    } catch { toast.error('Erro ao cadastrar veículo.')
    } finally { setSavingModal(false) }
  }

  // ── Tela 1: seleção do tipo ──────────────────────────────────────────────────
  if (!tipoServico) {
    return (
      <div className="flex flex-col gap-6 max-w-xl">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/')} className="p-2 rounded-lg hover:bg-brand-gray-border transition-colors">
            <ChevronLeft size={20} />
          </button>
          <div>
            <h1 className="text-xl font-bold text-brand-black">Novo Orçamento</h1>
            <p className="text-sm text-brand-gray-light">Selecione o tipo de serviço</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {TIPOS.map(({ id, label, sub, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setTipoServico(id)}
              className="card p-7 flex flex-col items-center gap-3 text-center hover:border-brand-yellow border-2 border-transparent transition-all active:scale-95"
            >
              <div className="w-14 h-14 rounded-2xl bg-brand-yellow-light flex items-center justify-center">
                <Icon size={28} className="text-brand-yellow-dark" />
              </div>
              <p className="font-bold text-brand-black text-base">{label}</p>
              <p className="text-xs text-brand-gray-light leading-relaxed">{sub}</p>
            </button>
          ))}
        </div>
      </div>
    )
  }

  // ── Tela 2: formulário ───────────────────────────────────────────────────────
  const tipoLabel = TIPOS.find((t) => t.id === tipoServico)?.label ?? tipoServico

  return (
    <div className="flex flex-col gap-5 max-w-2xl">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={() => setTipoServico(null)} className="p-2 rounded-lg hover:bg-brand-gray-border transition-colors">
          <ChevronLeft size={20} />
        </button>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-brand-black">Novo Orçamento</h1>
            <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-brand-yellow-light text-brand-yellow-dark">
              {tipoLabel}
            </span>
          </div>
          <p className="text-sm text-brand-gray-light">Preencha os dados do orçamento</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-5">

        {/* Cliente e Veículo */}
        <div className="card p-4 flex flex-col gap-4">
          <h2 className="font-semibold text-sm uppercase tracking-wide text-brand-black">Cliente e Veículo</h2>
          <div className="flex gap-2 items-end">
            <div className="flex-1">
              <SearchSelect
                label="Cliente"
                items={clientes}
                value={clienteId}
                onChange={(id) => { setClienteId(id); setCarroId('') }}
                getKey={(c) => c.id}
                getLabel={(c) => c.nome}
                getSub={(c) => c.celular}
                placeholder="Buscar cliente..."
                error={errors.clienteId}
              />
            </div>
            <button type="button" onClick={() => setShowNovoCliente(true)} className="btn-secondary px-3 py-2 mb-0.5" title="Novo cliente">
              <UserPlus size={16} />
            </button>
          </div>
          <div className="flex gap-2 items-end">
            <div className="flex-1">
              <SearchSelect
                label="Veículo"
                items={carrosFiltrados}
                value={carroId}
                onChange={setCarroId}
                getKey={(c) => c.id}
                getLabel={(c) => c.nome}
                getSub={(c) => [c.marca, c.placa].filter(Boolean).join(' · ')}
                placeholder="Buscar veículo..."
                error={errors.carroId}
              />
            </div>
            <button type="button" onClick={() => setShowNovoCarro(true)} className="btn-secondary px-3 py-2 mb-0.5" title="Novo veículo">
              <CarIcon size={16} />
            </button>
          </div>
        </div>

        {/* Mecânica: troca de óleo */}
        {tipoServico === 'mecanica' && (
          <div className="card p-4 flex flex-col gap-4">
            <div className="flex items-center gap-2">
              <Wrench size={15} className="text-brand-yellow-dark" />
              <h2 className="font-semibold text-sm uppercase tracking-wide text-brand-black">Troca de Óleo</h2>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Input
                label="Última troca — data"
                type="date"
                value={mecanica.ultimaTrocaData}
                onChange={(e) => handleMecanicaChange('ultimaTrocaData', e.target.value)}
              />
              <Input
                label="Última troca — km"
                type="number"
                value={mecanica.ultimaTrocaKm}
                onChange={(e) => handleMecanicaChange('ultimaTrocaKm', e.target.value)}
                placeholder="Ex: 45000"
              />
              <Input
                label="Próxima troca — data"
                type="date"
                value={mecanica.proximaTrocaData}
                onChange={(e) => handleMecanicaChange('proximaTrocaData', e.target.value)}
              />
              <Input
                label="Próxima troca — km"
                type="number"
                value={mecanica.proximaTrocaKm}
                onChange={(e) => handleMecanicaChange('proximaTrocaKm', e.target.value)}
                placeholder="Ex: 52000"
              />
            </div>
            <p className="text-xs text-brand-gray-light">
              Próxima troca calculada automaticamente (+6 meses / +7.000 km). Pode editar.
            </p>
          </div>
        )}

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
            <span className="text-xs text-brand-yellow-dark flex-1">Acréscimo aplicado ao custo das peças</span>
            <div className="flex items-center gap-1">
              <input
                type="number"
                value={markup}
                onChange={(e) => setMarkup(e.target.value)}
                className="w-14 text-center border border-brand-yellow-dark rounded px-1 py-0.5 text-xs font-bold bg-white text-brand-black"
                min={0} max={100}
              />
              <span className="text-xs font-bold text-brand-yellow-dark">%</span>
            </div>
          </div>
          {pecasItens.map((item, i) => (
            <PecaRow
              key={i} item={item} catalog={pecas} markup={markup} fornecedores={fornecedores}
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
              <span>Acréscimo {markup}%</span>
              <span>+ {formatCurrency(totals.totalMarkup)}</span>
            </div>
            <div className="flex justify-between text-sm font-semibold text-brand-black">
              <span>Total peças</span>
              <span>{formatCurrency(totals.totalPecas)}</span>
            </div>
          </div>
        </div>

        {/* Serviços */}
        <div className="card p-4 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-sm uppercase tracking-wide text-brand-black">Serviços</h2>
            <button type="button" onClick={() => addItem(setServicosItens, emptyServico)} className="btn-secondary px-2.5 py-1.5 text-xs">
              <Plus size={13} /> Adicionar
            </button>
          </div>
          {servicosItens.map((item, i) => (
            <ServicoRow
              key={i} item={item} catalog={servicos}
              onChange={(field, val) => updateItem(servicosItens, setServicosItens, i, field, val)}
              onRemove={() => removeItem(setServicosItens, i)}
              canRemove={servicosItens.length > 1}
            />
          ))}
          <div className="flex justify-between text-sm font-semibold text-brand-black border-t border-brand-gray-border pt-2">
            <span>Total serviços</span>
            <span>{formatCurrency(totals.totalMaoDeObra)}</span>
          </div>
        </div>

        {/* Rastreamento — apenas Mecânica */}
        {tipoServico === 'mecanica' && (
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
        )}

        {/* Resumo */}
        <div className="card p-4 flex flex-col gap-2">
          <h2 className="font-semibold text-sm uppercase tracking-wide text-brand-black mb-1">Resumo</h2>
          <TotalRow label="Peças (com acréscimo)" value={totals.totalPecas} />
          <TotalRow label="Serviços"              value={totals.totalMaoDeObra} />
          {totals.rastreamento > 0 && <TotalRow label="Rastreamento" value={totals.rastreamento} />}
          <div className="border-t border-brand-gray-border pt-2 mt-1">
            <TotalRow label="Total Geral" value={totals.totalGeral} bold />
          </div>
        </div>

        <div className="flex gap-3 pb-4">
          <Button variant="secondary" type="button" className="flex-1 justify-center" onClick={() => setTipoServico(null)}>
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
            <Input label="Cor"   value={newCarro.cor}   onChange={(e) => setNewCarro((p) => ({ ...p, cor: e.target.value }))}   placeholder="Branco, Preto..." />
            <Input label="Ano"   value={newCarro.ano}   onChange={(e) => setNewCarro((p) => ({ ...p, ano: e.target.value }))}   placeholder="2020" />
            <Input label="Placa *" value={newCarro.placa} onChange={(e) => setNewCarro((p) => ({ ...p, placa: e.target.value.toUpperCase() }))} placeholder="ABC-1234" />
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

// ── Sub-componentes ──────────────────────────────────────────────────────────

function PecaRow({ item, catalog, markup, fornecedores, onChange, onRemove, canRemove }) {
  const custo = (Number(item.valor) || 0) * (Number(item.quantidade) || 1)
  const total = custo * (1 + (Number(markup) || 0) / 100)
  return (
    <div className="border border-brand-gray-border rounded-lg p-3 flex flex-col gap-2 bg-brand-white-off">
      <div className="flex gap-2">
        <select onChange={(e) => { const f = catalog.find((s) => s.id === e.target.value); if (f) { onChange('descricao', f.tipoPeca ?? ''); if (f.valor) onChange('valor', String(f.valor)) } }} className="input-field flex-1 text-xs" defaultValue="">
          <option value="">Selecionar do catálogo</option>
          {catalog.map((s) => <option key={s.id} value={s.id}>{s.tipoPeca}</option>)}
        </select>
        {canRemove && <button type="button" onClick={onRemove} className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"><Trash2 size={15} /></button>}
      </div>
      <div className="grid grid-cols-2 gap-2">
        <input value={item.marca}     onChange={(e) => onChange('marca', e.target.value)}     placeholder="Marca (ex: NGK, Bosch...)" className="input-field col-span-2" />
        <input value={item.descricao} onChange={(e) => onChange('descricao', e.target.value)} placeholder="Descrição da peça"         className="input-field col-span-2" />
        <input type="number" value={item.quantidade} onChange={(e) => onChange('quantidade', e.target.value)} placeholder="Qtd"       min={1}    className="input-field" />
        <input type="number" value={item.valor}      onChange={(e) => onChange('valor', e.target.value)}      placeholder="Custo unit." step="0.01" className="input-field" />
      </div>
      <div className="flex items-center justify-between text-xs bg-brand-yellow-light rounded px-2 py-1.5">
        <span className="text-brand-yellow-dark">Custo: {formatCurrency(custo)} + {markup}% = </span>
        <span className="font-bold text-brand-black">{formatCurrency(total)}</span>
      </div>
      {/* Campos administrativos (não saem no PDF do cliente) */}
      <div className="border-t border-dashed border-brand-gray-border pt-2 flex flex-col gap-2">
        <p className="text-[10px] font-semibold text-brand-gray-light uppercase tracking-wide">Administrativo — não aparece no orçamento do cliente</p>
        <div className="grid grid-cols-2 gap-2">
          <div className="col-span-2">
            <SearchSelect
              items={fornecedores}
              value={item.fornecedorId || ''}
              onChange={(val) => onChange('fornecedorId', val)}
              getKey={(f) => f.id}
              getLabel={(f) => f.nome}
              getSub={(f) => f.cidade}
              placeholder="Fornecedor / loja..."
            />
          </div>
          <div className="col-span-2 flex flex-col gap-1">
            <label className="text-sm font-medium text-brand-black">Data da compra</label>
            <input
              type="date"
              value={item.dataCompra || ''}
              onChange={(e) => onChange('dataCompra', e.target.value)}
              className="input-field"
            />
          </div>
        </div>
      </div>
    </div>
  )
}

function ServicoRow({ item, catalog, onChange, onRemove, canRemove }) {
  const total = (Number(item.valor) || 0) * (Number(item.quantidade) || 1)
  return (
    <div className="border border-brand-gray-border rounded-lg p-3 flex flex-col gap-2 bg-brand-white-off">
      <div className="flex gap-2">
        <select onChange={(e) => { const f = catalog.find((s) => s.id === e.target.value); if (f) { onChange('descricao', f.tipoServico ?? f.descricao ?? ''); if (f.valor) onChange('valor', String(f.valor)) } }} className="input-field flex-1 text-xs" defaultValue="">
          <option value="">Selecionar do catálogo</option>
          {catalog.map((s) => <option key={s.id} value={s.id}>{s.tipoServico}</option>)}
        </select>
        {canRemove && <button type="button" onClick={onRemove} className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"><Trash2 size={15} /></button>}
      </div>
      <input value={item.descricao} onChange={(e) => onChange('descricao', e.target.value)} placeholder="Descrição do serviço" className="input-field" />
      <div className="flex gap-2">
        <input type="number" value={item.quantidade} onChange={(e) => onChange('quantidade', e.target.value)} placeholder="Qtd"            min={1} className="input-field w-20" />
        <input type="number" value={item.valor}      onChange={(e) => onChange('valor', e.target.value)}      placeholder="Valor unitário" step="0.01" className="input-field flex-1" />
        <div className="input-field w-28 bg-brand-gray-border text-sm font-medium text-right pointer-events-none">{formatCurrency(total)}</div>
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
