import React, { useState } from 'react'
import { Users, Plus, Edit, Trash2, Phone, Search, FileText } from 'lucide-react'
import { useApp } from '../contexts/AppContext'
import { useToast } from '../contexts/ToastContext'
import { useLogger } from '../hooks/useLogger'
import * as svc from '../firebase/services'
import Button from '../components/ui/Button'
import Input from '../components/ui/Input'
import Modal from '../components/ui/Modal'
import ConfirmDialog from '../components/ui/ConfirmDialog'
import EmptyState from '../components/ui/EmptyState'

const empty = () => ({ nome: '', celular: '' })

export default function Clientes() {
  const { clientes, orcamentos, addCliente, editCliente, dropCliente } = useApp()
  const toast = useToast()
  const logger = useLogger()
  const [search,   setSearch]   = useState('')
  const [modal,    setModal]    = useState(null)
  const [form,     setForm]     = useState(empty())
  const [saving,   setSaving]   = useState(false)
  const [deleteId, setDeleteId] = useState(null)

  const set = (k) => (e) => setForm((p) => ({ ...p, [k]: e.target.value }))

  const filtered = clientes.filter((c) =>
    !search || c.nome?.toLowerCase().includes(search.toLowerCase()) || c.celular?.includes(search)
  )

  const openCreate = () => { setForm(empty()); setModal('create') }
  const openEdit   = (c) => { setForm({ nome: c.nome ?? '', celular: c.celular ?? '' }); setModal(c.id) }

  const handleSave = async () => {
    if (!form.nome) return
    // Valida celular duplicado
    if (form.celular) {
      const cel = form.celular.replace(/\D/g, '')
      const duplicado = clientes.find((c) =>
        c.id !== modal &&
        c.celular?.replace(/\D/g, '') === cel && cel.length >= 8
      )
      if (duplicado) {
        toast.error(`Esse número já está cadastrado para "${duplicado.nome}".`)
        return
      }
    }
    setSaving(true)
    try {
      if (modal === 'create') {
        const id = await svc.createCliente(form)
        addCliente({ id, ...form })
        logger.activity('cliente_criado', `Cliente "${form.nome}" cadastrado`)
        toast.success(`Cliente "${form.nome}" cadastrado!`)
      } else {
        await svc.updateCliente(modal, form)
        editCliente(modal, form)
        logger.activity('cliente_editado', `Cliente "${form.nome}" atualizado`)
        toast.success('Cliente atualizado!')
      }
      setModal(null)
    } catch (err) { logger.error('erro_ao_salvar', 'Erro ao salvar cliente', { err: err?.message }); toast.error('Erro ao salvar cliente.')
    } finally { setSaving(false) }
  }

  const handleDelete = async () => {
    try {
      const nome = clientes.find((c) => c.id === deleteId)?.nome ?? ''
      await svc.deleteCliente(deleteId)
      dropCliente(deleteId)
      logger.activity('cliente_excluido', `Cliente "${nome}" excluído`)
      toast.success('Cliente removido.')
    } catch (err) { logger.error('erro_ao_excluir', 'Erro ao excluir cliente', { err: err?.message }); toast.error('Erro ao remover cliente.') }
  }

  const orcamentosCount = (id) => orcamentos.filter((o) => o.clienteId === id).length

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-brand-black">Clientes</h1>
          <p className="text-sm text-brand-gray-light">{clientes.length} cadastrados</p>
        </div>
        <Button onClick={openCreate}><Plus size={16} /> Novo Cliente</Button>
      </div>

      <div className="relative">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-gray-light" />
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar por nome ou telefone..." className="input-field pl-9" />
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon={Users} title="Nenhum cliente encontrado" action={<Button onClick={openCreate}><Plus size={16} /> Novo Cliente</Button>} />
      ) : (
        <div className="flex flex-col gap-2">
          {filtered.map((c) => (
            <div key={c.id} className="card p-4 flex items-center gap-4">
              <div className="w-10 h-10 bg-brand-yellow-light rounded-full flex items-center justify-center shrink-0">
                <span className="text-brand-yellow-dark font-bold text-sm">{c.nome?.[0]?.toUpperCase()}</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-brand-black truncate">{c.nome}</p>
                {c.celular && <div className="flex items-center gap-1 text-sm text-brand-gray-light"><Phone size={12} /> {c.celular}</div>}
                <div className="flex items-center gap-1 text-xs text-brand-gray-light mt-0.5">
                  <FileText size={11} /> {orcamentosCount(c.id)} orçamento(s)
                </div>
              </div>
              <div className="flex gap-2 shrink-0">
                <button onClick={() => openEdit(c)} className="p-2 rounded-lg hover:bg-brand-gray-border transition-colors text-brand-gray-light hover:text-brand-black"><Edit size={15} /></button>
                <button onClick={() => setDeleteId(c.id)} className="p-2 rounded-lg hover:bg-red-50 transition-colors text-brand-gray-light hover:text-red-600"><Trash2 size={15} /></button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal open={!!modal} onClose={() => setModal(null)} title={modal === 'create' ? 'Novo Cliente' : 'Editar Cliente'}>
        <div className="flex flex-col gap-4">
          <Input label="Nome *" value={form.nome} onChange={set('nome')} placeholder="Nome completo" />
          <Input label="Celular / WhatsApp" value={form.celular} onChange={set('celular')} placeholder="(00) 00000-0000" />
          <div className="flex gap-3 mt-2">
            <Button variant="secondary" className="flex-1 justify-center" onClick={() => setModal(null)}>Cancelar</Button>
            <Button className="flex-1 justify-center" loading={saving} onClick={handleSave}>Salvar</Button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog open={!!deleteId} onClose={() => setDeleteId(null)} onConfirm={handleDelete} title="Excluir cliente?" message="Esta ação não pode ser desfeita." danger />
    </div>
  )
}
