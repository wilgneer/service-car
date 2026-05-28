import {
  collection, doc, getDocs, getDoc, addDoc, setDoc,
  updateDoc, deleteDoc, query, orderBy, limit,
  startAfter, serverTimestamp,
} from 'firebase/firestore'
import { db } from './config'

// ── Timeout helper — evita loading infinito ───────────────────────────────────
const withTimeout = (promise, ms = 12000, msg = 'Firestore não respondeu. Verifique sua conexão.') =>
  Promise.race([
    promise,
    new Promise((_, reject) => setTimeout(() => reject(new Error(msg)), ms)),
  ])

// ── Diagnóstico de conectividade ─────────────────────────────────────────────
export const testarConectividade = async () => {
  const inicio = Date.now()
  try {
    const snap = await withTimeout(
      getDocs(query(collection(db, 'clientes'), limit(1))),
      8000,
      'Timeout ao conectar com Firestore',
    )
    console.info(`[Firestore] ✅ Conectado em ${Date.now() - inicio}ms. Docs lidos: ${snap.size}`)
    return { ok: true, ms: Date.now() - inicio }
  } catch (err) {
    console.error(`[Firestore] ❌ ERRO (${Date.now() - inicio}ms):`, err?.code ?? err?.message ?? err)
    console.error('[Firestore] Código do erro:', err?.code)
    return { ok: false, ms: Date.now() - inicio, error: err?.code ?? err?.message }
  }
}

// ── Generic helpers ──────────────────────────────────────────────────────────

export const getAll = async (col) => {
  const snap = await withTimeout(getDocs(collection(db, col)))
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }))
}

export const getById = async (col, id) => {
  const snap = await withTimeout(getDoc(doc(db, col, id)))
  return snap.exists() ? { id: snap.id, ...snap.data() } : null
}

export const create = async (col, data) => {
  const ref = await withTimeout(
    addDoc(collection(db, col), {
      ...data,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    })
  )
  return ref.id
}

export const update = async (col, id, data) => {
  await withTimeout(updateDoc(doc(db, col, id), { ...data, updatedAt: serverTimestamp() }))
}

export const remove = async (col, id) => {
  await withTimeout(deleteDoc(doc(db, col, id)))
}

// ── Clientes ─────────────────────────────────────────────────────────────────

export const getClientes  = () => getAll('clientes')
export const createCliente = (data) => create('clientes', data)
export const updateCliente = (id, data) => update('clientes', id, data)
export const deleteCliente = (id) => remove('clientes', id)

// ── Carros ───────────────────────────────────────────────────────────────────

export const getCarros  = () => getAll('carros')
export const createCarro = (data) => create('carros', data)
export const updateCarro = (id, data) => update('carros', id, data)
export const deleteCarro = (id) => remove('carros', id)

// ── Serviços ─────────────────────────────────────────────────────────────────

export const getServicos  = () => getAll('servicos')
export const createServico = (data) => create('servicos', data)
export const updateServico = (id, data) => update('servicos', id, data)
export const deleteServico = (id) => remove('servicos', id)

// ── Peças ────────────────────────────────────────────────────────────────────

export const getPecas  = () => getAll('pecas')
export const createPeca = (data) => create('pecas', data)
export const updatePeca = (id, data) => update('pecas', id, data)
export const deletePeca = (id) => remove('pecas', id)

// ── Orçamentos ────────────────────────────────────────────────────────────────

// Busca a primeira página de orçamentos (carregamento inicial)
export const getOrcamentos = async (pageSize = 50) => {
  const q = query(
    collection(db, 'orcamentos'),
    orderBy('createdAt', 'desc'),
    limit(pageSize),
  )
  const snap = await getDocs(q)
  return {
    items:   snap.docs.map((d) => ({ id: d.id, ...d.data() })),
    lastDoc: snap.docs[snap.docs.length - 1] ?? null,
    hasMore: snap.docs.length === pageSize,
  }
}

// Carrega mais orçamentos a partir de um cursor (paginação Firestore)
export const getOrcamentosPage = async (afterDoc, pageSize = 50) => {
  const q = afterDoc
    ? query(collection(db, 'orcamentos'), orderBy('createdAt', 'desc'), startAfter(afterDoc), limit(pageSize))
    : query(collection(db, 'orcamentos'), orderBy('createdAt', 'desc'), limit(pageSize))
  const snap = await getDocs(q)
  return {
    items:   snap.docs.map((d) => ({ id: d.id, ...d.data() })),
    lastDoc: snap.docs[snap.docs.length - 1] ?? null,
    hasMore: snap.docs.length === pageSize,
  }
}

export const getOrcamentoById = (id) => getById('orcamentos', id)

export const getNextOrcamentoNumber = async () => {
  // Busca só o último documento ordenado por numero DESC — muito mais rápido
  const q = query(
    collection(db, 'orcamentos'),
    orderBy('numero', 'desc'),
    limit(1),
  )
  const snap = await getDocs(q)
  if (snap.empty) return 1
  return (snap.docs[0].data().numero || 0) + 1
}

// Campos obrigatórios pelas Firestore Rules:
// clienteNome, veiculoModelo, veiculoPlaca, veiculoAno, total, status, createdBy
export const createOrcamento = async (data) => {
  // Fallback: se getNextOrcamentoNumber falhar usa timestamp como numero
  let numero = Date.now()
  try {
    numero = await getNextOrcamentoNumber()
  } catch (e) {
    console.warn('[createOrcamento] getNextOrcamentoNumber falhou, usando fallback:', e?.message)
  }
  return create('orcamentos', {
    ...data,
    numero,
    status: 'rascunho',
    total: data.totalGeral || 0,
  })
}

export const updateOrcamento = (id, data) =>
  update('orcamentos', id, {
    ...data,
    total: data.totalGeral || data.total || 0,
  })

export const atualizarStatus = (id, status, extraFields = {}) =>
  update('orcamentos', id, { status, ...extraFields })

// ── Materiais (saídas de estoque/compras) ─────────────────────────────────────

export const getMateriais    = () => getAll('materiais')
export const createMaterial  = (data) => create('materiais', data)
export const updateMaterial  = (id, data) => update('materiais', id, data)
export const deleteMaterial  = (id) => remove('materiais', id)

// ── Fornecedores ──────────────────────────────────────────────────────────────

export const getFornecedores  = () => getAll('fornecedores')
export const createFornecedor  = (data) => create('fornecedores', data)
export const updateFornecedor  = (id, data) => update('fornecedores', id, data)
export const deleteFornecedor  = (id) => remove('fornecedores', id)

// ── Configurações da empresa ──────────────────────────────────────────────────

const CONFIG_DOC = 'empresa'

export const getConfiguracoes = async () => {
  const snap = await withTimeout(getDoc(doc(db, 'configuracoes', CONFIG_DOC)))
  return snap.exists() ? snap.data() : null
}

export const saveConfiguracoes = async (data) => {
  await withTimeout(
    setDoc(doc(db, 'configuracoes', CONFIG_DOC), {
      ...data,
      updatedAt: serverTimestamp(),
    }, { merge: true })
  )
}

// ── Usuários ──────────────────────────────────────────────────────────────────

export const getUserProfile = (uid) => getById('usuarios', uid)
