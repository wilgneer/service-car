import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react'
import * as svc from '../firebase/services'
import { testarConectividade } from '../firebase/services'
import { useAuth } from './AuthContext'

const AppContext = createContext(null)

// ── Dados demo ────────────────────────────────────────────────────────────────
const DEMO_DATA = {
  clientes: [
    { id: 'c1', nome: 'João Silva',     celular: '(11) 99999-1111' },
    { id: 'c2', nome: 'Maria Oliveira', celular: '(11) 98888-2222' },
    { id: 'c3', nome: 'Carlos Souza',   celular: '(11) 97777-3333' },
  ],
  carros: [
    { id: 'v1', nome: 'Civic',   marca: 'Honda',     cor: 'Preto',  ano: '2021', placa: 'ABC-1234', clienteId: 'c1' },
    { id: 'v2', nome: 'Corolla', marca: 'Toyota',    cor: 'Branco', ano: '2020', placa: 'DEF-5678', clienteId: 'c2' },
    { id: 'v3', nome: 'Onix',    marca: 'Chevrolet', cor: 'Prata',  ano: '2022', placa: 'GHI-9012', clienteId: 'c3' },
  ],
  servicos: [
    { id: 's1', tipoServico: 'Troca de Óleo',  descricao: 'Troca de óleo e filtro',       valor: 150 },
    { id: 's2', tipoServico: 'Alinhamento',    descricao: 'Alinhamento e balanceamento',   valor: 120 },
    { id: 's3', tipoServico: 'Revisão Geral',  descricao: 'Revisão completa do veículo',   valor: 350 },
  ],
  pecas: [
    { id: 'p1', tipoPeca: 'Filtro de Óleo',    valor: 45  },
    { id: 'p2', tipoPeca: 'Pastilha de Freio', valor: 180 },
    { id: 'p3', tipoPeca: 'Correia Dentada',   valor: 280 },
  ],
  orcamentos: [
    {
      id: 'o1', numero: 1, clienteId: 'c1', carroId: 'v1', status: 'aprovado',
      clienteNome: 'João Silva', veiculoModelo: 'Civic', veiculoPlaca: 'ABC-1234', veiculoAno: '2021', createdBy: 'demo',
      extras: { markup: 20, rastreamento: 0 },
      itens: { servicos: [{ descricao: 'Troca de Óleo', valor: 150, quantidade: 1 }], pecas: [{ marca: 'Bosch', descricao: 'Filtro de Óleo', valor: 45, quantidade: 1 }] },
      totalMaoDeObra: 150, totalPecasSemMarkup: 45, totalMarkup: 9, totalPecas: 54, rastreamento: 0, totalGeral: 204, total: 204,
      createdAt: { toDate: () => new Date('2026-04-10') },
      aprovadoEm: { toDate: () => new Date('2026-04-10') },
    },
    {
      id: 'o2', numero: 2, clienteId: 'c2', carroId: 'v2', status: 'rascunho',
      clienteNome: 'Maria Oliveira', veiculoModelo: 'Corolla', veiculoPlaca: 'DEF-5678', veiculoAno: '2020', createdBy: 'demo',
      extras: { markup: 20, rastreamento: 180 },
      itens: { servicos: [{ descricao: 'Alinhamento', valor: 120, quantidade: 1 }], pecas: [] },
      totalMaoDeObra: 120, totalPecasSemMarkup: 0, totalMarkup: 0, totalPecas: 0, rastreamento: 180, totalGeral: 300, total: 300,
      createdAt: { toDate: () => new Date('2026-04-20') },
    },
    {
      id: 'o3', numero: 3, clienteId: 'c3', carroId: 'v3', status: 'reprovado',
      clienteNome: 'Carlos Souza', veiculoModelo: 'Onix', veiculoPlaca: 'GHI-9012', veiculoAno: '2022', createdBy: 'demo',
      extras: { markup: 20, rastreamento: 0 },
      itens: { servicos: [{ descricao: 'Revisão Geral', valor: 350, quantidade: 1 }], pecas: [{ marca: 'Gates', descricao: 'Correia Dentada', valor: 280, quantidade: 1 }] },
      totalMaoDeObra: 350, totalPecasSemMarkup: 280, totalMarkup: 56, totalPecas: 336, rastreamento: 0, totalGeral: 686, total: 686,
      createdAt: { toDate: () => new Date('2026-04-15') },
    },
    {
      id: 'o4', numero: 4, clienteId: 'c1', carroId: 'v1', status: 'em_analise',
      clienteNome: 'João Silva', veiculoModelo: 'Civic', veiculoPlaca: 'ABC-1234', veiculoAno: '2021', createdBy: 'demo',
      extras: { markup: 20, rastreamento: 0 },
      itens: { servicos: [{ descricao: 'Mão de Obra - Freios', valor: 180, quantidade: 1 }], pecas: [{ marca: 'TRW', descricao: 'Pastilha de Freio', valor: 180, quantidade: 2 }] },
      totalMaoDeObra: 180, totalPecasSemMarkup: 360, totalMarkup: 72, totalPecas: 432, rastreamento: 0, totalGeral: 612, total: 612,
      createdAt: { toDate: () => new Date('2026-04-25') },
    },
  ],
}

export function AppProvider({ children }) {
  const { isDemo } = useAuth()
  const [clientes,   setClientes]   = useState([])
  const [carros,     setCarros]     = useState([])
  const [servicos,   setServicos]   = useState([])
  const [pecas,      setPecas]      = useState([])
  const [orcamentos, setOrcamentos] = useState([])
  const [orcamentosLastDoc, setOrcamentosLastDoc] = useState(null)
  const [orcamentosHasMore, setOrcamentosHasMore] = useState(false)
  const [loadingData,     setLoadingData]     = useState(true)
  const [loadingMore,     setLoadingMore]     = useState(false)
  const loaded = useRef(false)

  // Carregamento inicial — só uma vez
  const load = useCallback(async () => {
    if (isDemo) {
      setClientes(DEMO_DATA.clientes)
      setCarros(DEMO_DATA.carros)
      setServicos(DEMO_DATA.servicos)
      setPecas(DEMO_DATA.pecas)
      setOrcamentos(DEMO_DATA.orcamentos)
      setOrcamentosHasMore(false)
      setLoadingData(false)
      return
    }
    setLoadingData(true)
    // Diagnóstico: testa conectividade antes de carregar tudo
    const diag = await testarConectividade()
    if (!diag.ok) {
      console.error('[AppContext] Firestore inacessível. Verifique as Security Rules e a conexão.')
    }
    try {
      const [c, ca, s, p, oResult] = await Promise.all([
        svc.getClientes(),
        svc.getCarros(),
        svc.getServicos(),
        svc.getPecas(),
        svc.getOrcamentos(50),
      ])
      setClientes(c); setCarros(ca); setServicos(s); setPecas(p)
      setOrcamentos(oResult.items)
      setOrcamentosLastDoc(oResult.lastDoc)
      setOrcamentosHasMore(oResult.hasMore)
    } catch (err) {
      console.error('[AppContext] Falha ao carregar dados do Firestore:', err?.message ?? err)
    } finally {
      setLoadingData(false)
      loaded.current = true
    }
  }, [isDemo])

  // Carrega próxima página de orçamentos (botão "Carregar mais")
  const loadMoreOrcamentos = useCallback(async () => {
    if (!orcamentosHasMore || loadingMore || isDemo) return
    setLoadingMore(true)
    try {
      const result = await svc.getOrcamentosPage(orcamentosLastDoc, 50)
      setOrcamentos((prev) => {
        // Evita duplicatas por id
        const ids = new Set(prev.map((o) => o.id))
        const novos = result.items.filter((o) => !ids.has(o.id))
        return [...prev, ...novos]
      })
      setOrcamentosLastDoc(result.lastDoc)
      setOrcamentosHasMore(result.hasMore)
    } finally {
      setLoadingMore(false)
    }
  }, [orcamentosHasMore, orcamentosLastDoc, loadingMore, isDemo])

  // Refresh completo (auto-refresh de 10min)
  const refresh = useCallback(async () => {
    if (isDemo) return
    try {
      const [c, ca, s, p, oResult] = await Promise.all([
        svc.getClientes(), svc.getCarros(), svc.getServicos(),
        svc.getPecas(), svc.getOrcamentos(50),
      ])
      setClientes(c); setCarros(ca); setServicos(s); setPecas(p)
      setOrcamentos(oResult.items)
      setOrcamentosLastDoc(oResult.lastDoc)
      setOrcamentosHasMore(oResult.hasMore)
    } catch { /* silencioso */ }
  }, [isDemo])

  useEffect(() => { load() }, [load])

  // ── Helpers de atualização local (sem re-fetch) ─────────────────────────────

  // Clientes
  const addCliente    = (item)     => setClientes((p) => [item, ...p])
  const editCliente   = (id, data) => setClientes((p) => p.map((c) => c.id === id ? { ...c, ...data } : c))
  const dropCliente   = (id)       => setClientes((p) => p.filter((c) => c.id !== id))

  // Carros
  const addCarro      = (item)     => setCarros((p) => [item, ...p])
  const editCarro     = (id, data) => setCarros((p) => p.map((c) => c.id === id ? { ...c, ...data } : c))
  const dropCarro     = (id)       => setCarros((p) => p.filter((c) => c.id !== id))

  // Serviços
  const addServico    = (item)     => setServicos((p) => [item, ...p])
  const editServico   = (id, data) => setServicos((p) => p.map((s) => s.id === id ? { ...s, ...data } : s))
  const dropServico   = (id)       => setServicos((p) => p.filter((s) => s.id !== id))

  // Peças
  const addPeca       = (item)     => setPecas((p) => [item, ...p])
  const editPeca      = (id, data) => setPecas((p) => p.map((x) => x.id === id ? { ...x, ...data } : x))
  const dropPeca      = (id)       => setPecas((p) => p.filter((x) => x.id !== id))

  // Orçamentos
  const addOrcamento    = (item)     => setOrcamentos((p) => [item, ...p])
  const editOrcamento   = (id, data) => setOrcamentos((p) => p.map((o) => o.id === id ? { ...o, ...data } : o))
  const dropOrcamento   = (id)       => setOrcamentos((p) => p.filter((o) => o.id !== id))

  return (
    <AppContext.Provider value={{
      clientes, carros, servicos, pecas, orcamentos, loadingData,
      orcamentosHasMore, loadingMore, loadMoreOrcamentos,
      refresh,
      addCliente,  editCliente,  dropCliente,
      addCarro,    editCarro,    dropCarro,
      addServico,  editServico,  dropServico,
      addPeca,     editPeca,     dropPeca,
      addOrcamento, editOrcamento, dropOrcamento,
    }}>
      {children}
    </AppContext.Provider>
  )
}

export const useApp = () => useContext(AppContext)
