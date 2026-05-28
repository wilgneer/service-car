import React, { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { CheckCircle, AlertCircle, Loader, FileText, Car, Wrench, Package, Shield } from 'lucide-react'
import * as svc from '../firebase/services'
import { formatCurrency, formatDatetime } from '../utils/helpers'

// ── Mascara IP: mantém apenas os 2 primeiros octetos ──────────────────────────
const mascararIp = (ip) => {
  if (!ip) return 'x.x.x.x'
  const parts = ip.split('.')
  if (parts.length === 4) return `${parts[0]}.${parts[1]}.x.x`
  // IPv6 — mantém só os 2 primeiros blocos
  const v6 = ip.split(':')
  if (v6.length > 2) return `${v6[0]}:${v6[1]}:x:x:x:x:x:x`
  return 'x.x.x.x'
}

// ── Busca o IP público do cliente ─────────────────────────────────────────────
const getIpPublico = async () => {
  try {
    const res = await fetch('https://api.ipify.org?format=json', { signal: AbortSignal.timeout(4000) })
    const json = await res.json()
    return mascararIp(json.ip)
  } catch {
    return 'x.x.x.x'
  }
}

export default function AssinarOrcamento() {
  const { token } = useParams()

  const [fase, setFase]           = useState('carregando') // carregando | formulario | sucesso | erro | expirado | jaAssinado
  const [assinatura, setAssinatura] = useState(null)
  const [erroMsg, setErroMsg]     = useState('')

  const [nome,     setNome]     = useState('')
  const [telefone, setTelefone] = useState('')
  const [aceito,   setAceito]   = useState(false)
  const [saving,   setSaving]   = useState(false)
  const [nomeErr,  setNomeErr]  = useState('')
  const [telErr,   setTelErr]   = useState('')

  // Carrega o documento de assinatura pelo token
  useEffect(() => {
    if (!token) { setFase('erro'); setErroMsg('Link inválido.'); return }
    svc.getAssinaturaByToken(token)
      .then((doc) => {
        if (!doc) { setFase('erro'); setErroMsg('Link não encontrado. Verifique se o endereço está correto.'); return }
        const expira = doc.expiresAt?.toDate ? doc.expiresAt.toDate() : new Date(doc.expiresAt)
        if (new Date() > expira) { setFase('expirado'); return }
        if (doc.status === 'assinado') { setAssinatura(doc); setFase('jaAssinado'); return }
        setAssinatura(doc)
        setFase('formulario')
      })
      .catch(() => { setFase('erro'); setErroMsg('Não foi possível carregar o orçamento. Tente novamente.') })
  }, [token])

  const handleAssinar = async (e) => {
    e.preventDefault()
    let ok = true
    if (!nome.trim())         { setNomeErr('Informe seu nome completo.'); ok = false }
    else                       { setNomeErr('') }
    const tel = telefone.replace(/\D/g, '')
    if (tel.length < 4)       { setTelErr('Informe os últimos 4 dígitos do seu celular.'); ok = false }
    else                       { setTelErr('') }
    if (!aceito) { ok = false }
    if (!ok) return

    setSaving(true)
    try {
      const ipMascarado = await getIpPublico()
      const userAgent   = navigator.userAgent

      await svc.assinarOrcamento(token, {
        nomeConfirmado:   nome.trim(),
        telefoneUltimos4: tel.slice(-4),
        ipMascarado,
        userAgent,
      })
      setFase('sucesso')
    } catch (err) {
      setErroMsg(err.message ?? 'Erro ao registrar assinatura. Tente novamente.')
      setFase('erro')
    } finally { setSaving(false) }
  }

  const snap = assinatura?.snapshot

  // ── Estados de tela ───────────────────────────────────────────────────────────

  if (fase === 'carregando') return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="flex flex-col items-center gap-3 text-gray-500">
        <Loader size={28} className="animate-spin text-brand-yellow" />
        <p className="text-sm">Carregando orçamento...</p>
      </div>
    </div>
  )

  if (fase === 'expirado') return (
    <Tela icon={<AlertCircle size={40} className="text-orange-400" />} cor="orange"
      titulo="Link expirado"
      msg="O prazo para assinar este orçamento expirou. Entre em contato com a oficina para receber um novo link." />
  )

  if (fase === 'jaAssinado') return (
    <Tela icon={<CheckCircle size={40} className="text-green-500" />} cor="green"
      titulo="Orçamento já assinado"
      msg={`Este orçamento já foi aprovado${assinatura?.nomeConfirmado ? ` por ${assinatura.nomeConfirmado}` : ''}.`} />
  )

  if (fase === 'erro') return (
    <Tela icon={<AlertCircle size={40} className="text-red-400" />} cor="red"
      titulo="Não foi possível carregar"
      msg={erroMsg || 'Verifique o link e tente novamente.'} />
  )

  if (fase === 'sucesso') return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 max-w-md w-full text-center">
        <div className="w-16 h-16 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-5">
          <CheckCircle size={32} className="text-green-500" />
        </div>
        <h1 className="text-xl font-bold text-gray-900 mb-2">Orçamento aprovado!</h1>
        <p className="text-sm text-gray-500 leading-relaxed mb-6">
          Sua assinatura foi registrada com sucesso. A oficina foi notificada e entrará em contato em breve.
        </p>
        {snap && (
          <div className="bg-gray-50 rounded-xl p-4 text-left text-sm mb-6">
            <p className="font-semibold text-gray-700">Orçamento #{String(snap.numero).padStart(4, '0')}</p>
            <p className="text-gray-500">{snap.veiculoModelo} · {snap.veiculoPlaca}</p>
            <p className="text-lg font-bold text-gray-900 mt-2">{formatCurrency(snap.totalGeral)}</p>
          </div>
        )}
        <div className="flex items-center gap-2 text-xs text-gray-400 justify-center">
          <Shield size={12} />
          <span>Assinatura registrada com segurança · IP mascarado</span>
        </div>
      </div>
    </div>
  )

  // ── Formulário ────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-xl mx-auto">

        {/* Header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center gap-2 bg-brand-yellow text-brand-black font-bold text-sm px-4 py-1.5 rounded-full mb-4">
            <FileText size={14} /> Orçamento #{String(snap?.numero ?? 0).padStart(4, '0')}
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Aprovação de Orçamento</h1>
          <p className="text-sm text-gray-500 mt-1">Revise os valores abaixo e assine para aprovar</p>
        </div>

        {/* Card do orçamento */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 mb-5">

          {/* Cliente / Veículo */}
          <div className="grid grid-cols-2 gap-3 mb-4">
            <div className="bg-gray-50 rounded-xl p-3">
              <p className="text-xs text-gray-400 uppercase tracking-wide font-medium mb-1">Cliente</p>
              <p className="font-semibold text-gray-900 text-sm">{snap?.clienteNome || '-'}</p>
            </div>
            <div className="bg-gray-50 rounded-xl p-3">
              <p className="text-xs text-gray-400 uppercase tracking-wide font-medium mb-1">Veículo</p>
              <p className="font-semibold text-gray-900 text-sm">{snap?.veiculoModelo || '-'}</p>
              <p className="text-xs text-gray-500">{snap?.veiculoPlaca} · {snap?.veiculoAno}</p>
            </div>
          </div>

          {/* Serviços */}
          {(snap?.itens?.servicos ?? []).filter(s => s.descricao || s.valor).length > 0 && (
            <div className="mb-4">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">
                <Wrench size={12} /> Serviços
              </div>
              {snap.itens.servicos.filter(s => s.descricao || s.valor).map((s, i) => (
                <div key={i} className="flex justify-between items-center py-1.5 border-b border-gray-50 last:border-0">
                  <span className="text-sm text-gray-700">{s.descricao || '—'}{s.quantidade > 1 ? ` ×${s.quantidade}` : ''}</span>
                  <span className="text-sm font-semibold text-gray-900">{formatCurrency((Number(s.valor) || 0) * (Number(s.quantidade) || 1))}</span>
                </div>
              ))}
            </div>
          )}

          {/* Peças */}
          {(snap?.itens?.pecas ?? []).filter(p => p.descricao || p.valor).length > 0 && (
            <div className="mb-4">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">
                <Package size={12} /> Peças / Produtos
              </div>
              {snap.itens.pecas.filter(p => p.descricao || p.valor).map((p, i) => {
                const custo = (Number(p.valor) || 0) * (Number(p.quantidade) || 1)
                const mk    = (snap.extras?.markup ?? 20) / 100
                const total = custo * (1 + mk)
                return (
                  <div key={i} className="flex justify-between items-center py-1.5 border-b border-gray-50 last:border-0">
                    <span className="text-sm text-gray-700">
                      {[p.marca, p.descricao].filter(Boolean).join(' — ') || '—'}
                      {p.quantidade > 1 ? ` ×${p.quantidade}` : ''}
                    </span>
                    <span className="text-sm font-semibold text-gray-900">{formatCurrency(total)}</span>
                  </div>
                )
              })}
            </div>
          )}

          {/* Totais */}
          <div className="border-t border-gray-100 pt-3 flex flex-col gap-1">
            {snap?.totalMaoDeObra > 0 && (
              <div className="flex justify-between text-sm text-gray-500">
                <span>Serviços</span><span>{formatCurrency(snap.totalMaoDeObra)}</span>
              </div>
            )}
            {snap?.totalPecas > 0 && (
              <div className="flex justify-between text-sm text-gray-500">
                <span>Peças (c/ acréscimo)</span><span>{formatCurrency(snap.totalPecas)}</span>
              </div>
            )}
            {snap?.rastreamento > 0 && (
              <div className="flex justify-between text-sm text-gray-500">
                <span>Rastreamento</span><span>{formatCurrency(snap.rastreamento)}</span>
              </div>
            )}
            <div className="flex justify-between text-base font-bold text-gray-900 pt-1">
              <span>Total</span>
              <span>{formatCurrency(snap?.totalGeral ?? 0)}</span>
            </div>
          </div>
        </div>

        {/* Formulário de assinatura */}
        <form onSubmit={handleAssinar} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <h2 className="font-bold text-gray-900 mb-1">Assinar orçamento</h2>
          <p className="text-sm text-gray-400 mb-5">Confirme seus dados para registrar a aprovação.</p>

          <div className="flex flex-col gap-4">
            {/* Nome */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nome completo *</label>
              <input
                type="text"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                placeholder="Seu nome completo"
                className={`w-full border rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-brand-yellow transition-all ${nomeErr ? 'border-red-400' : 'border-gray-200 focus:border-brand-yellow'}`}
                autoComplete="name"
              />
              {nomeErr && <p className="text-xs text-red-500 mt-1">{nomeErr}</p>}
            </div>

            {/* Últimos 4 dígitos do celular */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Últimos 4 dígitos do celular *
                <span className="font-normal text-gray-400 ml-1">(confirmação de identidade)</span>
              </label>
              <input
                type="tel"
                inputMode="numeric"
                maxLength={4}
                value={telefone}
                onChange={(e) => setTelefone(e.target.value.replace(/\D/g, '').slice(0, 4))}
                placeholder="Ex: 3830"
                className={`w-full border rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-brand-yellow transition-all ${telErr ? 'border-red-400' : 'border-gray-200 focus:border-brand-yellow'}`}
              />
              {telErr && <p className="text-xs text-red-500 mt-1">{telErr}</p>}
            </div>

            {/* Aceite */}
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={aceito}
                onChange={(e) => setAceito(e.target.checked)}
                className="mt-0.5 w-4 h-4 accent-brand-yellow cursor-pointer"
              />
              <span className="text-sm text-gray-600 leading-relaxed">
                Li e estou de acordo com os serviços e valores descritos neste orçamento, e autorizo a execução dos trabalhos.
              </span>
            </label>

            {/* Aviso de segurança */}
            <div className="flex items-start gap-2 bg-gray-50 rounded-xl px-4 py-3">
              <Shield size={14} className="text-gray-400 mt-0.5 shrink-0" />
              <p className="text-xs text-gray-400 leading-relaxed">
                Sua assinatura será registrada com data, hora e IP mascarado (apenas os dois primeiros grupos são armazenados). Nenhuma informação sensível é guardada.
              </p>
            </div>

            <button
              type="submit"
              disabled={saving || !aceito}
              className={`w-full py-3.5 rounded-xl font-bold text-sm transition-all ${
                aceito && !saving
                  ? 'bg-brand-yellow text-brand-black hover:bg-yellow-400 active:scale-95'
                  : 'bg-gray-100 text-gray-400 cursor-not-allowed'
              }`}
            >
              {saving ? 'Registrando assinatura...' : 'Assinar e aprovar orçamento'}
            </button>
          </div>
        </form>

        <p className="text-center text-xs text-gray-400 mt-4">
          Este link é único e expira em 7 dias após o envio.
        </p>
      </div>
    </div>
  )
}

// ── Tela genérica de estado ───────────────────────────────────────────────────
function Tela({ icon, titulo, msg }) {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 max-w-sm w-full text-center">
        <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-5">
          {icon}
        </div>
        <h1 className="text-xl font-bold text-gray-900 mb-2">{titulo}</h1>
        <p className="text-sm text-gray-500 leading-relaxed">{msg}</p>
      </div>
    </div>
  )
}
