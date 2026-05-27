import React, { createContext, useContext, useEffect, useState } from 'react'
import {
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  createUserWithEmailAndPassword,
} from 'firebase/auth'
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore'
import { auth, db } from '../firebase/config'

const AuthContext = createContext(null)

const DEMO_USER    = { uid: 'demo', email: 'demo@demo.com', displayName: 'Demo' }
const DEMO_PROFILE = { uid: 'demo', role: 'admin', email: 'demo@demo.com' }
const DEMO_KEY     = 'orcamento_demo_mode'

export function AuthProvider({ children }) {
  const [user, setUser]       = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [isDemo, setIsDemo]   = useState(false)

  const fetchProfile = async (uid) => {
    try {
      const ref  = doc(db, 'usuarios', uid)
      const snap = await getDoc(ref)
      if (snap.exists()) {
        setProfile(snap.data())
      } else {
        // Cria perfil padrão na primeira vez
        const defaultProfile = { uid, role: 'user', createdAt: serverTimestamp() }
        await setDoc(ref, defaultProfile)
        setProfile(defaultProfile)
      }
    } catch {
      // Fallback silencioso — usuário autenticado mas sem perfil no Firestore
      setProfile({ uid, role: 'user' })
    }
  }

  useEffect(() => {
    if (localStorage.getItem(DEMO_KEY) === 'true') {
      setUser(DEMO_USER)
      setProfile(DEMO_PROFILE)
      setIsDemo(true)
      setLoading(false)
      return
    }
    const unsub = onAuthStateChanged(auth, (firebaseUser) => {
      if (firebaseUser) {
        setUser(firebaseUser)
        setLoading(false)          // ← libera a app IMEDIATAMENTE
        fetchProfile(firebaseUser.uid) // ← perfil carrega em background (sem await)
      } else {
        setUser(null)
        setProfile(null)
        setLoading(false)
      }
    })
    return unsub
  }, [])

  const login = (email, password) => signInWithEmailAndPassword(auth, email, password)

  const loginDemo = () => {
    localStorage.setItem(DEMO_KEY, 'true')
    setUser(DEMO_USER)
    setProfile(DEMO_PROFILE)
    setIsDemo(true)
  }

  const register = async (email, password, role = 'user') => {
    const cred = await createUserWithEmailAndPassword(auth, email, password)
    await setDoc(doc(db, 'usuarios', cred.user.uid), {
      uid: cred.user.uid, email, role, createdAt: serverTimestamp(),
    })
    return cred
  }

  const logout = async () => {
    if (isDemo) {
      localStorage.removeItem(DEMO_KEY)
      setUser(null); setProfile(null); setIsDemo(false)
      return
    }
    await signOut(auth)
  }

  const isAdmin = profile?.role === 'admin'

  return (
    <AuthContext.Provider value={{ user, profile, loading, login, loginDemo, register, logout, isAdmin, isDemo }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
