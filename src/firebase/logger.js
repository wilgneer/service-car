import {
  collection, addDoc, getDocs,
  query, orderBy, limit, serverTimestamp,
} from 'firebase/firestore'
import { db } from './config'

// ── Escrita (fire-and-forget — nunca bloqueia a UI) ─────────────────────────

const write = (type, data) => {
  addDoc(collection(db, 'logs'), {
    type,
    action:    data.action    ?? '',
    message:   data.message   ?? '',
    details:   data.details   ?? {},
    userId:    data.userId    ?? 'anon',
    userEmail: data.userEmail ?? '',
    createdAt: serverTimestamp(),
  }).catch(() => {}) // silencioso — log nunca deve quebrar o app
}

export const logActivity = (data) => write('activity', data)
export const logError    = (data) => write('error',    data)

// ── Leitura ─────────────────────────────────────────────────────────────────

export const getLogs = async (limitCount = 300) => {
  try {
    const q = query(
      collection(db, 'logs'),
      orderBy('createdAt', 'desc'),
      limit(limitCount),
    )
    const snap = await getDocs(q)
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }))
  } catch {
    return []
  }
}
