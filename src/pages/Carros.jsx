import React, { useState } from 'react'
import { Car, Plus, Edit, Trash2, Search } from 'lucide-react'
import { useApp } from '../contexts/AppContext'
import { useToast } from '../contexts/ToastContext'
import { useLogger } from '../hooks/useLogger'
import * as svc from '../firebase/services'
import Button from '../components/ui/Button'
import Input, { Select } from '../components/ui/Input'
import Modal from '../components/ui/Modal'
import ConfirmDialog from '../components/ui/ConfirmDialog'
import EmptyState from '../components/ui/EmptyState'

const empty = () => ({ nome: '', marca: '', cor: '', ano: '', placa: '', clienteId: '' })

export default function Carros() {
  const { carros, clientes, addCarro, editCarro, dropCarro } = useApp()
  const toast = useToast()
  const logger = useLogger()
  const [search,   setSearch]   = useState('')
  const [modal,    setModal]    = useState(null)
  const [form,     setForm]     = useState(empty())
  const [saving,   setSaving]   = useState(false)
  const [deleteId, setDeleteId] = useState(null)

  const set = (k) => (e) => setForm((p) => ({ ...p, [k]: k === 'placa' ? e.target.value.toUpperCase() : e.target.value }))

  const filtered = carros.filter((c) => {
    const term = search.toLowerCase()
    return !term || c.nome?.toLowerCase().includes(term) || c.placa?.toLowerCase().includes(term) || c.marca?.toLowerCase().includes(term)
  })

  const openCreate = () => { setForm(empty()); setModal('create') }
  const openEdit   = (c) => { setForm({ nome: c.nome ?? '', marca: c.marca ?? '', cor: c.cor ?? '', ano: c.ano ?? '', placa: c.placa ?? '', clienteId: c.clienteId ?? '' }); setModal(c.id) }

  const handleSave = async () => {
    if (!form.nome) { toast.error('Informe o modelo do veículo.'); return }
    if (!form.placa) { toast.error('A placa é obrigatória.'); return }
    // Valida placa duplicada
    const placaNorm = form.placa.replace(/[-\s]/g, '').toUpperCase()
    const duplicada = carros.find((c) =>
      c.id !== modal &&
      c.placa?.replace(/[-\s]/g, '').toUpperCase() === placaNorm
    )
    if (duplicada) {
      const dono = clientes.find((c) => c.id === duplicada.clienteId)
      toast.error(`Placa ${form.placa} já cadastrada${dono ? ` para ${dono.nome}` : ''}.`)
      return
    }
    setSaving(true)
    try {
      if (modal === 'create') {
        const id = await svc.createCarro(form)
        addCarro({ id, ...form })
        logger.activity('carro_criado', `Veículo "${form.nome}" (${form.placa}) cadastrado`)
        toast.success(`Veículo "${form.nome}" cadastrado!`)
      } else {
        await svc.updateCarro(modal, form)
        editCarro(modal, form)
        logger.activity('carro_editado', `Veículo "${form.nome}" atualizado`)
        toast.success('Veículo atualizado!')
      }
      setModal(null)
    } catch (err) { logger.error('erro_ao_salvar', 'Erro ao salvar veículo', { err: err?.message }); toast.error('Erro ao salvar veículo.')
    } finally { setSaving(false) }
  }

  const handleDelete = async () => {
    try {
      const nome = carros.find((c) => c.id === deleteId)?.nome ?? ''
      await svc.deleteCarro(deleteId)
      dropCarro(deleteId)
      logger.activity('carro_excluido', `Veículo "${nome}" excluído`)
      toast.success('Veículo removido.')
    } catch (err) { logger.error('erro_ao_excluir', 'Erro ao excluir veículo', { err: err?.message }); toast.error('Erro ao remover veículo.') }
  }

  const getCliente = (id) => clientes.find((c) => c.id === id)

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-brand-black">Veículos</h1>
          <p className="text-sm text-brand-gray-light">{carros.length} cadastrados</p>
        </div>
        <Button onClick={openCreate}><Plus size={16} /> Novo Veículo</Button>
      </div>

      <div className="relative">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-gray-light" />
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar por modelo, marca ou placa..." className="input-field pl-9" />
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon={Car} title="Nenhum veículo encontrado" action={<Button onClick={openCreate}><Plus size={16} /> Novo Veículo</Button>} />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {filtered.map((c) => {
            const dono = getCliente(c.clienteId)
            return (
              <div key={c.id} className="card p-4 flex items-start gap-3">
                <div className="w-10 h-10 bg-brand-yellow-light rounded-xl flex items-center justify-center shrink-0 mt-0.5">
                  <Car size={18} className="text-brand-yellow-dark" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-brand-black">{c.nome}</p>
                  <div className="flex flex-wrap gap-x-2 text-xs text-brand-gray-light mt-0.5">
                    {c.marca && <span>{c.marca}</span>}
                    {c.ano   && <span>{c.ano}</span>}
                    {c.cor   && <span>{c.cor}</span>}
                  </div>
                  {c.placa && <span className="inline-block mt-1 text-xs font-mono bg-brand-black text-brand-yellow px-2 py-0.5 rounded">{c.placa}</span>}
                  {dono    && <p className="text-xs text-brand-gray-light mt-1">{dono.nome}</p>}
                </div>
                <div className="flex gap-2 shrink-0">
                  <button onClick={() => openEdit(c)} className="p-2 rounded-lg hover:bg-brand-gray-border transition-colors text-brand-gray-light hover:text-brand-black"><Edit size={15} /></button>
                  <button onClick={() => setDeleteId(c.id)} className="p-2 rounded-lg hover:bg-red-50 transition-colors text-brand-gray-light hover:text-red-600"><Trash2 size={15} /></button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      <Modal open={!!modal} onClose={() => setModal(null)} title={modal === 'create' ? 'Novo Veículo' : 'Editar Veículo'}>
        <div className="flex flex-col gap-4">
          <Input label="Modelo *" value={form.nome}  onChange={set('nome')}  placeholder="Ex: Civic, Corolla..." />
          <div className="grid grid-cols-2 gap-3">
            <Input label="Marca" value={form.marca} onChange={set('marca')} placeholder="Honda..." />
            <Input label="Cor"   value={form.cor}   onChange={set('cor')}   placeholder="Branco..." />
            <Input label="Ano"   value={form.ano}   onChange={set('ano')}   placeholder="2020" />
            <Input label="Placa *" value={form.placa} onChange={set('placa')} placeholder="ABC-1234" />
          </div>
          <Select label="Proprietário" value={form.clienteId} onChange={set('clienteId')}>
            <option value="">Sem proprietário</option>
            {clientes.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
          </Select>
          <div className="flex gap-3 mt-2">
            <Button variant="secondary" className="flex-1 justify-center" onClick={() => setModal(null)}>Cancelar</Button>
            <Button className="flex-1 justify-center" loading={saving} onClick={handleSave}>Salvar</Button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog open={!!deleteId} onClose={() => setDeleteId(null)} onConfirm={handleDelete} title="Excluir veículo?" danger />
    </div>
  )
}
