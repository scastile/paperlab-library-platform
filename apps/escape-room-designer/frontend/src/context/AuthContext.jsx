import { createContext, useContext, useState, useEffect } from 'react'
import { pb } from '../lib/pocketbase'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Check if already authenticated
    if (pb.authStore.isValid) {
      setUser(pb.authStore.model)
    }
    setLoading(false)

    // Listen for auth changes
    const unsub = pb.authStore.onChange((token, model) => {
      setUser(model)
    })

    return () => unsub?.()
  }, [])

  const login = async (email, password) => {
    const authData = await pb.collection('users').authWithPassword(email, password)
    setUser(authData.record)
    return authData
  }

  const signup = async (email, password) => {
    const record = await pb.collection('users').create({
      email,
      password,
      passwordConfirm: password,
    })
    // Auto-login after signup
    return login(email, password)
  }

  const loginWithGoogle = async () => {
    // TODO: Set up Google OAuth in PocketBase settings
    // For now, redirect to a message
    throw new Error('Google OAuth not yet configured in PocketBase. Please use email/password login.')
  }

  const logout = () => {
    pb.authStore.clear()
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, signup, loginWithGoogle, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
