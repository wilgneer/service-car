import React, { useState } from 'react'
import { Building2, Plus, Edit, Trash2, Phone, MapPin } from 'lucide-react'
import { useApp } from '../contexts/AppContext'
import { useToast } from '../contexts/ToastContext'
import { useLogger } from '../hooks/useLogger'
import * as svc from '../firebase/services'
import Button from '../components/ui/Button'
import Input from '../components/ui/Input'
import Modal from '../components/ui/Modal'
import ConfirmDialog from '../components/ui/ConfirmDialog'

const emptyForm = () => ({ nome: '', cidade: '', telefone: '', cnpj: '' })

export default function Fornecedores() {
  const { fornecedores, addFornecedor, editFornecedor, dropFornecedor } = useApp()
  const toast  = useToast()
  const logger = useLogger()

  const [modal,   setModal]   = useState(null) // null | { mode: 'new'|'edit', item? }
  const [form,    setForm]    = useState(emptyForm())
  const [saving,  setSaving]  = useState(false)
  const [confirm, setConfirm] = useState(null) // item a excluir

  const openNew  = () => { setForm(emptyForm()); setModal({ mode: 'new' }) }
  const openEdit = (item) => {
    setForm({ nome: item.nome || '', cidade: item.cidade || '', telefone: item.telefone || '', cnpj: item.cnpj || '' })
    setModal({ mode: 'edit', item })
  }
  const closeModal = () => setModal(null)

  const handleSave = async () => {
    if (!form.nome.trim()) { toast.error('Informe o nome do fornecedor.'); return }
    setSaving(true)
    try {
      if (modal.mode === 'new') {
        const id = await svc.createFornecedor(form)
        addFornecedor({ id, ...form })
        logger.activity('fornecedor_criado', `Fornecedor "${form.nome}" criado`)
        toast.success('Fornecedor cadastrado!')
      } else {
        await svc.updateFornecedor(modal.item.id, form)
        editFornecedor(modal.item.id, form)
        logger.activity('fornecedor_editado', `Fornecedor "${form.nome}" atualizado`)
        toast.success('Fornecedor atualizado!')
      }
      closeModal()
    } catch {
      toast.error('Erro ao salvar fornecedor.')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (item) => {
    try {
      await svc.deleteFornecedor(item.id)
      dropFornecedor(item.id)
      logger.activity('fornecedor_excluido', `Fornecedor "${item.nome}" excluído`)
      toast.success('Fornecedor removido.')
    } catch {
      toast.error('Erro ao excluir.')
    }
    setConfirm(null)
  }

  const set = (field) => (e) => setForm((p) => ({ ...p, [field]: e.target.value }))

  return (
    <div className="flex flex-col gap-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-brand-black">Fornecedores</h1>
          <p className="text-sm text-brand-gray-light">Lojas e fornecedores de peças</p>
        </div>
        <Button onClick={openNew}><Plus size={16} /> Novo</Button>
      </div>

      {/* Lista */}
      {fornecedores.length === 0 ? (
        <div className="card p-10 flex flex-col items-center gap-3 text-center">
          <Building2 size={40} className="text-brand-gray-border" />
          <p className="text-brand-gray-light">Nenhum fornecedor cadastrado ainda.</p>
          <Button onClick={openNew} variant="secondary"><Plus size={15} /> Cadastrar fornecedor</Button>
        </div>
      ) : (
        <div className="card divide-y divide-brand-gray-border">
          {fornecedores.map((item) => (
            <div key={item.id} className="flex items-center justify-between p-4 gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <Building2 size={15} className="text-brand-yellow shrink-0" />
                  <p className="font-semibold text-brand-black truncate">{item.nome}</p>
                </div>
                <div className="flex flex-wrap gap-x-4 gap-y-0.5 mt-0.5 ml-[23px]">
                  {item.cidade    && <p className="text-xs text-brand-gray-light flex items-center gap-1"><MapPin size={10} />{item.cidade}</p>}
                  {item.telefone  && <p className="text-xs text-brand-gray-light flex items-center gap-1"><Phone size={10} />{item.telefone}</p>}
                  {item.cnpj      && <p className="text-xs text-brand-gray-light">CNPJ: {item.cnpj}</p>}
                </div>
              </div>
              <div className="flex gap-1 shrink-0">
                <button onClick={() => openEdit(item)} className="p-2 text-brand-gray-light hover:text-brand-black hover:bg-brand-gray-border rounded-lg transition-colors" title="Editar">
                  <Edit size={15} />
                </button>
                <button onClick={() => setConfirm(item)} className="p-2 text-brand-gray-light hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors" title="Excluir">
                  <Trash2 size={15} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal criar/editar */}
      <Modal open={!!modal} onClose={closeModal} title={modal?.mode === 'new' ? 'Novo Fornecedor' : 'Editar Fornecedor'}>
        <div className="flex flex-col gap-4">
          <Input label="Nome *" value={form.nome} onChange={set('nome')} placeholder="Nome da loja / fornecedor" autoFocus />
          <div className="grid grid-cols-2 gap-3">
            <Input label="Cidade"   value={form.cidade}   onChange={set('cidade')}   placeholder="Cidade" />
            <Input label="Telefone" value={form.telefone} onChange={set('telefone')} placeholder="(00) 00000-0000" />
          </div>
          <Input label="CNPJ" value={form.cnpj} onChange={set('cnpj')} placeholder="XX.XXX.XXX/XXXX-XX" />
          <div className="flex gap-3 mt-2">
            <Button variant="secondary" className="flex-1 justify-center" onClick={closeModal}>Cancelar</Button>
            <Button className="flex-1 justify-center" loading={saving} onClick={handleSave}>Salvar</Button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        open={!!confirm}
        onClose={() => setConfirm(null)}
        onConfirm={() => handleDelete(confirm)}
        title="Excluir fornecedor?"
        message={`Tem certeza que deseja excluir "${confirm?.nome}"? Esta ação não pode ser desfeita.`}
        danger
      />
    </div>
  )
}
