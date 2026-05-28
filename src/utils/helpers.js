export const formatCurrency = (value) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value ?? 0)

export const formatDate = (ts) => {
  if (!ts) return '-'
  const date = ts?.toDate ? ts.toDate() : new Date(ts)
  return new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(date)
}

export const formatDatetime = (ts) => {
  if (!ts) return '-'
  const date = ts?.toDate ? ts.toDate() : new Date(ts)
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  }).format(date)
}

export const STATUS = {
  rascunho:   { label: 'Pend. Aprovação', badge: 'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-700' },
  em_analise: { label: 'Em Análise',      badge: 'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800' },
  aprovado:   { label: 'Aprovado',        badge: 'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800' },
  reprovado:  { label: 'Reprovado',       badge: 'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800' },
  concluido:  { label: 'Concluído',       badge: 'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800' },
}

export const statusLabel = (status) => STATUS[status]?.label ?? status
export const statusClass  = (status) => STATUS[status]?.badge  ?? STATUS.rascunho.badge

// Formata uma string de data "YYYY-MM-DD" → "DD/MM/YYYY"
export const formatDateLocal = (dateStr) => {
  if (!dateStr) return '-'
  const [year, month, day] = dateStr.split('-')
  return `${day}/${month}/${year}`
}

// Formata CNPJ (string de dígitos → XX.XXX.XXX/XXXX-XX)
export const formatCnpj = (cnpj) => {
  const d = (cnpj ?? '').replace(/\D/g, '').padStart(14, '0')
  return `${d.slice(0,2)}.${d.slice(2,5)}.${d.slice(5,8)}/${d.slice(8,12)}-${d.slice(12,14)}`
}

// Formata CEP (string de dígitos → XXXXX-XXX)
export const formatCep = (cep) => {
  const d = (cep ?? '').replace(/\D/g, '').padStart(8, '0')
  return `${d.slice(0,5)}-${d.slice(5,8)}`
}

export const calcTotals = (itens = {}, extras = {}) => {
  const totalMaoDeObra = (itens.servicos ?? []).reduce(
    (s, i) => s + (Number(i.valor) * Number(i.quantidade || 1)), 0
  )
  const totalPecasSemMarkup = (itens.pecas ?? []).reduce(
    (s, i) => s + (Number(i.valor) * Number(i.quantidade || 1)), 0
  )
  const markup   = Number(extras.markup ?? 20) / 100
  const totalMarkup = totalPecasSemMarkup * markup
  const totalPecas  = totalPecasSemMarkup + totalMarkup
  const rastreamento = Number(extras.rastreamento ?? 0)
  const totalGeral   = totalMaoDeObra + totalPecas + rastreamento

  return { totalMaoDeObra, totalPecasSemMarkup, totalMarkup, totalPecas, rastreamento, totalGeral }
}
