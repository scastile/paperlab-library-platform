import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { pb } from '../lib/pocketbase'

const AuthContext = createContext(null)

// SSO: adopt a session token passed via URL hash from lib.paperlab.xyz.
// Log in once at the landing page, then jump between tools without re-logging in.
async function importTokenFromHash() {
  const hash = window.location.hash.substring(1)
  const params = new URLSearchParams(hash)
  const token = params.get('access_token')
  if (!token) return
  // Already signed in on this product — just clear the stray hash.
  if (pb.authStore.isValid) {
    history.replaceState(null, '', window.location.pathname + window.location.search)
    return
  }
  try {
    pb.authStore.save(token, null)
    await pb.collection('users').authRefresh()
  } catch {
    pb.authStore.clear()
  }
  history.replaceState(null, '', window.location.pathname + window.location.search)
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    const init = async () => {
      await importTokenFromHash()
      if (cancelled) return
      if (pb.authStore.isValid) {
        setUser(pb.authStore.model)
      }
      setLoading(false)
    }
    init()
    const unsub = pb.authStore.onChange((token, model) => {
      if (!cancelled) setUser(model)
    })
    return () => {
      cancelled = true
      unsub?.()
    }
  }, [])

  const signIn = async (email, password) => {
    const authData = await pb.collection('users').authWithPassword(email, password)
    setUser(authData.record)
    return authData
  }

  const signUp = async (email, password) => {
    await pb.collection('users').create({
      email,
      password,
      passwordConfirm: password,
    })
    // Auto-login after signup
    return signIn(email, password)
  }

  const signOut = () => {
    pb.authStore.clear()
    setUser(null)
  }

  const loginWithGoogle = async () => {
    // TODO: Set up Google OAuth in PocketBase settings
    throw new Error('Google OAuth not yet configured in PocketBase. Please use email/password login.')
  }

  const getToken = useCallback(() => pb.authStore.token || null, [])

  const value = {
    user,
    loading,
    // Primary API used by App + Login components
    signIn,
    signUp,
    signOut,
    getToken,
    // Aliases kept for older components that used the login/signup/logout names
    login: signIn,
    signup: signUp,
    logout: signOut,
    loginWithGoogle,
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
