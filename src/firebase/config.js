import { initializeApp } from 'firebase/app'
import { getAuth } from 'firebase/auth'
import { getFirestore } from 'firebase/firestore'

// Substitua com as credenciais do seu projeto Firebase
const firebaseConfig = {
  apiKey: "AIzaSyDNrje5Rcey1ch1YILJJfgBPLU-1eGkdzU",
  authDomain: "autocenterfloresta-94820.firebaseapp.com",
  projectId: "autocenterfloresta-94820",
  storageBucket: "autocenterfloresta-94820.firebasestorage.app",
  messagingSenderId: "459201768370",
  appId: "1:459201768370:web:6e11ae1cb5d28882ef52ab",
}

const app = initializeApp(firebaseConfig)
export const auth = getAuth(app)
export const db = getFirestore(app)
export default app
