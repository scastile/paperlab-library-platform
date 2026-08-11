import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { pb } from '../lib/pocketbase'
import { readSharedToken, writeSharedToken, clearSharedToken } from '../lib/sso'

const AuthContext = createContext(null)

// SSO: adopt the session token from the shared .paperlab.xyz cookie.
// Falls back to a legacy #access_token= hash from pre-cookie links.
async function adoptSession() {
  let token = readSharedToken()
  if (!token) {
    const hashToken = new URLSearchParams(window.location.hash.substring(1)).get('access_token')
    token = hashToken || null
  }
  if (!token) return
  if (pb.authStore.isValid && pb.authStore.token === token) return
  try {
    pb.authStore.save(token, null)
    await pb.collection('users').authRefresh() // validate + get a fresh token
    writeSharedToken(pb.authStore.token)
  } catch {
    pb.authStore.clear()
    clearSharedToken()
  }
  if (window.location.hash) {
    history.replaceState(null, '', window.location.pathname + window.location.search)
  }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false

    const init = async () => {
      await adoptSession()
      if (cancelled) return
      if (pb.authStore.isValid) setUser(pb.authStore.model)
      setLoading(false)
    }
    init()

    // Sync the shared cookie whenever the local auth store changes (login/logout)
    const unsub = pb.authStore.onChange((token, model) => {
      if (cancelled) return
      setUser(model)
      if (token) writeSharedToken(token)
      else clearSharedToken()
    })

    // Keep the session alive + the shared cookie fresh while any tool is open
    const timer = setInterval(async () => {
      if (!pb.authStore.isValid) return
      try {
        await pb.collection('users').authRefresh()
        writeSharedToken(pb.authStore.token)
      } catch {
        pb.authStore.clear()
        clearSharedToken()
      }
    }, 30 * 60 * 1000)

    return () => {
      cancelled = true
      unsub?.()
      clearInterval(timer)
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
    clearSharedToken()
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
    signIn,
    signUp,
    signOut,
    getToken,
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
