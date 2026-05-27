import React, { useState } from 'react'
import { Wrench, Plus, Edit, Trash2, Search } from 'lucide-react'
import { useApp } from '../contexts/AppContext'
import { useToast } from '../contexts/ToastContext'
import { useLogger } from '../hooks/useLogger'
import * as svc from '../firebase/services'
import { formatCurrency } from '../utils/helpers'
import Button from '../components/ui/Button'
import Input, { Textarea } from '../components/ui/Input'
import Modal from '../components/ui/Modal'
import ConfirmDialog from '../components/ui/ConfirmDialog'
import EmptyState from '../components/ui/EmptyState'

const empty = () => ({ tipoServico: '', descricao: '', valor: '' })

export default function Servicos() {
  const { servicos, addServico, editServico, dropServico } = useApp()
  const toast = useToast()
  const logger = useLogger()
  const [search,   setSearch]   = useState('')
  const [modal,    setModal]    = useState(null)
  const [form,     setForm]     = useState(empty())
  const [saving,   setSaving]   = useState(false)
  const [deleteId, setDeleteId] = useState(null)

  const set = (k) => (e) => setForm((p) => ({ ...p, [k]: e.target.value }))

  const filtered = servicos.filter((s) => {
    const term = search.toLowerCase()
    return !term || s.tipoServico?.toLowerCase().includes(term) || s.descricao?.toLowerCase().includes(term)
  })

  const openCreate = () => { setForm(empty()); setModal('create') }
  const openEdit   = (s) => { setForm({ tipoServico: s.tipoServico ?? '', descricao: s.descricao ?? '', valor: String(s.valor ?? '') }); setModal(s.id) }

  const handleSave = async () => {
    if (!form.tipoServico) return
    setSaving(true)
    try {
      const data = { ...form, valor: Number(form.valor) || 0 }
      if (modal === 'create') {
        const id = await svc.createServico(data)
        addServico({ id, ...data })
        logger.activity('servico_criado', `Serviço "${form.tipoServico}" cadastrado`)
        toast.success(`Serviço "${form.tipoServico}" cadastrado!`)
      } else {
        await svc.updateServico(modal, data)
        editServico(modal, data)
        logger.activity('servico_editado', `Serviço "${form.tipoServico}" atualizado`)
        toast.success('Serviço atualizado!')
      }
      setModal(null)
    } catch (err) { logger.error('erro_ao_salvar', 'Erro ao salvar serviço', { err: err?.message }); toast.error('Erro ao salvar serviço.')
    } finally { setSaving(false) }
  }

  const handleDelete = async () => {
    try {
      const nome = servicos.find((s) => s.id === deleteId)?.tipoServico ?? ''
      await svc.deleteServico(deleteId)
      dropServico(deleteId)
      logger.activity('servico_excluido', `Serviço "${nome}" excluído`)
      toast.success('Serviço removido.')
    } catch (err) { logger.error('erro_ao_excluir', 'Erro ao excluir serviço', { err: err?.message }); toast.error('Erro ao remover serviço.') }
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-brand-black">Serviços</h1>
          <p className="text-sm text-brand-gray-light">{servicos.length} cadastrados</p>
        </div>
        <Button onClick={openCreate}><Plus size={16} /> Novo Serviço</Button>
      </div>

      <div className="relative">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-gray-light" />
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar serviços..." className="input-field pl-9" />
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon={Wrench} title="Nenhum serviço cadastrado" action={<Button onClick={openCreate}><Plus size={16} /> Novo Serviço</Button>} />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {filtered.map((s) => (
            <div key={s.id} className="card p-4 flex items-start gap-3">
              <div className="w-10 h-10 bg-brand-yellow-light rounded-xl flex items-center justify-center shrink-0">
                <Wrench size={17} className="text-brand-yellow-dark" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-brand-black">{s.tipoServico}</p>
                {s.descricao && <p className="text-sm text-brand-gray-light truncate">{s.descricao}</p>}
                <p className="text-sm font-bold text-brand-black mt-1">{formatCurrency(s.valor)}</p>
              </div>
              <div className="flex gap-2 shrink-0">
                <button onClick={() => openEdit(s)} className="p-2 rounded-lg hover:bg-brand-gray-border transition-colors text-brand-gray-light hover:text-brand-black"><Edit size={15} /></button>
                <button onClick={() => setDeleteId(s.id)} className="p-2 rounded-lg hover:bg-red-50 transition-colors text-brand-gray-light hover:text-red-600"><Trash2 size={15} /></button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal open={!!modal} onClose={() => setModal(null)} title={modal === 'create' ? 'Novo Serviço' : 'Editar Serviço'}>
        <div className="flex flex-col gap-4">
          <Input label="Tipo de Serviço *" value={form.tipoServico} onChange={set('tipoServico')} placeholder="Ex: Troca de óleo..." />
          <Textarea label="Descrição" value={form.descricao} onChange={set('descricao')} placeholder="Detalhes do serviço..." />
          <Input label="Valor (R$)" type="number" step="0.01" value={form.valor} onChange={set('valor')} placeholder="0,00" />
          <div className="flex gap-3 mt-2">
            <Button variant="secondary" className="flex-1 justify-center" onClick={() => setModal(null)}>Cancelar</Button>
            <Button className="flex-1 justify-center" loading={saving} onClick={handleSave}>Salvar</Button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog open={!!deleteId} onClose={() => setDeleteId(null)} onConfirm={handleDelete} title="Excluir serviço?" danger />
    </div>
  )
}
