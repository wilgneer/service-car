import React, { useState } from 'react'
import { Building2, Save } from 'lucide-react'
import { useApp } from '../contexts/AppContext'
import { useToast } from '../contexts/ToastContext'
import * as svc from '../firebase/services'
import Button from '../components/ui/Button'
import Input from '../components/ui/Input'

export default function Configuracoes() {
  const { configuracoes, updateConfiguracoes } = useApp()
  const toast = useToast()

  const [form,   setForm]   = useState(() => ({ ...configuracoes }))
  const [saving, setSaving] = useState(false)

  const set = (field) => (e) => setForm((p) => ({ ...p, [field]: e.target.value }))

  const handleSave = async (e) => {
    e.preventDefault()
    if (!form.nome?.trim()) { toast.error('Informe o nome da empresa.'); return }
    setSaving(true)
    try {
      await svc.saveConfiguracoes(form)
      updateConfiguracoes(form)
      toast.success('Configurações salvas!')
    } catch {
      toast.error('Erro ao salvar configurações.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="flex flex-col gap-5 max-w-lg">
      <div>
        <h1 className="text-2xl font-bold text-brand-black">Configurações</h1>
        <p className="text-sm text-brand-gray-light">Dados da empresa exibidos nos orçamentos impressos</p>
      </div>

      <form onSubmit={handleSave} className="flex flex-col gap-5">
        <div className="card p-5 flex flex-col gap-4">
          <div className="flex items-center gap-2 pb-1 border-b border-brand-gray-border">
            <Building2 size={17} className="text-brand-yellow" />
            <h2 className="font-semibold text-brand-black">Dados da Empresa</h2>
          </div>

          <Input
            label="Nome da empresa *"
            value={form.nome || ''}
            onChange={set('nome')}
            placeholder="Ex: Autocenter..."
          />
          <Input
            label="CNPJ"
            value={form.cnpj || ''}
            onChange={set('cnpj')}
            placeholder="00.000.000/0000-00"
          />
          <Input
            label="Endereço"
            value={form.endereco || ''}
            onChange={set('endereco')}
            placeholder="Rua, número, bairro"
          />
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="CEP"
              value={form.cep || ''}
              onChange={set('cep')}
              placeholder="00000-000"
            />
            <Input
              label="Telefone"
              value={form.telefone || ''}
              onChange={set('telefone')}
              placeholder="(00) 00000-0000"
            />
          </div>
        </div>

        <div className="bg-brand-yellow-light rounded-xl px-4 py-3 border border-brand-yellow">
          <p className="text-xs text-brand-yellow-dark font-medium">
            💡 Essas informações aparecem no cabeçalho dos orçamentos ao imprimir ou gerar PDF.
          </p>
        </div>

        <Button type="submit" loading={saving} className="self-end">
          <Save size={16} /> Salvar Configurações
        </Button>
      </form>
    </div>
  )
}
