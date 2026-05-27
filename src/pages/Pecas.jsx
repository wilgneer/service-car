import React, { useState } from 'react'
import { Package, Plus, Edit, Trash2, Search } from 'lucide-react'
import { useApp } from '../contexts/AppContext'
import { useToast } from '../contexts/ToastContext'
import * as svc from '../firebase/services'
import { formatCurrency } from '../utils/helpers'
import Button from '../components/ui/Button'
import Input from '../components/ui/Input'
import Modal from '../components/ui/Modal'
import ConfirmDialog from '../components/ui/ConfirmDialog'
import EmptyState from '../components/ui/EmptyState'

const empty = () => ({ tipoPeca: '', valor: '' })

export default function Pecas() {
  const { pecas, refresh } = useApp()
  const toast = useToast()
  const [search, setSearch] = useState('')
  const [modal, setModal] = useState(null)
  const [form, setForm] = useState(empty())
  const [saving, setSaving] = useState(false)
  const [deleteId, setDeleteId] = useState(null)

  const set = (k) => (e) => setForm((p) => ({ ...p, [k]: e.target.value }))

  const filtered = pecas.filter((p) =>
    !search || p.tipoPeca?.toLowerCase().includes(search.toLowerCase())
  )

  const openCreate = () => { setForm(empty()); setModal('create') }
  const openEdit = (p) => { setForm({ tipoPeca: p.tipoPeca ?? '', valor: String(p.valor ?? '') }); setModal(p.id) }

  const handleSave = async () => {
    if (!form.tipoPeca) return
    setSaving(true)
    try {
      const data = { ...form, valor: Number(form.valor) || 0 }
      if (modal === 'create') { await svc.createPeca(data); toast.success(`Peça "${form.tipoPeca}" cadastrada!`) }
      else { await svc.updatePeca(modal, data); toast.success('Peça atualizada!') }
      await refresh()
      setModal(null)
    } catch { toast.error('Erro ao salvar peça.')
    } finally { setSaving(false) }
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-brand-black">Peças / Produtos</h1>
          <p className="text-sm text-brand-gray-light">{pecas.length} cadastradas</p>
        </div>
        <Button onClick={openCreate}><Plus size={16} /> Nova Peça</Button>
      </div>

      <div className="relative">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-gray-light" />
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar peças..." className="input-field pl-9" />
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon={Package} title="Nenhuma peça cadastrada" action={<Button onClick={openCreate}><Plus size={16} /> Nova Peça</Button>} />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {filtered.map((p) => (
            <div key={p.id} className="card p-4 flex items-center gap-3">
              <div className="w-10 h-10 bg-brand-yellow-light rounded-xl flex items-center justify-center shrink-0">
                <Package size={17} className="text-brand-yellow-dark" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-brand-black truncate">{p.tipoPeca}</p>
                <p className="text-sm font-bold text-brand-black">{formatCurrency(p.valor)}</p>
              </div>
              <div className="flex gap-2 shrink-0">
                <button onClick={() => openEdit(p)} className="p-2 rounded-lg hover:bg-brand-gray-border transition-colors text-brand-gray-light hover:text-brand-black"><Edit size={15} /></button>
                <button onClick={() => setDeleteId(p.id)} className="p-2 rounded-lg hover:bg-red-50 transition-colors text-brand-gray-light hover:text-red-600"><Trash2 size={15} /></button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal open={!!modal} onClose={() => setModal(null)} title={modal === 'create' ? 'Nova Peça' : 'Editar Peça'}>
        <div className="flex flex-col gap-4">
          <Input label="Tipo de Peça *" value={form.tipoPeca} onChange={set('tipoPeca')} placeholder="Ex: Filtro de óleo, Pastilha de freio..." />
          <Input label="Valor (R$)" type="number" step="0.01" value={form.valor} onChange={set('valor')} placeholder="0,00" />
          <div className="flex gap-3 mt-2">
            <Button variant="secondary" className="flex-1 justify-center" onClick={() => setModal(null)}>Cancelar</Button>
            <Button className="flex-1 justify-center" loading={saving} onClick={handleSave}>Salvar</Button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog open={!!deleteId} onClose={() => setDeleteId(null)} onConfirm={async () => { try { await svc.deletePeca(deleteId); await refresh(); toast.success('Peça removida.') } catch { toast.error('Erro ao remover peça.') } }} title="Excluir peça?" danger />
    </div>
  )
}
