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

export const statusLabel = (status) => ({
  pendente: 'Pendente',
  faturado: 'Faturado',
  cancelado: 'Cancelado',
}[status] ?? status)

export const statusClass = (status) => ({
  pendente: 'badge-pending',
  faturado: 'badge-invoiced',
  cancelado: 'badge-cancelled',
}[status] ?? 'badge-pending')

export const calcTotals = (itens = {}, extras = {}) => {
  const totalMaoDeObra = (itens.servicos ?? []).reduce((s, i) => s + (Number(i.valor) * Number(i.quantidade || 1)), 0)

  const totalPecasSemMarkup = (itens.pecas ?? []).reduce((s, i) => s + (Number(i.valor) * Number(i.quantidade || 1)), 0)
  const markup = Number(extras.markup ?? 20) / 100
  const totalMarkup = totalPecasSemMarkup * markup
  const totalPecas = totalPecasSemMarkup + totalMarkup

  const rastreamento = Number(extras.rastreamento ?? 0)

  const totalGeral = totalMaoDeObra + totalPecas + rastreamento

  return {
    totalMaoDeObra,
    totalPecasSemMarkup,
    totalMarkup,
    totalPecas,
    rastreamento,
    totalGeral,
  }
}
