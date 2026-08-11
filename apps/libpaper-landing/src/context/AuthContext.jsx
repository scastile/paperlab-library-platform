import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { pb } from '../lib/pocketbase'

const AuthContext = createContext({})

// Shape the PocketBase auth store into a session-like object so existing
// consumers (Header, CreditBadge, LandingPage, auth-bridge) keep working.
function sessionFromPb() {
  const token = pb.authStore.token || null
  return {
    access_token: token,
    refresh_token: token, // PocketBase auto-refreshes internally; mirror the token
    expires_at: null,
  }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let mounted = true

    // 0. If coming back from signOut, force clean state — don't restore cached session
    const justSignedOut = new URLSearchParams(window.location.search).get('signed_out') === '1'
    if (justSignedOut) {
      pb.authStore.clear()
      if (mounted) {
        setSession(null)
        setUser(null)
        setLoading(false)
      }
      // Clean up the param so it doesn't stick
      const cleaner = new URL(window.location.href)
      cleaner.searchParams.delete('signed_out')
      history.replaceState({}, '', cleaner.toString())
      return
    }

    // 1. Restore an existing PocketBase session (authStore is localStorage-backed)
    if (pb.authStore.isValid) {
      setUser(pb.authStore.model)
      setSession(sessionFromPb())
    }
    setLoading(false)

    // 2. Subscribe to auth state changes
    const unsub = pb.authStore.onChange((token, model) => {
      if (!mounted) return
      setUser(model)
      setSession(sessionFromPb())
      setLoading(false)
    })

    return () => {
      mounted = false
      unsub?.()
    }
  }, [])

  const signIn = async (email, password) => {
    const authData = await pb.collection('users').authWithPassword(email, password)
    return { user: authData.record, session: sessionFromPb() }
  }

  const signUp = async (email, password) => {
    await pb.collection('users').create({
      email,
      password,
      passwordConfirm: password,
    })
    return signIn(email, password)
  }

  const signOut = async () => {
    pb.authStore.clear()
    setUser(null)
    setSession(null)
    window.location.href = 'https://lib.paperlab.xyz/?signed_out=1'
  }

  const getToken = useCallback(() => pb.authStore.token || null, [])

  return (
    <AuthContext.Provider value={{ user, session, loading, signIn, signUp, signOut, getToken }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
