import {
  collection,
  doc,
  getDocs,
  getDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  serverTimestamp,
  runTransaction,
} from 'firebase/firestore'
import { db } from './config'

// ── Generic helpers ──────────────────────────────────────────────────────────

export const getAll = async (col) => {
  const snap = await getDocs(collection(db, col))
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }))
}

export const getById = async (col, id) => {
  const snap = await getDoc(doc(db, col, id))
  return snap.exists() ? { id: snap.id, ...snap.data() } : null
}

export const create = async (col, data) => {
  const ref = await addDoc(collection(db, col), {
    ...data,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  })
  return ref.id
}

export const update = async (col, id, data) => {
  await updateDoc(doc(db, col, id), { ...data, updatedAt: serverTimestamp() })
}

export const remove = async (col, id) => {
  await deleteDoc(doc(db, col, id))
}

// ── Clientes ─────────────────────────────────────────────────────────────────

export const getClientes = () => getAll('clientes')
export const createCliente = (data) => create('clientes', data)
export const updateCliente = (id, data) => update('clientes', id, data)
export const deleteCliente = (id) => remove('clientes', id)

// ── Carros ───────────────────────────────────────────────────────────────────

export const getCarros = () => getAll('carros')
export const createCarro = (data) => create('carros', data)
export const updateCarro = (id, data) => update('carros', id, data)
export const deleteCarro = (id) => remove('carros', id)

// ── Serviços ─────────────────────────────────────────────────────────────────

export const getServicos = () => getAll('servicos')
export const createServico = (data) => create('servicos', data)
export const updateServico = (id, data) => update('servicos', id, data)
export const deleteServico = (id) => remove('servicos', id)

// ── Peças ─────────────────────────────────────────────────────────────────────

export const getPecas = () => getAll('pecas')
export const createPeca = (data) => create('pecas', data)
export const updatePeca = (id, data) => update('pecas', id, data)
export const deletePeca = (id) => remove('pecas', id)

// ── Orçamentos ────────────────────────────────────────────────────────────────

export const getOrcamentos = async () => {
  const q = query(collection(db, 'orcamentos'), orderBy('createdAt', 'desc'))
  const snap = await getDocs(q)
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }))
}

export const getOrcamentoById = (id) => getById('orcamentos', id)

export const getNextOrcamentoNumber = async () => {
  const snap = await getDocs(collection(db, 'orcamentos'))
  if (snap.empty) return 1
  const nums = snap.docs.map((d) => d.data().numero || 0)
  return Math.max(...nums) + 1
}

export const createOrcamento = async (data) => {
  const numero = await getNextOrcamentoNumber()
  return create('orcamentos', { ...data, numero, status: 'pendente' })
}

export const updateOrcamento = (id, data) => update('orcamentos', id, data)
export const deleteOrcamento = (id) => remove('orcamentos', id)

export const faturarOrcamento = (id) =>
  update('orcamentos', id, { status: 'faturado', faturadoEm: serverTimestamp() })

export const cancelarOrcamento = (id) =>
  update('orcamentos', id, { status: 'cancelado', canceladoEm: serverTimestamp() })

// ── Usuários (perfil/role) ────────────────────────────────────────────────────

export const getUserProfile = (uid) => getById('usuarios', uid)

export const createUserProfile = (uid, data) =>
  updateDoc(doc(db, 'usuarios', uid), data).catch(() =>
    addDoc(collection(db, 'usuarios'), { uid, ...data })
  )

export const setUserRole = async (uid, role) => {
  const ref = doc(db, 'usuarios', uid)
  await updateDoc(ref, { role }).catch(async () => {
    const { setDoc } = await import('firebase/firestore')
    await setDoc(ref, { uid, role, createdAt: serverTimestamp() })
  })
}
