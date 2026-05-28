import React, { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ChevronLeft, Edit, Trash2, CheckCircle, XCircle, Printer, Car, Lock, Wrench, DollarSign, Send, Link2, Copy, Shield } from 'lucide-react'
import { useApp } from '../contexts/AppContext'
import { useAuth } from '../contexts/AuthContext'
import { useToast } from '../contexts/ToastContext'
import { useLogger } from '../hooks/useLogger'
import * as svc from '../firebase/services'
import {
  formatCurrency, formatDate, formatDatetime, formatDateLocal, formatCnpj, formatCep,
  statusLabel, statusClass, calcTotals,
} from '../utils/helpers'
import Button from '../components/ui/Button'
import ConfirmDialog from '../components/ui/ConfirmDialog'
import Modal from '../components/ui/Modal'

export default function OrcamentoDetalhe() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { orcamentos, clientes, carros, fornecedores, configuracoes, editOrcamento, dropOrcamento } = useApp()
  const { isAdmin } = useAuth()
  const toast  = useToast()
  const logger = useLogger()

  const [confirm,       setConfirm]       = useState(null)
  const [loading,       setLoading]       = useState(false)
  const [deleteModal,   setDeleteModal]   = useState(false)
  const [deletePass,    setDeletePass]    = useState('')
  const [deletePassErr, setDeletePassErr] = useState('')
  const [linkModal,     setLinkModal]     = useState(false)
  const [sigLink,       setSigLink]       = useState('')
  const [copied,        setCopied]        = useState(false)
  const [sendingLink,   setSendingLink]   = useState(false)

  const orcamento = orcamentos.find((o) => o.id === id)
  const cliente   = clientes.find((c) => c.id === orcamento?.clienteId)
  const carro     = carros.find((c) => c.id === orcamento?.carroId)

  useEffect(() => {
    if (!orcamento && orcamentos.length > 0) navigate('/')
  }, [orcamento, orcamentos])

  if (!orcamento) return (
    <div className="flex items-center justify-center h-64">
      <div className="animate-spin w-8 h-8 border-4 border-brand-yellow border-t-transparent rounded-full" />
    </div>
  )

  const isConcluido = orcamento.status === 'concluido'
  const canEdit     = isAdmin || !isConcluido
  const t           = calcTotals(orcamento.itens, orcamento.extras)
  const markup      = orcamento.extras?.markup ?? 20
  const isMecanica  = orcamento.tipoServico === 'mecanica'

  const tipoLabel = orcamento.tipoServico === 'mecanica'
    ? 'Mecânica'
    : orcamento.tipoServico === 'funilaria'
    ? 'Funilaria & Estética'
    : null

  const changeStatus = async (status, extra, successMsg, logAction) => {
    setLoading(true)
    try {
      await svc.atualizarStatus(id, status, extra)
      editOrcamento(id, { status, ...extra })
      logger.activity(logAction, `Orçamento #${String(orcamento.numero).padStart(4,'0')} ${successMsg?.toLowerCase() ?? status}`)
      if (successMsg) toast.success(successMsg)
    } catch (err) {
      logger.error('erro_status', `Erro ao alterar status para ${status}`, { err: err?.message, orcamentoId: id })
      toast.error('Ocorreu um erro. Tente novamente.')
    } finally { setLoading(false) }
  }

  const handleAprovar  = () => changeStatus('aprovado',  { aprovadoEm:  new Date().toISOString() }, 'Orçamento aprovado!',  'orcamento_aprovado')
  const handleReprovar = () => changeStatus('reprovado', { reprovadoEm: new Date().toISOString() }, 'Orçamento reprovado.', 'orcamento_reprovado')
  const handleConcluir = () => changeStatus('concluido', { concluidoEm: new Date().toISOString() }, 'Orçamento concluído!', 'orcamento_concluido')
  const handlePagar    = () => changeStatus('pago',      { pagoEm:      new Date().toISOString() }, 'Pagamento registrado!','orcamento_pago')

  const handleEnviarAssinatura = async () => {
    setSendingLink(true)
    try {
      const token = await svc.enviarParaAssinatura(id, orcamento)
      editOrcamento(id, { status: 'aguardando_assinatura', assinaturaToken: token })
      logger.activity('assinatura_enviada', `Link de assinatura gerado para orçamento #${String(orcamento.numero).padStart(4,'0')}`)
      const link = `${window.location.origin}/assinar/${token}`
      setSigLink(link)
      setLinkModal(true)
      toast.success('Link de assinatura gerado!')
    } catch (err) {
      logger.error('erro_assinatura', 'Erro ao gerar link de assinatura', { err: err?.message })
      toast.error('Erro ao gerar link. Tente novamente.')
    } finally { setSendingLink(false) }
  }

  const handleMostrarLink = () => {
    const token = orcamento.assinaturaToken
    if (token) {
      setSigLink(`${window.location.origin}/assinar/${token}`)
      setLinkModal(true)
    }
  }

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(sigLink)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      toast.error('Não foi possível copiar. Copie manualmente.')
    }
  }

  const handlePrint = () => {
    const area = document.getElementById('print-area')
    if (!area) { window.print(); return }

    // Coleta todos os estilos carregados na página
    const styles = Array.from(document.querySelectorAll('link[rel="stylesheet"], style'))
      .map((el) => {
        if (el.tagName === 'STYLE') return `<style>${el.textContent}</style>`
        return `<link rel="stylesheet" href="${el.href}">`
      })
      .join('\n')

    const win = window.open('', '_blank', 'width=900,height=700')
    if (!win) { window.print(); return }

    win.document.write(`<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Orçamento</title>
  ${styles}
  <style>
    @page { margin: 14mm; size: A4; }
    body { background: white !important; font-family: 'Poppins', sans-serif; }
    aside, .mobile-topbar, .mobile-bottom-nav, .no-print { display: none !important; }
    .card { box-shadow: none !important; border: 1px solid #e5e7eb !important; }
    .print-price { display: block !important; }
    .screen-price { display: none !important; }
  </style>
</head>
<body>${area.innerHTML}</body>
</html>`)
    win.document.close()
    win.focus()
    // Aguarda fontes/estilos carregarem antes de imprimir
    win.onload = () => {
      setTimeout(() => {
        win.print()
        win.close()
      }, 400)
    }
    // Fallback caso onload não dispare (conteúdo já estava em cache)
    setTimeout(() => {
      if (!win.closed) { win.print(); win.close() }
    }, 1200)
  }

  const openDelete = () => { setDeletePass(''); setDeletePassErr(''); setDeleteModal(true) }

  const handleDelete = async () => {
    if (deletePass !== '#admin') { setDeletePassErr('Senha incorreta.'); return }
    setDeleteModal(false)
    setLoading(true)
    try {
      await svc.remove('orcamentos', id)
      dropOrcamento(id)
      logger.activity('orcamento_excluido', `Orçamento #${String(orcamento.numero).padStart(4,'0')} excluído`)
      navigate('/')
    } catch (err) {
      logger.error('erro_ao_excluir', 'Erro ao excluir orçamento', { err: err?.message, orcamentoId: id })
      toast.error('Ocorreu um erro. Tente novamente.')
    } finally { setLoading(false) }
  }

  return (
    <div id="print-area" className="flex flex-col gap-5 max-w-2xl">

      {/* ── Cabeçalho de impressão (só no PDF/impressão) ──────────────────────── */}
      <div className="hidden print:block mb-4">
        <div className="flex justify-between items-start gap-4 pb-4 border-b-2 border-brand-black">
          {/* Empresa */}
          <div>
            <p className="text-lg font-bold text-brand-black">{configuracoes?.nome ?? ''}</p>
            {configuracoes?.cnpj     && <p className="text-xs text-gray-600">CNPJ: {formatCnpj(configuracoes.cnpj)}</p>}
            {configuracoes?.endereco && (
              <p className="text-xs text-gray-600">
                {configuracoes.endereco}
                {configuracoes?.cep ? ` — CEP ${formatCep(configuracoes.cep)}` : ''}
              </p>
            )}
            {configuracoes?.telefone && <p className="text-xs text-gray-600">Tel: {configuracoes.telefone}</p>}
          </div>
          {/* Número e data */}
          <div className="text-right shrink-0">
            <p className="text-2xl font-bold text-brand-black">
              Orçamento #{String(orcamento.numero).padStart(4, '0')}
            </p>
            <p className="text-xs text-gray-500">{formatDatetime(orcamento.createdAt)}</p>
            {tipoLabel && <p className="text-xs text-gray-500 mt-0.5">{tipoLabel}</p>}
          </div>
        </div>
      </div>

      {/* ── Header tela ───────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-3 no-print">
        <button onClick={() => navigate('/')} className="p-2 rounded-lg hover:bg-brand-gray-border transition-colors">
          <ChevronLeft size={20} />
        </button>
        <div className="flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-xl font-bold text-brand-black">
              Orçamento #{String(orcamento.numero).padStart(4, '0')}
            </h1>
            <span className={statusClass(orcamento.status)}>{statusLabel(orcamento.status)}</span>
            {tipoLabel && (
              <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-brand-yellow-light text-brand-yellow-dark">
                {tipoLabel}
              </span>
            )}
          </div>
          <p className="text-sm text-brand-gray-light">{formatDatetime(orcamento.createdAt)}</p>
        </div>
      </div>

      {/* ── Ações — ocultas na impressão ─────────────────────────────────────── */}
      <div className="flex flex-wrap gap-2 no-print">
        {['rascunho','em_analise'].includes(orcamento.status) && (
          <>
            <Button onClick={handleEnviarAssinatura} variant="primary" size="sm" loading={sendingLink}>
              <Send size={15} /> Enviar para Assinatura
            </Button>
            {isAdmin && (
              <Button onClick={() => setConfirm('aprovar')} variant="secondary" size="sm">
                <CheckCircle size={15} /> Aprovar direto
              </Button>
            )}
            <Button onClick={() => setConfirm('reprovar')} variant="secondary" size="sm"><XCircle size={15} /> Reprovar</Button>
          </>
        )}
        {orcamento.status === 'aguardando_assinatura' && (
          <>
            <Button onClick={handleMostrarLink} variant="secondary" size="sm">
              <Link2 size={15} /> Ver Link
            </Button>
            {isAdmin && (
              <Button onClick={() => setConfirm('aprovar')} variant="secondary" size="sm">
                <CheckCircle size={15} /> Aprovar direto
              </Button>
            )}
            <Button onClick={() => setConfirm('reprovar')} variant="secondary" size="sm"><XCircle size={15} /> Reprovar</Button>
          </>
        )}
        {orcamento.status === 'aprovado' && (
          <>
            <Button onClick={() => setConfirm('pagar')} variant="primary" size="sm">
              <DollarSign size={15} /> Pago
            </Button>
            <Button onClick={() => setConfirm('concluir')} variant="secondary" size="sm">
              <CheckCircle size={15} /> Concluir
            </Button>
          </>
        )}
        {canEdit && (
          <Button onClick={() => navigate(`/orcamentos/${id}/editar`)} variant="secondary" size="sm">
            <Edit size={15} /> Editar
          </Button>
        )}
        {canEdit && (
          <Button onClick={openDelete} variant="danger" size="sm">
            <Trash2 size={15} /> Excluir
          </Button>
        )}
        <Button onClick={handlePrint} variant="secondary" size="sm">
          <Printer size={15} /> Imprimir
        </Button>
      </div>

      {/* ── Cliente / Carro ───────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="card p-4">
          <p className="text-xs text-brand-gray-light uppercase tracking-wide font-medium mb-2">Cliente</p>
          <p className="font-semibold text-brand-black">{cliente?.nome ?? orcamento.clienteNome ?? '-'}</p>
          {cliente?.celular && <p className="text-sm text-brand-gray-light">{cliente.celular}</p>}
        </div>
        <div className="card p-4">
          <p className="text-xs text-brand-gray-light uppercase tracking-wide font-medium mb-2">Veículo</p>
          <div className="flex items-center gap-2">
            <Car size={16} className="text-brand-yellow-dark" />
            <p className="font-semibold text-brand-black">{carro?.nome ?? orcamento.veiculoModelo ?? '-'}</p>
          </div>
          {carro && (
            <div className="text-sm text-brand-gray-light mt-1 flex flex-wrap gap-x-3 gap-y-0.5">
              {carro.marca && <span>{carro.marca}</span>}
              {carro.ano   && <span>{carro.ano}</span>}
              {carro.cor   && <span>{carro.cor}</span>}
              {(carro.placa || orcamento.veiculoPlaca) && (
                <span className="font-medium text-brand-black">{carro.placa ?? orcamento.veiculoPlaca}</span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── Troca de óleo (mecânica) — aparece em tela E impressão ───────────── */}
      {isMecanica && orcamento.mecanica && (
        <div className="card p-4">
          <div className="flex items-center gap-2 mb-3">
            <Wrench size={14} className="text-brand-yellow-dark" />
            <p className="text-xs text-brand-gray-light uppercase tracking-wide font-medium">Troca de Óleo</p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {(orcamento.mecanica.ultimaTrocaData || orcamento.mecanica.ultimaTrocaKm) && (
              <div>
                <p className="text-xs text-brand-gray-light mb-0.5">Última troca</p>
                <p className="text-sm font-medium text-brand-black">
                  {orcamento.mecanica.ultimaTrocaData
                    ? formatDateLocal(orcamento.mecanica.ultimaTrocaData)
                    : ''}
                  {orcamento.mecanica.ultimaTrocaData && orcamento.mecanica.ultimaTrocaKm ? ' · ' : ''}
                  {orcamento.mecanica.ultimaTrocaKm
                    ? `${Number(orcamento.mecanica.ultimaTrocaKm).toLocaleString('pt-BR')} km`
                    : ''}
                </p>
              </div>
            )}
            {(orcamento.mecanica.proximaTrocaData || orcamento.mecanica.proximaTrocaKm) && (
              <div>
                <p className="text-xs text-brand-gray-light mb-0.5">Próxima troca</p>
                <p className="text-sm font-bold text-brand-black">
                  {orcamento.mecanica.proximaTrocaData
                    ? formatDateLocal(orcamento.mecanica.proximaTrocaData)
                    : ''}
                  {orcamento.mecanica.proximaTrocaData && orcamento.mecanica.proximaTrocaKm ? ' · ' : ''}
                  {orcamento.mecanica.proximaTrocaKm
                    ? `${Number(orcamento.mecanica.proximaTrocaKm).toLocaleString('pt-BR')} km`
                    : ''}
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Peças ─────────────────────────────────────────────────────────────── */}
      {orcamento.itens?.pecas?.length > 0 && (
        <div className="card p-4">
          <p className="text-xs text-brand-gray-light uppercase tracking-wide font-medium mb-3">Peças / Produtos</p>
          <div className="flex flex-col divide-y divide-brand-gray-border">
            {orcamento.itens.pecas.map((item, i) => (
              <PecaLine key={i} item={item} markup={markup} fornecedores={fornecedores} />
            ))}
          </div>
          {/* Detalhes de markup — oculto na impressão */}
          <div className="mt-3 pt-3 border-t border-brand-gray-border flex flex-col gap-1 no-print">
            <div className="flex justify-between text-xs text-brand-gray-light">
              <span>Custo das peças</span><span>{formatCurrency(t.totalPecasSemMarkup)}</span>
            </div>
            <div className="flex justify-between text-xs text-brand-gray-light">
              <span>Acréscimo {markup}%</span><span>+ {formatCurrency(t.totalMarkup)}</span>
            </div>
            <div className="flex justify-between text-sm font-semibold text-brand-black">
              <span>Total peças</span><span>{formatCurrency(t.totalPecas)}</span>
            </div>
          </div>
          {/* Total peças apenas na impressão */}
          <div className="mt-3 pt-3 border-t border-brand-gray-border hidden print:flex justify-between text-sm font-semibold text-brand-black">
            <span>Total peças</span><span>{formatCurrency(t.totalPecas)}</span>
          </div>
        </div>
      )}

      {/* ── Serviços ──────────────────────────────────────────────────────────── */}
      {orcamento.itens?.servicos?.length > 0 && (
        <div className="card p-4">
          <p className="text-xs text-brand-gray-light uppercase tracking-wide font-medium mb-3">Serviços</p>
          <div className="flex flex-col divide-y divide-brand-gray-border">
            {orcamento.itens.servicos.map((item, i) => <ItemLine key={i} item={item} />)}
          </div>
          <div className="flex justify-between text-sm font-semibold text-brand-black mt-3 pt-3 border-t border-brand-gray-border">
            <span>Total serviços</span><span>{formatCurrency(t.totalMaoDeObra)}</span>
          </div>
        </div>
      )}

      {/* ── Assinatura digital ────────────────────────────────────────────────── */}
      {orcamento.status === 'aguardando_assinatura' && (
        <div className="card p-4 border-purple-200 bg-purple-50/50">
          <div className="flex items-center gap-2 mb-2">
            <Shield size={14} className="text-purple-500" />
            <p className="text-xs text-purple-700 uppercase tracking-wide font-medium">Aguardando Assinatura do Cliente</p>
          </div>
          <p className="text-sm text-purple-600">
            Um link de aprovação foi enviado. O orçamento só será aprovado após o cliente assinar.
          </p>
          <button
            onClick={handleMostrarLink}
            className="mt-3 flex items-center gap-1.5 text-sm font-medium text-purple-700 hover:text-purple-900 transition-colors"
          >
            <Link2 size={14} /> Ver / copiar link de assinatura
          </button>
        </div>
      )}

      {orcamento.assinatura && (
        <div className="card p-4 border-green-200 bg-green-50/50">
          <div className="flex items-center gap-2 mb-2">
            <Shield size={14} className="text-green-600" />
            <p className="text-xs text-green-700 uppercase tracking-wide font-medium">Assinatura Digital Registrada</p>
          </div>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <p className="text-xs text-brand-gray-light mb-0.5">Assinado por</p>
              <p className="font-semibold text-brand-black">{orcamento.assinatura.nomeConfirmado}</p>
            </div>
            <div>
              <p className="text-xs text-brand-gray-light mb-0.5">Data</p>
              <p className="font-semibold text-brand-black">
                {orcamento.assinatura.assinadoEm
                  ? new Date(orcamento.assinatura.assinadoEm).toLocaleString('pt-BR')
                  : formatDatetime(orcamento.aprovadoEm)}
              </p>
            </div>
            <div>
              <p className="text-xs text-brand-gray-light mb-0.5">IP (mascarado)</p>
              <p className="font-mono text-xs text-brand-black">{orcamento.assinatura.ipMascarado}</p>
            </div>
          </div>
        </div>
      )}

      {/* ── Total ─────────────────────────────────────────────────────────────── */}
      <div className="card p-4 flex flex-col gap-2">
        {t.rastreamento > 0 && (
          <div className="flex justify-between text-sm text-brand-gray-light">
            <span>Rastreamento</span><span>{formatCurrency(t.rastreamento)}</span>
          </div>
        )}
        <div className="flex items-center justify-between border-t border-brand-gray-border pt-2">
          <p className="font-semibold text-brand-black">Total Geral</p>
          <p className="text-2xl font-bold text-brand-black">{formatCurrency(t.totalGeral)}</p>
        </div>
        {isConcluido && orcamento.concluidoEm && (
          <p className="text-xs text-green-600">Concluído em {formatDatetime(orcamento.concluidoEm)}</p>
        )}
      </div>

      {/* ── Modal senha para excluir ───────────────────────────────────────────── */}
      <Modal open={deleteModal} onClose={() => setDeleteModal(false)} title="Confirmar exclusão">
        <div className="flex flex-col gap-4">
          <p className="text-sm text-brand-gray-light">
            Esta ação não pode ser desfeita. Digite a senha de administrador para confirmar.
          </p>
          <div className="relative">
            <Lock size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-gray-light" />
            <input
              type="password"
              value={deletePass}
              onChange={(e) => { setDeletePass(e.target.value); setDeletePassErr('') }}
              onKeyDown={(e) => e.key === 'Enter' && handleDelete()}
              placeholder="Senha de administrador"
              className="input-field pl-9"
              autoFocus
            />
          </div>
          {deletePassErr && <p className="text-sm text-red-500">{deletePassErr}</p>}
          <div className="flex gap-3">
            <Button variant="secondary" className="flex-1 justify-center" onClick={() => setDeleteModal(false)}>
              Cancelar
            </Button>
            <Button variant="danger" className="flex-1 justify-center" onClick={handleDelete} loading={loading}>
              Excluir
            </Button>
          </div>
        </div>
      </Modal>

      {/* ── Modal link de assinatura ──────────────────────────────────────────── */}
      <Modal open={linkModal} onClose={() => setLinkModal(false)} title="Link de assinatura">
        <div className="flex flex-col gap-4">
          <p className="text-sm text-brand-gray-light leading-relaxed">
            Compartilhe este link com o cliente. Ele poderá revisar o orçamento e assinar para aprovar.
            O link expira em <strong>7 dias</strong>.
          </p>
          <div className="flex items-center gap-2 bg-gray-50 rounded-xl px-3 py-3 border border-gray-200">
            <p className="flex-1 text-xs font-mono text-brand-black break-all select-all">{sigLink}</p>
            <button
              onClick={handleCopyLink}
              className={`shrink-0 flex items-center gap-1 text-xs font-semibold px-3 py-1.5 rounded-lg transition-all ${
                copied ? 'bg-green-100 text-green-700' : 'bg-brand-yellow text-brand-black hover:bg-yellow-400'
              }`}
            >
              {copied ? <CheckCircle size={13} /> : <Copy size={13} />}
              {copied ? 'Copiado!' : 'Copiar'}
            </button>
          </div>
          <div className="flex items-start gap-2 text-xs text-gray-400">
            <Shield size={12} className="shrink-0 mt-0.5" />
            <span>O IP do cliente é mascarado automaticamente. Apenas os 2 primeiros grupos são registrados.</span>
          </div>
          <Button variant="secondary" className="justify-center" onClick={() => setLinkModal(false)}>Fechar</Button>
        </div>
      </Modal>

      <ConfirmDialog open={confirm === 'aprovar'}  onClose={() => setConfirm(null)} onConfirm={handleAprovar}  title="Aprovar orçamento?"   message="O orçamento será marcado como aprovado." />
      <ConfirmDialog open={confirm === 'reprovar'} onClose={() => setConfirm(null)} onConfirm={handleReprovar} title="Reprovar orçamento?"  message="O orçamento será marcado como reprovado." danger />
      <ConfirmDialog open={confirm === 'concluir'} onClose={() => setConfirm(null)} onConfirm={handleConcluir} title="Concluir orçamento?"  message="O orçamento será marcado como concluído." />
      <ConfirmDialog open={confirm === 'pagar'}    onClose={() => setConfirm(null)} onConfirm={handlePagar}    title="Registrar pagamento?" message="Isso marcará o orçamento como PAGO e registrará como entrada no financeiro." />
    </div>
  )
}

// ── Sub-componentes ──────────────────────────────────────────────────────────

function ItemLine({ item }) {
  const qty   = Number(item.quantidade) || 1
  const total = (Number(item.valor) || 0) * qty
  return (
    <div className="flex items-center justify-between py-2.5 gap-2">
      <div className="flex-1 min-w-0">
        <p className="text-sm text-brand-black truncate">{item.descricao || '-'}</p>
        {qty > 1 && <p className="text-xs text-brand-gray-light">{qty}x {formatCurrency(item.valor)}</p>}
      </div>
      <p className="text-sm font-medium text-brand-black whitespace-nowrap">{formatCurrency(total)}</p>
    </div>
  )
}

function PecaLine({ item, markup = 0, fornecedores = [] }) {
  const qty       = Number(item.quantidade) || 1
  const custo     = (Number(item.valor) || 0) * qty
  const comMarkup = custo * (1 + markup / 100)

  const fornecedor = item.fornecedorId
    ? fornecedores.find((f) => f.id === item.fornecedorId)
    : null

  return (
    <div className="py-2.5 gap-1 flex flex-col">
      <div className="flex items-center justify-between gap-2">
        <div className="flex-1 min-w-0">
          <p className="text-sm text-brand-black truncate">{item.descricao || '-'}</p>
          {item.marca && <p className="text-xs text-brand-gray-light">{item.marca}</p>}
          {qty > 1    && <p className="text-xs text-brand-gray-light">{qty}x</p>}
        </div>
        {/* Tela: custo */}
        <p className="screen-price text-sm font-medium text-brand-black whitespace-nowrap">{formatCurrency(custo)}</p>
        {/* Impressão: preço com acréscimo */}
        <p className="print-price hidden text-sm font-medium text-brand-black whitespace-nowrap">{formatCurrency(comMarkup)}</p>
      </div>
      {/* Campos admin — só na tela, nunca no PDF */}
      {(fornecedor || item.dataCompra) && (
        <div className="no-print flex items-center gap-3 mt-0.5">
          {fornecedor  && <span className="text-[11px] text-brand-gray-light bg-brand-gray-border rounded px-1.5 py-0.5">{fornecedor.nome}</span>}
          {item.dataCompra && <span className="text-[11px] text-brand-gray-light">Compra: {formatDateLocal(item.dataCompra)}</span>}
        </div>
      )}
    </div>
  )
}
