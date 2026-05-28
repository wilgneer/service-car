import React, { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  TrendingUp, TrendingDown, DollarSign, AlertTriangle,
  Car, Package, Plus, Trash2, Edit, Building2, ChevronRight,
  ShoppingCart, BarChart2, Calendar,
} from 'lucide-react'
import { useApp } from '../contexts/AppContext'
import { useToast } from '../contexts/ToastContext'
import { useLogger } from '../hooks/useLogger'
import * as svc from '../firebase/services'
import { formatCurrency, formatDate, formatDateLocal } from '../utils/helpers'
import Button from '../components/ui/Button'
import Input from '../components/ui/Input'
import Modal from '../components/ui/Modal'
import ConfirmDialog from '../components/ui/ConfirmDialog'

const TABS = [
  { id: 'entradas',  label: 'Entradas',  icon: TrendingUp    },
  { id: 'saidas',    label: 'Saídas',    icon: TrendingDown  },
  { id: 'perdas',    label: 'Perdas',    icon: AlertTriangle },
  { id: 'historico', label: 'Histórico', icon: BarChart2     },
]

const MESES = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez']

const emptyMaterial = () => ({ descricao: '', valor: '', fornecedor: '', observacoes: '', data: new Date().toISOString().split('T')[0] })

export default function Financeiro() {
  const navigate = useNavigate()
  const { orcamentos, clientes, carros, fornecedores, materiais, addMaterial, editMaterial, dropMaterial } = useApp()
  const toast  = useToast()
  const logger = useLogger()

  const [tab,        setTab]        = useState('entradas')
  const [saidaView,  setSaidaView]  = useState('pecas')    // 'pecas' | 'materiais'
  const [histView,   setHistView]   = useState('mensal')   // 'mensal' | 'anual'
  const [matModal,   setMatModal]   = useState(null)     // null | { mode, item? }
  const [matForm,    setMatForm]    = useState(emptyMaterial())
  const [saving,     setSaving]     = useState(false)
  const [confirmDel, setConfirmDel] = useState(null)

  // ── Cálculos ─────────────────────────────────────────────────────────────────

  const pagos      = useMemo(() => orcamentos.filter((o) => o.status === 'pago'),      [orcamentos])
  const reprovados = useMemo(() => orcamentos.filter((o) => o.status === 'reprovado'), [orcamentos])

  const totalEntradas  = useMemo(() => pagos.reduce(     (s, o) => s + (o.totalGeral || o.total || 0), 0), [pagos])
  const totalPerdas    = useMemo(() => reprovados.reduce((s, o) => s + (o.totalGeral || o.total || 0), 0), [reprovados])

  // Custo de peças por fornecedor (baseado em todos os orçamentos que têm fornecedorId)
  const pecasPorFornecedor = useMemo(() => {
    const map = {}
    orcamentos.forEach((o) => {
      ;(o.itens?.pecas ?? []).forEach((peca) => {
        if (!peca.fornecedorId) return
        const custo = (Number(peca.valor) || 0) * (Number(peca.quantidade) || 1)
        if (!map[peca.fornecedorId]) map[peca.fornecedorId] = { total: 0, qtd: 0 }
        map[peca.fornecedorId].total += custo
        map[peca.fornecedorId].qtd   += Number(peca.quantidade) || 1
      })
    })
    return Object.entries(map)
      .map(([id, data]) => ({
        id,
        nome: fornecedores.find((f) => f.id === id)?.nome ?? 'Fornecedor desconhecido',
        cidade: fornecedores.find((f) => f.id === id)?.cidade ?? '',
        ...data,
      }))
      .sort((a, b) => b.total - a.total)
  }, [orcamentos, fornecedores])

  const totalPecas     = useMemo(() => pecasPorFornecedor.reduce((s, f) => s + f.total, 0), [pecasPorFornecedor])
  const totalMateriais = useMemo(() => materiais.reduce((s, m) => s + (Number(m.valor) || 0), 0), [materiais])
  const totalSaidas    = totalPecas + totalMateriais
  const resultado      = totalEntradas - totalSaidas

  // ── Histórico mensal ──────────────────────────────────────────────────────────
  const registrosMensais = useMemo(() => {
    const map = {}

    const getKey = (val) => {
      if (!val) return null
      const d = val?.toDate ? val.toDate() : new Date(val)
      if (isNaN(d.getTime())) return null
      return { key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2,'0')}`, year: d.getFullYear(), month: d.getMonth() + 1 }
    }

    // Entradas e custo de peças (orçamentos pagos)
    pagos.forEach((o) => {
      const k = getKey(o.pagoEm ?? o.createdAt)
      if (!k) return
      if (!map[k.key]) map[k.key] = { key: k.key, year: k.year, month: k.month, entradas: 0, custoPecas: 0, custaMateriais: 0 }
      map[k.key].entradas += o.totalGeral || o.total || 0;
      (o.itens?.pecas ?? []).forEach((p) => {
        map[k.key].custoPecas += (Number(p.valor) || 0) * (Number(p.quantidade) || 1)
      })
    })

    // Saídas avulsas (materiais)
    materiais.forEach((m) => {
      if (!m.data) return
      const [year, month] = m.data.split('-').map(Number)
      const key = `${year}-${String(month).padStart(2,'0')}`
      if (!map[key]) map[key] = { key, year, month, entradas: 0, custoPecas: 0, custaMateriais: 0 }
      map[key].custaMateriais += Number(m.valor) || 0
    })

    return Object.values(map)
      .map((r) => ({
        ...r,
        saidas:    r.custoPecas + r.custaMateriais,
        resultado: r.entradas - r.custoPecas - r.custaMateriais,
      }))
      .sort((a, b) => b.key.localeCompare(a.key))
  }, [pagos, materiais])

  const registrosAnuais = useMemo(() => {
    const map = {}
    registrosMensais.forEach((m) => {
      if (!map[m.year]) map[m.year] = { year: m.year, entradas: 0, saidas: 0, resultado: 0 }
      map[m.year].entradas  += m.entradas
      map[m.year].saidas    += m.saidas
      map[m.year].resultado += m.resultado
    })
    return Object.values(map).sort((a, b) => b.year - a.year)
  }, [registrosMensais])

  // ── Materiais CRUD ────────────────────────────────────────────────────────────

  const openNewMat  = () => { setMatForm(emptyMaterial()); setMatModal({ mode: 'new' }) }
  const openEditMat = (item) => {
    setMatForm({
      descricao:   item.descricao   || '',
      valor:       item.valor       || '',
      fornecedor:  item.fornecedor  || '',
      observacoes: item.observacoes || '',
      data:        item.data        || new Date().toISOString().split('T')[0],
    })
    setMatModal({ mode: 'edit', item })
  }

  const handleSaveMat = async () => {
    if (!matForm.descricao.trim()) { toast.error('Informe o que foi comprado.'); return }
    if (!matForm.valor || Number(matForm.valor) <= 0) { toast.error('Informe o valor.'); return }
    setSaving(true)
    try {
      if (matModal.mode === 'new') {
        const id = await svc.createMaterial({ ...matForm, valor: Number(matForm.valor) })
        addMaterial({ id, ...matForm, valor: Number(matForm.valor) })
        logger.activity('material_criado', `Material "${matForm.descricao}" lançado — ${formatCurrency(matForm.valor)}`)
        toast.success('Material lançado!')
      } else {
        const data = { ...matForm, valor: Number(matForm.valor) }
        await svc.updateMaterial(matModal.item.id, data)
        editMaterial(matModal.item.id, data)
        logger.activity('material_editado', `Material "${matForm.descricao}" atualizado`)
        toast.success('Material atualizado!')
      }
      setMatModal(null)
    } catch { toast.error('Erro ao salvar material.')
    } finally { setSaving(false) }
  }

  const handleDeleteMat = async (item) => {
    try {
      await svc.deleteMaterial(item.id)
      dropMaterial(item.id)
      logger.activity('material_excluido', `Material "${item.descricao}" excluído`)
      toast.success('Material removido.')
    } catch { toast.error('Erro ao excluir.') }
    setConfirmDel(null)
  }

  const setF = (field) => (e) => setMatForm((p) => ({ ...p, [field]: e.target.value }))

  // ── Render ────────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold text-brand-black">Financeiro</h1>
        <p className="text-sm text-brand-gray-light">Entradas, saídas e perdas</p>
      </div>

      {/* ── Cards de resumo ─────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <SummaryCard
          icon={TrendingUp} color="green"
          label="Entradas" sub={`${pagos.length} pago(s)`}
          value={totalEntradas}
        />
        <SummaryCard
          icon={TrendingDown} color="red"
          label="Saídas" sub="Peças + Materiais"
          value={totalSaidas}
        />
        <SummaryCard
          icon={DollarSign} color={resultado >= 0 ? 'blue' : 'orange'}
          label="Resultado" sub="Entradas − Saídas"
          value={resultado}
        />
        <SummaryCard
          icon={AlertTriangle} color="orange"
          label="Perdas" sub={`${reprovados.length} reprovado(s)`}
          value={totalPerdas}
        />
      </div>

      {/* ── Tabs ───────────────────────────────────────────────────────────── */}
      <div className="flex gap-0 border-b border-brand-gray-border">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`flex items-center gap-2 px-5 py-3 text-sm font-medium border-b-2 transition-colors -mb-px ${
              tab === id
                ? 'border-brand-yellow text-brand-black'
                : 'border-transparent text-brand-gray-light hover:text-brand-black'
            }`}
          >
            <Icon size={15} />
            {label}
          </button>
        ))}
      </div>

      {/* ── ENTRADAS ───────────────────────────────────────────────────────── */}
      {tab === 'entradas' && (
        <div className="flex flex-col gap-3">
          {pagos.length === 0 ? (
            <EmptyState icon={TrendingUp} title="Nenhum orçamento pago ainda" sub='Aprove um orçamento e clique em "Pago" para registrar a entrada.' />
          ) : (
            pagos.map((o) => (
              <OrcamentoRow key={o.id} o={o} clientes={clientes} carros={carros} navigate={navigate} colorClass="text-green-600" bgClass="bg-green-50" />
            ))
          )}
        </div>
      )}

      {/* ── SAÍDAS ─────────────────────────────────────────────────────────── */}
      {tab === 'saidas' && (
        <div className="flex flex-col gap-4">
          {/* Sub-tabs */}
          <div className="flex gap-2">
            <button
              onClick={() => setSaidaView('pecas')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                saidaView === 'pecas'
                  ? 'bg-brand-black text-white'
                  : 'bg-brand-gray-border text-brand-gray-light hover:text-brand-black'
              }`}
            >
              <Package size={14} /> Peças por Fornecedor
              <span className="ml-1 font-bold">{formatCurrency(totalPecas)}</span>
            </button>
            <button
              onClick={() => setSaidaView('materiais')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                saidaView === 'materiais'
                  ? 'bg-brand-black text-white'
                  : 'bg-brand-gray-border text-brand-gray-light hover:text-brand-black'
              }`}
            >
              <ShoppingCart size={14} /> Materiais
              <span className="ml-1 font-bold">{formatCurrency(totalMateriais)}</span>
            </button>
          </div>

          {/* Peças por Fornecedor */}
          {saidaView === 'pecas' && (
            <>
              {pecasPorFornecedor.length === 0 ? (
                <EmptyState icon={Package} title="Nenhuma peça com fornecedor cadastrado" sub="Ao criar ou editar um orçamento, selecione o fornecedor em cada peça." />
              ) : (
                <div className="card divide-y divide-brand-gray-border">
                  {pecasPorFornecedor.map((f) => (
                    <div key={f.id} className="flex items-center justify-between p-4 gap-3">
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <div className="p-2 bg-red-50 rounded-lg shrink-0">
                          <Building2 size={16} className="text-red-500" />
                        </div>
                        <div className="min-w-0">
                          <p className="font-semibold text-brand-black truncate">{f.nome}</p>
                          {f.cidade && <p className="text-xs text-brand-gray-light">{f.cidade}</p>}
                          <p className="text-xs text-brand-gray-light">{f.qtd} peça(s)</p>
                        </div>
                      </div>
                      <p className="font-bold text-red-600 whitespace-nowrap">{formatCurrency(f.total)}</p>
                    </div>
                  ))}
                  <div className="flex justify-between items-center px-4 py-3 bg-brand-white-off rounded-b-xl">
                    <p className="text-sm font-semibold text-brand-black">Total em peças</p>
                    <p className="font-bold text-red-600">{formatCurrency(totalPecas)}</p>
                  </div>
                </div>
              )}
            </>
          )}

          {/* Materiais */}
          {saidaView === 'materiais' && (
            <>
              <div className="flex justify-end">
                <Button onClick={openNewMat}><Plus size={15} /> Lançar Material</Button>
              </div>
              {materiais.length === 0 ? (
                <EmptyState icon={ShoppingCart} title="Nenhum material lançado" sub="Registre as compras de materiais para controle de saídas." />
              ) : (
                <div className="card divide-y divide-brand-gray-border">
                  {[...materiais].sort((a, b) => {
                    const da = a.data || ''
                    const db = b.data || ''
                    return db.localeCompare(da)
                  }).map((m) => (
                    <div key={m.id} className="flex items-center gap-3 p-4">
                      <div className="p-2 bg-orange-50 rounded-lg shrink-0">
                        <ShoppingCart size={16} className="text-orange-500" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-semibold text-brand-black">{m.descricao}</p>
                          {m.data && <p className="text-xs text-brand-gray-light">{formatDateLocal(m.data)}</p>}
                        </div>
                        {m.fornecedor  && <p className="text-xs text-brand-gray-light flex items-center gap-1"><Building2 size={10} />{m.fornecedor}</p>}
                        {m.observacoes && <p className="text-xs text-brand-gray-light italic truncate">{m.observacoes}</p>}
                      </div>
                      <p className="font-bold text-orange-600 whitespace-nowrap">{formatCurrency(m.valor)}</p>
                      <div className="flex gap-1 shrink-0">
                        <button onClick={() => openEditMat(m)} className="p-1.5 text-brand-gray-light hover:text-brand-black hover:bg-brand-gray-border rounded-lg transition-colors"><Edit size={14} /></button>
                        <button onClick={() => setConfirmDel(m)} className="p-1.5 text-brand-gray-light hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"><Trash2 size={14} /></button>
                      </div>
                    </div>
                  ))}
                  <div className="flex justify-between items-center px-4 py-3 bg-brand-white-off rounded-b-xl">
                    <p className="text-sm font-semibold text-brand-black">Total em materiais</p>
                    <p className="font-bold text-orange-600">{formatCurrency(totalMateriais)}</p>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* ── PERDAS ─────────────────────────────────────────────────────────── */}
      {tab === 'perdas' && (
        <div className="flex flex-col gap-3">
          {reprovados.length === 0 ? (
            <EmptyState icon={AlertTriangle} title="Nenhum orçamento reprovado" sub="Orçamentos reprovados aparecerão aqui como perdas." />
          ) : (
            <>
              {reprovados.map((o) => (
                <OrcamentoRow key={o.id} o={o} clientes={clientes} carros={carros} navigate={navigate} colorClass="text-orange-600" bgClass="bg-orange-50" />
              ))}
              <div className="card px-4 py-3 flex justify-between items-center bg-orange-50 border-orange-200">
                <p className="text-sm font-semibold text-orange-700">Total de perdas</p>
                <p className="font-bold text-orange-700">{formatCurrency(totalPerdas)}</p>
              </div>
            </>
          )}
        </div>
      )}

      {/* ── HISTÓRICO ──────────────────────────────────────────────────────── */}
      {tab === 'historico' && (
        <div className="flex flex-col gap-4">
          {/* Sub-tabs Mensal / Anual */}
          <div className="flex gap-2">
            <button
              onClick={() => setHistView('mensal')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                histView === 'mensal'
                  ? 'bg-brand-black text-white'
                  : 'bg-brand-gray-border text-brand-gray-light hover:text-brand-black'
              }`}
            >
              <Calendar size={14} /> Mensal
            </button>
            <button
              onClick={() => setHistView('anual')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                histView === 'anual'
                  ? 'bg-brand-black text-white'
                  : 'bg-brand-gray-border text-brand-gray-light hover:text-brand-black'
              }`}
            >
              <BarChart2 size={14} /> Anual
            </button>
          </div>

          {/* Legenda */}
          <div className="flex flex-wrap gap-4 text-xs text-brand-gray-light">
            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-green-500 inline-block" /> Faturamento (orçamentos pagos)</span>
            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-red-400 inline-block" /> Gastos (peças + materiais)</span>
            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-blue-500 inline-block" /> Lucro líquido</span>
          </div>

          {/* Tabela Mensal */}
          {histView === 'mensal' && (
            <>
              {registrosMensais.length === 0 ? (
                <EmptyState icon={BarChart2} title="Nenhum registro mensal ainda" sub="Registros aparecem quando há orçamentos pagos ou materiais lançados." />
              ) : (
                <div className="card overflow-hidden">
                  {/* Header */}
                  <div className="grid grid-cols-4 gap-2 px-4 py-2 bg-brand-white-off border-b border-brand-gray-border text-xs font-semibold text-brand-gray-light uppercase tracking-wide">
                    <span>Período</span>
                    <span className="text-right">Faturamento</span>
                    <span className="text-right">Gastos</span>
                    <span className="text-right">Lucro</span>
                  </div>
                  {registrosMensais.map((r) => (
                    <div key={r.key} className="grid grid-cols-4 gap-2 px-4 py-3.5 border-b border-brand-gray-border last:border-0 hover:bg-brand-white-off transition-colors">
                      <div>
                        <p className="font-semibold text-brand-black text-sm">{MESES[r.month - 1]} {r.year}</p>
                      </div>
                      <p className="text-right text-sm font-medium text-green-600">{formatCurrency(r.entradas)}</p>
                      <p className="text-right text-sm font-medium text-red-500">{formatCurrency(r.saidas)}</p>
                      <p className={`text-right text-sm font-bold ${r.resultado >= 0 ? 'text-blue-600' : 'text-orange-600'}`}>
                        {formatCurrency(r.resultado)}
                      </p>
                    </div>
                  ))}
                  {/* Totais */}
                  <div className="grid grid-cols-4 gap-2 px-4 py-3 bg-brand-black rounded-b-xl">
                    <p className="text-xs font-bold text-white uppercase tracking-wide">Total geral</p>
                    <p className="text-right text-sm font-bold text-green-400">{formatCurrency(registrosMensais.reduce((s,r)=>s+r.entradas,0))}</p>
                    <p className="text-right text-sm font-bold text-red-400">{formatCurrency(registrosMensais.reduce((s,r)=>s+r.saidas,0))}</p>
                    <p className="text-right text-sm font-bold text-blue-300">{formatCurrency(registrosMensais.reduce((s,r)=>s+r.resultado,0))}</p>
                  </div>
                </div>
              )}
            </>
          )}

          {/* Tabela Anual */}
          {histView === 'anual' && (
            <>
              {registrosAnuais.length === 0 ? (
                <EmptyState icon={BarChart2} title="Nenhum registro anual ainda" sub="Registros aparecem quando há orçamentos pagos ou materiais lançados." />
              ) : (
                <div className="card overflow-hidden">
                  <div className="grid grid-cols-4 gap-2 px-4 py-2 bg-brand-white-off border-b border-brand-gray-border text-xs font-semibold text-brand-gray-light uppercase tracking-wide">
                    <span>Ano</span>
                    <span className="text-right">Faturamento</span>
                    <span className="text-right">Gastos</span>
                    <span className="text-right">Lucro</span>
                  </div>
                  {registrosAnuais.map((r) => (
                    <div key={r.year} className="grid grid-cols-4 gap-2 px-4 py-4 border-b border-brand-gray-border last:border-0 hover:bg-brand-white-off transition-colors">
                      <p className="font-bold text-brand-black">{r.year}</p>
                      <p className="text-right text-sm font-medium text-green-600">{formatCurrency(r.entradas)}</p>
                      <p className="text-right text-sm font-medium text-red-500">{formatCurrency(r.saidas)}</p>
                      <p className={`text-right font-bold ${r.resultado >= 0 ? 'text-blue-600' : 'text-orange-600'}`}>
                        {formatCurrency(r.resultado)}
                      </p>
                    </div>
                  ))}
                  <div className="grid grid-cols-4 gap-2 px-4 py-3 bg-brand-black rounded-b-xl">
                    <p className="text-xs font-bold text-white uppercase tracking-wide">Total</p>
                    <p className="text-right text-sm font-bold text-green-400">{formatCurrency(registrosAnuais.reduce((s,r)=>s+r.entradas,0))}</p>
                    <p className="text-right text-sm font-bold text-red-400">{formatCurrency(registrosAnuais.reduce((s,r)=>s+r.saidas,0))}</p>
                    <p className="text-right text-sm font-bold text-blue-300">{formatCurrency(registrosAnuais.reduce((s,r)=>s+r.resultado,0))}</p>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* ── Modal Lançar/Editar Material ────────────────────────────────────── */}
      <Modal open={!!matModal} onClose={() => setMatModal(null)} title={matModal?.mode === 'new' ? 'Lançar Material' : 'Editar Material'}>
        <div className="flex flex-col gap-4">
          <Input label="O que foi comprado *" value={matForm.descricao} onChange={setF('descricao')} placeholder="Ex: Lixa #180, Primer, Tinta..." autoFocus />
          <div className="grid grid-cols-2 gap-3">
            <Input label="Valor (R$) *" type="number" step="0.01" value={matForm.valor} onChange={setF('valor')} placeholder="0,00" />
            <Input label="Data"         type="date"              value={matForm.data}  onChange={setF('data')} />
          </div>
          <Input label="Fornecedor / Loja" value={matForm.fornecedor} onChange={setF('fornecedor')} placeholder="Nome da loja..." />
          <Input label="Observações"       value={matForm.observacoes} onChange={setF('observacoes')} placeholder="Detalhes extras (opcional)" />
          <div className="flex gap-3 mt-2">
            <Button variant="secondary" className="flex-1 justify-center" onClick={() => setMatModal(null)}>Cancelar</Button>
            <Button className="flex-1 justify-center" loading={saving} onClick={handleSaveMat}>Salvar</Button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        open={!!confirmDel}
        onClose={() => setConfirmDel(null)}
        onConfirm={() => handleDeleteMat(confirmDel)}
        title="Excluir material?"
        message={`Remover "${confirmDel?.descricao}"?`}
        danger
      />
    </div>
  )
}

// ── Sub-componentes ──────────────────────────────────────────────────────────

function SummaryCard({ icon: Icon, color, label, sub, value }) {
  const colors = {
    green:  { bg: 'bg-green-50',  text: 'text-green-600',  icon: 'text-green-600'  },
    red:    { bg: 'bg-red-50',    text: 'text-red-600',    icon: 'text-red-600'    },
    blue:   { bg: 'bg-blue-50',   text: 'text-blue-600',   icon: 'text-blue-600'   },
    orange: { bg: 'bg-orange-50', text: 'text-orange-600', icon: 'text-orange-600' },
  }
  const c = colors[color] ?? colors.blue
  return (
    <div className="card p-4 flex flex-col gap-2">
      <div className={`p-2.5 ${c.bg} rounded-xl w-fit`}>
        <Icon size={20} className={c.icon} />
      </div>
      <div>
        <p className="text-xs text-brand-gray-light">{label}</p>
        <p className={`text-xl font-bold ${c.text}`}>{formatCurrency(value)}</p>
        <p className="text-xs text-brand-gray-light">{sub}</p>
      </div>
    </div>
  )
}

function OrcamentoRow({ o, clientes, carros, navigate, colorClass, bgClass }) {
  const nomeCliente  = o.clienteNome  || clientes.find((c) => c.id === o.clienteId)?.nome  || '-'
  const nomeVeiculo  = o.veiculoModelo || carros.find((c) => c.id === o.carroId)?.nome      || '-'
  const placaVeiculo = o.veiculoPlaca  || carros.find((c) => c.id === o.carroId)?.placa     || ''
  const data         = o.pagoEm ?? o.aprovadoEm ?? o.reprovadoEm ?? o.createdAt
  return (
    <div
      onClick={() => navigate(`/orcamentos/${o.id}`)}
      className="card p-4 flex items-center gap-3 cursor-pointer hover:border-brand-yellow transition-colors"
    >
      <div className={`p-2.5 ${bgClass} rounded-xl shrink-0`}>
        <DollarSign size={17} className={colorClass} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="font-semibold text-brand-black">#{String(o.numero).padStart(4, '0')}</p>
          <p className="text-sm text-brand-black truncate">{nomeCliente}</p>
        </div>
        <div className="flex items-center gap-1 text-xs text-brand-gray-light">
          <Car size={11} />
          <span className="truncate">{nomeVeiculo}{placaVeiculo ? ` · ${placaVeiculo}` : ''}</span>
        </div>
        <p className="text-xs text-brand-gray-light">{formatDate(data)}</p>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <p className={`font-bold whitespace-nowrap ${colorClass}`}>{formatCurrency(o.totalGeral || o.total)}</p>
        <ChevronRight size={15} className="text-brand-gray-light" />
      </div>
    </div>
  )
}

function EmptyState({ icon: Icon, title, sub }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center gap-3">
      <div className="p-4 bg-brand-yellow-light rounded-full">
        <Icon size={24} className="text-brand-yellow-dark" />
      </div>
      <p className="font-semibold text-brand-black">{title}</p>
      {sub && <p className="text-sm text-brand-gray-light max-w-sm">{sub}</p>}
    </div>
  )
}
