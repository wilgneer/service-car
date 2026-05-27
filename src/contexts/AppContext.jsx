import React, { createContext, useContext, useEffect, useState, useCallback } from 'react'
import * as svc from '../firebase/services'
import { useAuth } from './AuthContext'

const AppContext = createContext(null)

// Dados de demonstração
const DEMO_DATA = {
  clientes: [
    { id: 'c1', nome: 'João Silva', celular: '(11) 99999-1111' },
    { id: 'c2', nome: 'Maria Oliveira', celular: '(11) 98888-2222' },
    { id: 'c3', nome: 'Carlos Souza', celular: '(11) 97777-3333' },
  ],
  carros: [
    { id: 'v1', nome: 'Civic', marca: 'Honda', cor: 'Preto', ano: '2021', placa: 'ABC-1234', clienteId: 'c1' },
    { id: 'v2', nome: 'Corolla', marca: 'Toyota', cor: 'Branco', ano: '2020', placa: 'DEF-5678', clienteId: 'c2' },
    { id: 'v3', nome: 'Onix', marca: 'Chevrolet', cor: 'Prata', ano: '2022', placa: 'GHI-9012', clienteId: 'c3' },
  ],
  servicos: [
    { id: 's1', tipoServico: 'Troca de Óleo', descricao: 'Troca de óleo e filtro', valor: 150 },
    { id: 's2', tipoServico: 'Alinhamento', descricao: 'Alinhamento e balanceamento', valor: 120 },
    { id: 's3', tipoServico: 'Revisão Geral', descricao: 'Revisão completa do veículo', valor: 350 },
  ],
  pecas: [
    { id: 'p1', tipoPeca: 'Filtro de Óleo', valor: 45 },
    { id: 'p2', tipoPeca: 'Pastilha de Freio', valor: 180 },
    { id: 'p3', tipoPeca: 'Correia Dentada', valor: 280 },
  ],
  orcamentos: [
    {
      id: 'o1', numero: 1, clienteId: 'c1', carroId: 'v1', status: 'faturado',
      itens: { servicos: [{ descricao: 'Troca de Óleo', valor: 150, quantidade: 1 }], pecas: [{ descricao: 'Filtro de Óleo', valor: 45, quantidade: 1 }] },
      totalServicos: 150, totalPecas: 45, totalGeral: 195,
      createdAt: { toDate: () => new Date('2026-04-10') },
      faturadoEm: { toDate: () => new Date('2026-04-10') },
    },
    {
      id: 'o2', numero: 2, clienteId: 'c2', carroId: 'v2', status: 'pendente',
      itens: { servicos: [{ descricao: 'Alinhamento', valor: 120, quantidade: 1 }, { descricao: 'Revisão Geral', valor: 350, quantidade: 1 }], pecas: [] },
      totalServicos: 470, totalPecas: 0, totalGeral: 470,
      createdAt: { toDate: () => new Date('2026-04-20') },
    },
    {
      id: 'o3', numero: 3, clienteId: 'c3', carroId: 'v3', status: 'cancelado',
      itens: { servicos: [{ descricao: 'Revisão Geral', valor: 350, quantidade: 1 }], pecas: [{ descricao: 'Correia Dentada', valor: 280, quantidade: 1 }] },
      totalServicos: 350, totalPecas: 280, totalGeral: 630,
      createdAt: { toDate: () => new Date('2026-04-15') },
      canceladoEm: { toDate: () => new Date('2026-04-16') },
    },
    {
      id: 'o4', numero: 4, clienteId: 'c1', carroId: 'v1', status: 'pendente',
      itens: { servicos: [{ descricao: 'Troca de Pastilha', valor: 180, quantidade: 1 }], pecas: [{ descricao: 'Pastilha de Freio', valor: 180, quantidade: 2 }] },
      totalServicos: 180, totalPecas: 360, totalGeral: 540,
      createdAt: { toDate: () => new Date('2026-04-25') },
    },
  ],
}

export function AppProvider({ children }) {
  const { isDemo } = useAuth()
  const [clientes, setClientes] = useState([])
  const [carros, setCarros] = useState([])
  const [servicos, setServicos] = useState([])
  const [pecas, setPecas] = useState([])
  const [orcamentos, setOrcamentos] = useState([])
  const [loadingData, setLoadingData] = useState(true)

  const refresh = useCallback(async () => {
    setLoadingData(true)
    try {
      if (isDemo) {
        setClientes(DEMO_DATA.clientes)
        setCarros(DEMO_DATA.carros)
        setServicos(DEMO_DATA.servicos)
        setPecas(DEMO_DATA.pecas)
        setOrcamentos(DEMO_DATA.orcamentos)
        return
      }
      const [c, ca, s, p, o] = await Promise.all([
        svc.getClientes(),
        svc.getCarros(),
        svc.getServicos(),
        svc.getPecas(),
        svc.getOrcamentos(),
      ])
      setClientes(c)
      setCarros(ca)
      setServicos(s)
      setPecas(p)
      setOrcamentos(o)
    } finally {
      setLoadingData(false)
    }
  }, [isDemo])

  useEffect(() => { refresh() }, [refresh])

  return (
    <AppContext.Provider value={{
      clientes, setClientes,
      carros, setCarros,
      servicos, setServicos,
      pecas, setPecas,
      orcamentos, setOrcamentos,
      loadingData,
      refresh,
    }}>
      {children}
    </AppContext.Provider>
  )
}

export const useApp = () => useContext(AppContext)
