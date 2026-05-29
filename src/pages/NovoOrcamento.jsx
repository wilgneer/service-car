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
const emptyMecanica = () => ({ ultimaTrocaData: '', ultimaTrocaKm: '', proximaTrocaData: '', proximaTrocaKm: '' })

const TIPOS = [
  { id: 'mecanica',  label: 'Mecânica',             sub: 'Troca de óleo, freios, suspensão, motor...', icon: Wrench  },
  { id: 'funilaria', label: 'Lanternagem e Pintura', sub: 'Pintura, lanternagem, lavagem, polimento...', icon: Palette },
]

// ── Cabeçalho de seção padronizado ────────────────────────────────────────────
function SectionHeader({ icon: Icon, label, color = 'yellow', action }) {
  const accent = { yellow: 'bg-brand-yellow-light text-brand-yellow-dark', blue: 'bg-blue-50 text-blue-600', purple: 'bg-purple-50 text-purple-600' }
  return (
    <div className="flex items-center justify-between mb-1">
      <div className="flex items-center gap-2.5">
        {Icon && (
          <div className={`p-1.5 rounded-lg ${accent[color]}`}>
            <Icon size={14} />
          </div>
        )}
        <h2 className="font-bold text-sm text-brand-black tracking-wide">{label}</h2>
      </div>
      {action}
    </div>
  )
}

export default function NovoOrcamento() {
  const navigate = useNavigate()
  const { clientes, carros, servicos, pecas, fornecedores, addOrcamento, addCliente, addCarro } = useApp()
  const { user } = useAuth()
  const toast  = useToast()
  const logger = useLogger()

  const [tipoServico, setTipoServico] = useState(null)
  const [clienteId,     setClienteId]     = useState('')
  const [carroId,       setCarroId]       = useState('')
  const [servicosItens, setServicosItens] = useState([emptyServico()])
  const [pecasItens,    setPecasItens]    = useState([emptyPeca()])
  const [markup,        setMarkup]        = useState(20)
  const [terceiros,     setTerceiros]     = useState({
    rastreamento:  { custo: '', margem: 0 },
    balanceamento: { custo: '', margem: 0 },
    retifica:      { custo: '', margem: 0 },
  })
  const [mecanica,    setMecanica]    = useState(emptyMecanica())
  const [loading,     setLoading]     = useState(false)
  const [errors,      setErrors]      = useState({})

  const [showNovoCliente, setShowNovoCliente] = useState(false)
  const [showNovoCarro,   setShowNovoCarro]   = useState(false)
  const [newCliente,  setNewCliente]  = useState({ nome: '', celular: '' })
  const [newCarro,    setNewCarro]    = useState({ nome: '', marca: '', cor: '', ano: '', placa: '' })
  const [savingModal, setSavingModal] = useState(false)

  const carrosFiltrados = useMemo(() =>
    clienteId ? carros.filter((c) => c.clienteId === clienteId) : carros,
    [carros, clienteId]
  )

  const setTerceiro = (key, field, value) =>
    setTerceiros((prev) => ({ ...prev, [key]: { ...prev[key], [field]: value } }))

  const totals = useMemo(() =>
    calcTotals(
      { servicos: servicosItens, pecas: pecasItens },
      { markup, terceiros: {
        rastreamento:  { custo: Number(terceiros.rastreamento.custo)  || 0, margem: Number(terceiros.rastreamento.margem)  || 0 },
        balanceamento: { custo: Number(terceiros.balanceamento.custo) || 0, margem: Number(terceiros.balanceamento.margem) || 0 },
        retifica:      { custo: Number(terceiros.retifica.custo)      || 0, margem: Number(terceiros.retifica.margem)      || 0 },
      }}
    ),
    [servicosItens, pecasItens, markup, terceiros]
  )

  const updateItem = (list, setList, index, field, value) =>
    setList((prev) => prev.map((item, i) => i === index ? { ...item, [field]: value } : item))
  const addItem    = (setList, empty) => setList((prev) => [...prev, empty()])
  const removeItem = (setList, index) => setList((prev) => prev.filter((_, i) => i !== index))

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
      const extras = {
        markup: Number(markup) || 20,
        terceiros: {
          rastreamento:  { custo: Number(terceiros.rastreamento.custo)  || 0, margem: Number(terceiros.rastreamento.margem)  || 0 },
          balanceamento: { custo: Number(terceiros.balanceamento.custo) || 0, margem: Number(terceiros.balanceamento.margem) || 0 },
          retifica:      { custo: Number(terceiros.retifica.custo)      || 0, margem: Number(terceiros.retifica.margem)      || 0 },
        },
      }
      const t       = calcTotals(itens, extras)
      const cliente = clientes.find((c) => c.id === clienteId)
      const carro   = carros.find((c) => c.id === carroId)

      const payload = {
        clienteId, carroId, itens, extras, tipoServico,
        ...(tipoServico === 'mecanica' ? { mecanica } : {}),
        clienteNome:         cliente?.nome ?? '',
        veiculoModelo:       carro?.nome   ?? '',
        veiculoPlaca:        carro?.placa  ?? '',
        veiculoAno:          carro?.ano    ?? '',
        createdBy:           user?.uid     ?? '',
        totalMaoDeObra:      t.totalMaoDeObra,
        totalPecasSemMarkup: t.totalPecasSemMarkup,
        totalMarkup:         t.totalMarkup,
        totalPecas:          t.totalPecas,
        totalTerceiros:      t.totalTerceiros,
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
      <div className="flex flex-col gap-8 max-w-xl">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/')} className="p-2.5 rounded-xl hover:bg-brand-gray-border transition-colors">
            <ChevronLeft size={20} />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-brand-black">Novo Orçamento</h1>
            <p className="text-sm text-brand-gray-light mt-0.5">Selecione o tipo de serviço para começar</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          {TIPOS.map(({ id, label, sub, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setTipoServico(id)}
              className="card p-8 flex flex-col items-center gap-4 text-center hover:border-brand-yellow hover:shadow-md border-2 border-transparent transition-all active:scale-95 group"
            >
              <div className="w-16 h-16 rounded-2xl bg-brand-yellow-light flex items-center justify-center group-hover:bg-brand-yellow transition-colors">
                <Icon size={30} className="text-brand-yellow-dark group-hover:text-brand-black transition-colors" />
              </div>
              <div>
                <p className="font-bold text-brand-black text-lg leading-snug">{label}</p>
                <p className="text-xs text-brand-gray-light leading-relaxed mt-1.5">{sub}</p>
              </div>
            </button>
          ))}
        </div>
      </div>
    )
  }

  // ── Tela 2: formulário ───────────────────────────────────────────────────────
  const tipoLabel = TIPOS.find((t) => t.id === tipoServico)?.label ?? tipoServico

  return (
    <div className="flex flex-col gap-6 max-w-2xl">

      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={() => setTipoServico(null)} className="p-2.5 rounded-xl hover:bg-brand-gray-border transition-colors">
          <ChevronLeft size={20} />
        </button>
        <div className="flex-1">
          <div className="flex items-center gap-2.5 flex-wrap">
            <h1 className="text-2xl font-bold text-brand-black">Novo Orçamento</h1>
            <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-brand-yellow text-brand-black">
              {tipoLabel}
            </span>
          </div>
          <p className="text-sm text-brand-gray-light mt-0.5">Preencha os dados abaixo</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-5">

        {/* ── Cliente e Veículo ── */}
        <div className="card p-5 flex flex-col gap-5">
          <SectionHeader icon={CarIcon} label="Cliente e Veículo" color="yellow" />
          <div className="flex gap-2.5 items-end">
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
            <button
              type="button" onClick={() => setShowNovoCliente(true)}
              className="btn-secondary px-3 py-2.5 shrink-0" title="Novo cliente"
            >
              <UserPlus size={16} />
            </button>
          </div>
          <div className="flex gap-2.5 items-end">
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
            <button
              type="button" onClick={() => setShowNovoCarro(true)}
              className="btn-secondary px-3 py-2.5 shrink-0" title="Novo veículo"
            >
              <CarIcon size={16} />
            </button>
          </div>
        </div>

        {/* ── Troca de Óleo (mecânica) ── */}
        {tipoServico === 'mecanica' && (
          <div className="card p-5 flex flex-col gap-5">
            <SectionHeader icon={Wrench} label="Troca de Óleo" color="yellow" />
            <div className="grid grid-cols-2 gap-4">
              <Input label="Última troca — data" type="date" value={mecanica.ultimaTrocaData}
                onChange={(e) => handleMecanicaChange('ultimaTrocaData', e.target.value)} />
              <Input label="Última troca — km" type="number" value={mecanica.ultimaTrocaKm}
                onChange={(e) => handleMecanicaChange('ultimaTrocaKm', e.target.value)} placeholder="Ex: 45000" />
              <Input label="Próxima troca — data" type="date" value={mecanica.proximaTrocaData}
                onChange={(e) => handleMecanicaChange('proximaTrocaData', e.target.value)} />
              <Input label="Próxima troca — km" type="number" value={mecanica.proximaTrocaKm}
                onChange={(e) => handleMecanicaChange('proximaTrocaKm', e.target.value)} placeholder="Ex: 52000" />
            </div>
            <p className="text-xs text-brand-gray-light bg-brand-white-off rounded-lg px-3 py-2">
              Próxima troca calculada automaticamente (+6 meses / +7.000 km). Pode editar livremente.
            </p>
          </div>
        )}

        {/* ── Peças / Produtos ── */}
        <div className="card p-5 flex flex-col gap-5">
          <SectionHeader
            icon={null}
            label="Peças / Produtos"
            action={
              <button type="button" onClick={() => addItem(setPecasItens, emptyPeca)}
                className="btn-secondary px-3 py-1.5 text-xs">
                <Plus size={13} /> Adicionar peça
              </button>
            }
          />

          {/* Acréscimo */}
          <div className="flex items-center gap-3 bg-brand-yellow-light rounded-xl px-4 py-3">
            <Info size={15} className="text-brand-yellow-dark shrink-0" />
            <span className="text-sm text-brand-yellow-dark flex-1 font-medium">Acréscimo sobre o custo das peças</span>
            <div className="flex items-center gap-1.5">
              <input
                type="number" value={markup}
                onChange={(e) => setMarkup(e.target.value)}
                className="w-16 text-center border-2 border-brand-yellow-dark rounded-lg px-2 py-1.5 text-sm font-bold bg-white text-brand-black focus:outline-none focus:ring-2 focus:ring-brand-yellow"
                min={0} max={100}
              />
              <span className="text-sm font-bold text-brand-yellow-dark">%</span>
            </div>
          </div>

          <div className="flex flex-col gap-3">
            {pecasItens.map((item, i) => (
              <PecaRow
                key={i} item={item} catalog={pecas} markup={markup} fornecedores={fornecedores}
                onChange={(field, val) => updateItem(pecasItens, setPecasItens, i, field, val)}
                onRemove={() => removeItem(setPecasItens, i)}
                canRemove={pecasItens.length > 1}
              />
            ))}
          </div>

          <div className="bg-brand-white-off rounded-xl px-4 py-3 flex flex-col gap-1.5">
            <div className="flex justify-between text-xs text-brand-gray-light">
              <span>Custo das peças</span>
              <span>{formatCurrency(totals.totalPecasSemMarkup)}</span>
            </div>
            <div className="flex justify-between text-xs text-brand-gray-light">
              <span>Acréscimo {markup}%</span>
              <span className="text-brand-black">+ {formatCurrency(totals.totalMarkup)}</span>
            </div>
            <div className="flex justify-between text-sm font-bold text-brand-black border-t border-brand-gray-border pt-1.5 mt-0.5">
              <span>Total peças</span>
              <span>{formatCurrency(totals.totalPecas)}</span>
            </div>
          </div>
        </div>

        {/* ── Serviços ── */}
        <div className="card p-5 flex flex-col gap-5">
          <SectionHeader
            icon={null}
            label="Serviços"
            action={
              <button type="button" onClick={() => addItem(setServicosItens, emptyServico)}
                className="btn-secondary px-3 py-1.5 text-xs">
                <Plus size={13} /> Adicionar serviço
              </button>
            }
          />
          <div className="flex flex-col gap-3">
            {servicosItens.map((item, i) => (
              <ServicoRow
                key={i} item={item} catalog={servicos}
                onChange={(field, val) => updateItem(servicosItens, setServicosItens, i, field, val)}
                onRemove={() => removeItem(setServicosItens, i)}
                canRemove={servicosItens.length > 1}
              />
            ))}
          </div>
          <div className="flex justify-between text-sm font-bold text-brand-black bg-brand-white-off rounded-xl px-4 py-3">
            <span>Total serviços</span>
            <span>{formatCurrency(totals.totalMaoDeObra)}</span>
          </div>
        </div>

        {/* ── Serviços Terceiros (mecânica) ── */}
        {tipoServico === 'mecanica' && (
          <div className="card p-5 flex flex-col gap-5">
            <div>
              <SectionHeader icon={Wrench} label="Serviços Terceiros" color="purple" />
              <p className="text-xs text-brand-gray-light mt-2">
                Informe o custo cobrado pelo terceiro e a margem de lucro desejada (começa em 0%)
              </p>
            </div>
            <div className="flex flex-col gap-3">
              {[
                { key: 'rastreamento',  label: 'Rastreamento' },
                { key: 'balanceamento', label: 'Balanceamento' },
                { key: 'retifica',      label: 'Retífica' },
              ].map(({ key, label }) => {
                const val   = terceiros[key]
                const custo = Number(val.custo) || 0
                const lucro = custo * ((Number(val.margem) || 0) / 100)
                const ativo = custo > 0
                return (
                  <div key={key} className={`rounded-2xl border-2 p-4 flex flex-col gap-3 transition-colors ${ativo ? 'border-brand-yellow bg-brand-yellow-light/30' : 'border-brand-gray-border bg-brand-white-off'}`}>
                    <p className="text-sm font-bold text-brand-black">{label}</p>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-semibold text-brand-gray-light uppercase tracking-wide">Custo (R$)</label>
                        <input
                          type="number" step="0.01" min="0"
                          value={val.custo}
                          onChange={(e) => setTerceiro(key, 'custo', e.target.value)}
                          placeholder="0,00"
                          className="input-field text-right"
                        />
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-semibold text-brand-gray-light uppercase tracking-wide">Margem %</label>
                        <input
                          type="number" step="1" min="0" max="100"
                          value={val.margem}
                          onChange={(e) => setTerceiro(key, 'margem', e.target.value)}
                          className="input-field text-right"
                        />
                      </div>
                    </div>
                    {ativo && (
                      <div className="flex items-center justify-between bg-white rounded-xl px-3 py-2 border border-brand-yellow">
                        <span className="text-xs text-brand-gray-light">
                          Custo <span className="font-semibold text-brand-black">{formatCurrency(custo)}</span>
                          {' + '}{val.margem}% lucro
                          {lucro > 0 && <span className="text-green-600 font-semibold"> +{formatCurrency(lucro)}</span>}
                        </span>
                        <span className="text-sm font-bold text-brand-black">{formatCurrency(custo + lucro)}</span>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* ── Resumo ── */}
        <div className="card p-5 flex flex-col gap-3">
          <h2 className="font-bold text-sm text-brand-black tracking-wide">Resumo do Orçamento</h2>
          <div className="flex flex-col gap-2">
            <ResumoRow label="Peças (com acréscimo)" value={totals.totalPecas} />
            <ResumoRow label="Serviços"              value={totals.totalMaoDeObra} />
            {totals.t_rastreamento.total  > 0 && <ResumoRow label="Rastreamento"  value={totals.t_rastreamento.total}  />}
            {totals.t_balanceamento.total > 0 && <ResumoRow label="Balanceamento" value={totals.t_balanceamento.total} />}
            {totals.t_retifica.total      > 0 && <ResumoRow label="Retífica"      value={totals.t_retifica.total}      />}
          </div>
          <div className="bg-brand-black rounded-2xl px-5 py-4 flex items-center justify-between mt-1">
            <p className="text-white font-semibold text-sm">Total Geral</p>
            <p className="text-brand-yellow text-2xl font-bold">{formatCurrency(totals.totalGeral)}</p>
          </div>
        </div>

        <div className="flex gap-3 pb-6">
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
            <Input label="Marca"   value={newCarro.marca}  onChange={(e) => setNewCarro((p) => ({ ...p, marca: e.target.value }))}                             placeholder="Honda, Toyota..." />
            <Input label="Cor"     value={newCarro.cor}    onChange={(e) => setNewCarro((p) => ({ ...p, cor: e.target.value }))}                               placeholder="Branco, Preto..." />
            <Input label="Ano"     value={newCarro.ano}    onChange={(e) => setNewCarro((p) => ({ ...p, ano: e.target.value }))}                               placeholder="2020" />
            <Input label="Placa *" value={newCarro.placa}  onChange={(e) => setNewCarro((p) => ({ ...p, placa: e.target.value.toUpperCase() }))}               placeholder="ABC-1234" />
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
    <div className="border border-brand-gray-border rounded-2xl p-4 flex flex-col gap-3 bg-brand-white-off">
      <div className="flex gap-2">
        <select
          onChange={(e) => {
            const f = catalog.find((s) => s.id === e.target.value)
            if (f) { onChange('descricao', f.tipoPeca ?? ''); if (f.valor) onChange('valor', String(f.valor)) }
          }}
          className="input-field flex-1 text-sm"
          defaultValue=""
        >
          <option value="">Selecionar do catálogo</option>
          {catalog.map((s) => <option key={s.id} value={s.id}>{s.tipoPeca}</option>)}
        </select>
        {canRemove && (
          <button type="button" onClick={onRemove}
            className="p-2.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors">
            <Trash2 size={15} />
          </button>
        )}
      </div>
      <div className="grid grid-cols-2 gap-2.5">
        <input value={item.marca}     onChange={(e) => onChange('marca', e.target.value)}     placeholder="Marca (ex: NGK, Bosch...)" className="input-field col-span-2" />
        <input value={item.descricao} onChange={(e) => onChange('descricao', e.target.value)} placeholder="Descrição da peça"         className="input-field col-span-2" />
        <div className="flex flex-col gap-1">
          <label className="text-xs font-semibold text-brand-gray-light">Quantidade</label>
          <input type="number" value={item.quantidade} onChange={(e) => onChange('quantidade', e.target.value)} placeholder="1" min={1} className="input-field" />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-semibold text-brand-gray-light">Custo unitário</label>
          <input type="number" value={item.valor} onChange={(e) => onChange('valor', e.target.value)} placeholder="0,00" step="0.01" className="input-field" />
        </div>
      </div>
      {custo > 0 && (
        <div className="flex items-center justify-between bg-brand-yellow-light rounded-xl px-3 py-2.5">
          <span className="text-xs text-brand-yellow-dark font-medium">
            {formatCurrency(custo)} + {markup}% acréscimo
          </span>
          <span className="text-sm font-bold text-brand-black">{formatCurrency(total)}</span>
        </div>
      )}
      {/* Campos administrativos */}
      <div className="border-t border-dashed border-brand-gray-border pt-3 flex flex-col gap-3">
        <p className="text-[10px] font-bold text-brand-gray-light uppercase tracking-widest">
          Administrativo — não aparece no PDF do cliente
        </p>
        <SearchSelect
          items={fornecedores}
          value={item.fornecedorId || ''}
          onChange={(val) => onChange('fornecedorId', val)}
          getKey={(f) => f.id}
          getLabel={(f) => f.nome}
          getSub={(f) => f.cidade}
          placeholder="Fornecedor / loja..."
        />
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-brand-gray-light">Data da compra</label>
          <input
            type="date"
            value={item.dataCompra || ''}
            onChange={(e) => onChange('dataCompra', e.target.value)}
            className="input-field"
          />
        </div>
      </div>
    </div>
  )
}

function ServicoRow({ item, catalog, onChange, onRemove, canRemove }) {
  const total = (Number(item.valor) || 0) * (Number(item.quantidade) || 1)
  return (
    <div className="border border-brand-gray-border rounded-2xl p-4 flex flex-col gap-3 bg-brand-white-off">
      <div className="flex gap-2">
        <select
          onChange={(e) => {
            const f = catalog.find((s) => s.id === e.target.value)
            if (f) { onChange('descricao', f.tipoServico ?? f.descricao ?? ''); if (f.valor) onChange('valor', String(f.valor)) }
          }}
          className="input-field flex-1 text-sm"
          defaultValue=""
        >
          <option value="">Selecionar do catálogo</option>
          {catalog.map((s) => <option key={s.id} value={s.id}>{s.tipoServico}</option>)}
        </select>
        {canRemove && (
          <button type="button" onClick={onRemove}
            className="p-2.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors">
            <Trash2 size={15} />
          </button>
        )}
      </div>
      <input
        value={item.descricao}
        onChange={(e) => onChange('descricao', e.target.value)}
        placeholder="Descrição do serviço"
        className="input-field"
      />
      <div className="grid grid-cols-3 gap-2.5">
        <div className="flex flex-col gap-1">
          <label className="text-xs font-semibold text-brand-gray-light">Qtd</label>
          <input type="number" value={item.quantidade} onChange={(e) => onChange('quantidade', e.target.value)}
            placeholder="1" min={1} className="input-field" />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-semibold text-brand-gray-light">Valor unit.</label>
          <input type="number" value={item.valor} onChange={(e) => onChange('valor', e.target.value)}
            placeholder="0,00" step="0.01" className="input-field" />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-semibold text-brand-gray-light">Total</label>
          <div className="input-field bg-brand-gray-border font-bold text-right pointer-events-none">
            {formatCurrency(total)}
          </div>
        </div>
      </div>
    </div>
  )
}

function ResumoRow({ label, value }) {
  return (
    <div className="flex items-center justify-between py-1.5 border-b border-brand-gray-border last:border-0">
      <span className="text-sm text-brand-gray-light">{label}</span>
      <span className="text-sm font-semibold text-brand-black">{formatCurrency(value)}</span>
    </div>
  )
}
